import { GoogleGenAI } from '@google/genai';
import { loadConfig } from './storageService';

// Convert browser File/Blob to base64 for Gemini API
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // FileReader result looks like: "data:image/jpeg;base64,/9j/4AAQ..."
      // We only need the base64 part
      const base64Data = reader.result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
}

export async function processOrders(textInput, imageFiles) {
  const config = loadConfig();
  if (!config.apiKey) {
    throw new Error("API Key belum diatur di menu Pengaturan.");
  }

  // Initialize the new Google Gen AI SDK
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  
  // Prompt Instructions
  const marketRulesText = config.markets.map(m => {
    return `- ${m.name}: ${m.items.length > 0 ? m.items.join(', ') : 'Belum ada barang spesifik'}`;
  }).join('\n');

  const systemPrompt = `Kamu adalah asisten pengatur belanja untuk restoran.
Tugasmu adalah membaca teks atau gambar pesanan (notes/invoice) dan mengelompokkannya menjadi daftar belanja terstruktur dalam format JSON.

ATURAN PENGELOMPOKAN:
1. Gabungkan atau kelompokkan barang yang sama (misal: Sayur Ayam dan Ayam dijadikan satu kelompok jika konteksnya sama, dsb). 
2. Setiap barang ("namaBarang") harus diletakkan dalam kategori "pasar" yang sesuai. Pengguna telah menentukan daftar pasar beserta contoh barang yang biasa dibeli di sana:
${marketRulesText}

Jika barang tidak ada di daftar spesifik mana pun, tebak pasar mana yang paling logis berdasarkan jenis barangnya, atau masukkan ke pasar "Lain-lain" terakhir.
3. Di dalam setiap barang, berikan rincian "pemesan" (siapa restorannya dan berapa kuantitasnya).

Contoh Data Latih (Gunakan ini sebagai referensi gaya penulisan, nama restoran, dan pengelompokan):
--- AWAL CONTOH ---
${config.dataLatih || "(Belum ada contoh)"}
--- AKHIR CONTOH ---

FORMAT OUTPUT HARUS JSON SEPERTI INI (tanpa markdown backticks):
{
  "hasil": [
    {
      "pasar": "Nama Pasar",
      "barang": [
        {
          "namaBarang": "Sayur Kol",
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

    // If there are image files, parse them to base64 and append to parts
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

    // Call the model using the syntax shown by the user: gemini-3.1-flash-lite-preview
    // For general processing (text+image) in the SDK, the syntax is usually models.generateContent()
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: parts,
      config: {
        responseMimeType: "application/json",
        // Minimum thinking level for speed as shown by user. Wait, the SDK user showed Python syntax, 
        // JavaScript SDK might differ slightly but sending it in config should be fine, or we can just omit it 
        // if it fails, or stick to normal config.
        temperature: 0.1,
      }
    });

    const outputText = response.text;
    
    // Attempt to parse the JSON
    try {
      // In case the model returns markdown like ```json ... ```
      const cleanedText = outputText.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonData = JSON.parse(cleanedText);
      return jsonData.hasil || [];
    } catch (e) {
      console.error("Failed to parse JSON string:", outputText);
      throw new Error("Gagal mengurai respons dari AI. Pastikan prompt sudah benar.");
    }

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Terjadi kesalahan saat menghubungi Google AI.");
  }
}
