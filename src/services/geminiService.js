import { GoogleGenAI } from '@google/genai';
import {
  getApiKey, getMarkets, getIngredients, getRestaurants,
  getRestaurantIngredients, addIngredient, addRestaurant,
  addIngredientToRestaurant, updateIngredient,
  fuzzyMatchIngredient
} from './storageService';

// Convert browser File/Blob to base64 for Gemini API
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Data = reader.result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Main entry point: processes raw order text/images and returns a structured shopping list.
 * Also handles auto-creation of restaurants & ingredients in Firestore.
 */
export async function processOrders(uid, textInput, imageFiles) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key belum diatur di menu Pengaturan.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Load all current data for context
  const [markets, ingredients, restaurants] = await Promise.all([
    getMarkets(uid),
    getIngredients(uid),
    getRestaurants(uid),
  ]);

  // Load restaurant ingredients for all restaurants
  const restaurantData = [];
  for (const rest of restaurants) {
    const restIngs = await getRestaurantIngredients(uid, rest.id);
    // Resolve ingredient names
    const resolvedIngs = restIngs.map(ri => {
      const ing = ingredients.find(i => i.id === ri.ingredientId);
      return {
        ...ri,
        canonicalName: ing?.canonicalName || '(unknown)',
        aliases: ing?.aliases || [],
      };
    });
    restaurantData.push({ ...rest, ingredients: resolvedIngs });
  }

  // Build context for the AI
  const marketContext = markets.map(m => {
    const marketIngs = ingredients.filter(i => i.marketId === m.id);
    const ingNames = marketIngs.map(i => {
      const allNames = [i.canonicalName, ...(i.aliases || [])];
      return allNames.join(' / ');
    });
    return `- ${m.name}: ${ingNames.length > 0 ? ingNames.join(', ') : 'Belum ada barang'}`;
  }).join('\n');

  const restaurantContext = restaurantData.map(r => {
    const ingNames = r.ingredients.map(ri => {
      const allNames = [ri.canonicalName, ...(ri.aliases || [])];
      return `${allNames.join(' / ')}${ri.isLocked ? ' [TERKUNCI]' : ''}`;
    });
    return `- ${r.name}${r.isLocked ? ' [RESTORAN TERKUNCI]' : ''}: ${ingNames.length > 0 ? ingNames.join(', ') : 'Belum ada data'}`;
  }).join('\n');

  const systemPrompt = `Kamu adalah asisten pengatur belanja untuk restoran.
Tugasmu adalah membaca teks atau gambar pesanan (notes/invoice) dan mengelompokkannya menjadi daftar belanja terstruktur dalam format JSON.

ATURAN PENGELOMPOKAN:
1. Gabungkan barang yang sama dari berbagai restoran.
2. Gunakan NAMA STANDAR barang jika sudah ada di database, bukan nama dari pesanan.
3. Setiap barang harus diletakkan di pasar yang sesuai berdasarkan database berikut:
${marketContext}

Jika barang tidak ditemukan di daftar pasar mana pun, masukkan ke pasar "Lain-lain".

4. Data restoran yang sudah ada:
${restaurantContext}

5. PENTING: Jika nama barang berbeda tapi merupakan barang yang sama (misal: "cengek ijo" = "cabe rawit ijo", "telor" = "telur"), gunakan nama standar yang sudah ada di database.

FORMAT OUTPUT HARUS JSON SEPERTI INI (tanpa markdown backticks):
{
  "hasil": [
    {
      "pasar": "Nama Pasar",
      "barang": [
        {
          "namaBarang": "Nama Standar Barang",
          "namaAsli": "Nama dari pesanan (jika berbeda)",
          "totalKuantitas": "3kg",
          "pemesan": [
            { "restoran": "Resto A", "kuantitas": "2kg" },
            { "restoran": "Resto B", "kuantitas": "1kg" }
          ]
        }
      ]
    }
  ]
}`;

  try {
    const parts = [
      { text: systemPrompt },
      { text: "PESANAN BARU UNTUK DIPROSES:\n" + (textInput || "(Hanya gambar yang dilampirkan)") }
    ];

    if (imageFiles && imageFiles.length > 0) {
      for (const file of imageFiles) {
        const base64Data = await fileToBase64(file);
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        });
      }
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: parts,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    const outputText = response.text;
    
    let parsedResults;
    try {
      const cleanedText = outputText.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonData = JSON.parse(cleanedText);
      parsedResults = jsonData.hasil || [];
    } catch (e) {
      console.error("Failed to parse JSON string:", outputText);
      throw new Error("Gagal mengurai respons dari AI. Pastikan prompt sudah benar.");
    }

    // ─── Post-processing: auto-create restaurants & ingredients ───
    await postProcessResults(uid, parsedResults, markets, ingredients, restaurants);

    return parsedResults;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Terjadi kesalahan saat menghubungi Google AI.");
  }
}

/**
 * Post-process AI results:
 * - Auto-create new restaurant entries
 * - Auto-create new ingredients (with fuzzy matching)
 * - Link ingredients to restaurants
 * - Add aliases when fuzzy match found
 */
async function postProcessResults(uid, results, markets, existingIngredients, existingRestaurants) {
  // Collect all unique restaurant names from the results
  const mentionedRestaurants = new Set();
  for (const pasar of results) {
    for (const barang of pasar.barang) {
      for (const pemesan of (barang.pemesan || [])) {
        mentionedRestaurants.add(pemesan.restoran);
      }
    }
  }

  // For each mentioned restaurant, ensure it exists
  const restaurantMap = {}; // name -> id
  for (const rest of existingRestaurants) {
    restaurantMap[rest.name.toLowerCase()] = rest;
  }

  for (const restoName of mentionedRestaurants) {
    if (!restaurantMap[restoName.toLowerCase()]) {
      const newId = await addRestaurant(uid, restoName);
      restaurantMap[restoName.toLowerCase()] = { id: newId, name: restoName, isLocked: false };
    }
  }

  // Re-fetch ingredients after potential additions
  let currentIngredients = [...existingIngredients];

  // Process each item
  for (const pasar of results) {
    const market = markets.find(m => m.name.toLowerCase() === pasar.pasar.toLowerCase());
    const marketId = market?.id || '';

    for (const barang of pasar.barang) {
      const rawName = barang.namaBarang;
      const originalName = barang.namaAsli || rawName;

      // Try to fuzzy match against existing ingredients
      const match = fuzzyMatchIngredient(rawName, currentIngredients);

      let ingredientId;

      if (match) {
        ingredientId = match.ingredient.id;

        // If the original name is different, add it as an alias
        if (originalName.toLowerCase() !== match.ingredient.canonicalName.toLowerCase() &&
            !(match.ingredient.aliases || []).some(a => a.toLowerCase() === originalName.toLowerCase())) {
          const updatedAliases = [...(match.ingredient.aliases || []), originalName];
          await updateIngredient(uid, ingredientId, { aliases: updatedAliases });
          // Update local copy
          match.ingredient.aliases = updatedAliases;
        }
      } else {
        // New ingredient — create it
        ingredientId = await addIngredient(uid, {
          canonicalName: rawName,
          aliases: originalName !== rawName ? [originalName] : [],
          marketId,
        });
        currentIngredients.push({
          id: ingredientId,
          canonicalName: rawName,
          aliases: originalName !== rawName ? [originalName] : [],
          marketId,
        });
      }

      // Link ingredient to each mentioned restaurant
      for (const pemesan of (barang.pemesan || [])) {
        const restData = restaurantMap[pemesan.restoran.toLowerCase()];
        if (restData && !restData.isLocked) {
          await addIngredientToRestaurant(uid, restData.id, ingredientId);
        }
      }
    }
  }
}
