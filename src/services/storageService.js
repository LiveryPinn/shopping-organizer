import { db } from './firebaseConfig';
import {
  collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, writeBatch
} from 'firebase/firestore';

// ─── API Key (stays in localStorage, never synced) ───
const API_KEY_STORAGE = 'shopOrg_apiKey';

export function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

export function setApiKey(key) {
  localStorage.setItem(API_KEY_STORAGE, key);
}

// ─── Helper: get user doc path ───
function userCol(uid, colName) {
  return collection(db, 'users', uid, colName);
}

function userDoc(uid, colName, docId) {
  return doc(db, 'users', uid, colName, docId);
}

// ═══════════════════════════════════════════════════════
//  MARKETS
// ═══════════════════════════════════════════════════════
export async function getMarkets(uid) {
  const snap = await getDocs(query(userCol(uid, 'markets'), orderBy('order')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addMarket(uid, name) {
  const markets = await getMarkets(uid);
  const ref = await addDoc(userCol(uid, 'markets'), {
    name,
    order: markets.length,
  });
  return ref.id;
}

export async function updateMarket(uid, marketId, data) {
  await updateDoc(userDoc(uid, 'markets', marketId), data);
}

export async function deleteMarket(uid, marketId) {
  // Also unassign all ingredients that point to this market
  const ingredients = await getIngredients(uid);
  const batch = writeBatch(db);
  for (const ing of ingredients) {
    if (ing.marketId === marketId) {
      batch.update(userDoc(uid, 'ingredients', ing.id), { marketId: '' });
    }
  }
  batch.delete(userDoc(uid, 'markets', marketId));
  await batch.commit();
}

// ═══════════════════════════════════════════════════════
//  INGREDIENTS (central entity)
// ═══════════════════════════════════════════════════════
export async function getIngredients(uid) {
  const snap = await getDocs(userCol(uid, 'ingredients'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getIngredient(uid, ingredientId) {
  const snap = await getDoc(userDoc(uid, 'ingredients', ingredientId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addIngredient(uid, { canonicalName, aliases = [], marketId = '' }) {
  const ref = await addDoc(userCol(uid, 'ingredients'), {
    canonicalName,
    aliases,
    marketId,
  });
  return ref.id;
}

export async function updateIngredient(uid, ingredientId, data) {
  await updateDoc(userDoc(uid, 'ingredients', ingredientId), data);
}

/**
 * Delete an ingredient globally — also removes all restaurant links
 */
export async function deleteIngredientGlobally(uid, ingredientId) {
  const restaurants = await getRestaurants(uid);
  const batch = writeBatch(db);

  for (const rest of restaurants) {
    const restIngs = await getRestaurantIngredients(uid, rest.id);
    for (const ri of restIngs) {
      if (ri.ingredientId === ingredientId) {
        batch.delete(doc(db, 'users', uid, 'restaurants', rest.id, 'ingredients', ri.id));
      }
    }
  }

  batch.delete(userDoc(uid, 'ingredients', ingredientId));
  await batch.commit();
}

/**
 * Move ingredient to a different market. All restaurants auto-reflect
 * because they reference ingredientId, not marketId directly.
 */
export async function moveIngredientToMarket(uid, ingredientId, newMarketId) {
  await updateDoc(userDoc(uid, 'ingredients', ingredientId), { marketId: newMarketId });
}

/**
 * Get all ingredients for a given market
 */
export async function getIngredientsForMarket(uid, marketId) {
  const allIngs = await getIngredients(uid);
  return allIngs.filter(i => i.marketId === marketId);
}

// ═══════════════════════════════════════════════════════
//  RESTAURANTS
// ═══════════════════════════════════════════════════════
export async function getRestaurants(uid) {
  const snap = await getDocs(userCol(uid, 'restaurants'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addRestaurant(uid, name) {
  const ref = await addDoc(userCol(uid, 'restaurants'), {
    name,
    isLocked: false,
  });
  return ref.id;
}

export async function updateRestaurant(uid, restaurantId, data) {
  await updateDoc(userDoc(uid, 'restaurants', restaurantId), data);
}

export async function deleteRestaurant(uid, restaurantId) {
  // Delete all sub-ingredients first
  const restIngs = await getRestaurantIngredients(uid, restaurantId);
  const batch = writeBatch(db);
  for (const ri of restIngs) {
    batch.delete(doc(db, 'users', uid, 'restaurants', restaurantId, 'ingredients', ri.id));
  }
  batch.delete(userDoc(uid, 'restaurants', restaurantId));
  await batch.commit();
}

// ─── Restaurant Ingredients (links) ───
export async function getRestaurantIngredients(uid, restaurantId) {
  const snap = await getDocs(collection(db, 'users', uid, 'restaurants', restaurantId, 'ingredients'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addIngredientToRestaurant(uid, restaurantId, ingredientId) {
  // Check if already exists
  const existing = await getRestaurantIngredients(uid, restaurantId);
  if (existing.some(ri => ri.ingredientId === ingredientId)) return;

  await addDoc(collection(db, 'users', uid, 'restaurants', restaurantId, 'ingredients'), {
    ingredientId,
    isLocked: false,
  });
}

export async function updateRestaurantIngredient(uid, restaurantId, linkId, data) {
  await updateDoc(doc(db, 'users', uid, 'restaurants', restaurantId, 'ingredients', linkId), data);
}

export async function removeIngredientFromRestaurant(uid, restaurantId, linkId) {
  await deleteDoc(doc(db, 'users', uid, 'restaurants', restaurantId, 'ingredients', linkId));
}

// ═══════════════════════════════════════════════════════
//  DAILY SHOPPING LIST & HISTORY
// ═══════════════════════════════════════════════════════
function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function getTodayList(uid) {
  const dateStr = getTodayDateString();
  return await loadDailyList(uid, dateStr);
}

export async function saveToTodayList(uid, itemsData) {
  const dateStr = getTodayDateString();
  await saveDailyList(uid, dateStr, itemsData);
}

export async function saveDailyList(uid, dateString, itemsData) {
  await setDoc(userDoc(uid, 'history', dateString), { list: itemsData });
}

export async function loadDailyList(uid, dateString) {
  const snap = await getDoc(userDoc(uid, 'history', dateString));
  if (snap.exists()) {
    return snap.data().list || [];
  }
  return [];
}

export async function getAllHistoryDates(uid) {
  const snap = await getDocs(userCol(uid, 'history'));
  const dates = snap.docs.map(d => d.id);
  return dates.sort((a, b) => new Date(b) - new Date(a));
}

// ═══════════════════════════════════════════════════════
//  FUZZY MATCHING HELPER
// ═══════════════════════════════════════════════════════
/**
 * Find the best matching ingredient from a list, given a raw name.
 * Returns { ingredient, score } or null if no good match.
 */
export function fuzzyMatchIngredient(rawName, ingredientsList) {
  const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedRaw = normalize(rawName);

  let bestMatch = null;
  let bestScore = 0;

  for (const ing of ingredientsList) {
    // Check canonical name
    const canonScore = similarity(normalizedRaw, normalize(ing.canonicalName));
    if (canonScore > bestScore) {
      bestScore = canonScore;
      bestMatch = ing;
    }

    // Check aliases
    for (const alias of (ing.aliases || [])) {
      const aliasScore = similarity(normalizedRaw, normalize(alias));
      if (aliasScore > bestScore) {
        bestScore = aliasScore;
        bestMatch = ing;
      }
    }
  }

  // Threshold: 0.6 = fairly similar
  if (bestScore >= 0.6) {
    return { ingredient: bestMatch, score: bestScore };
  }
  return null;
}

/**
 * Simple Sørensen–Dice coefficient for string similarity
 */
function similarity(s1, s2) {
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  const bigrams1 = new Set();
  for (let i = 0; i < s1.length - 1; i++) {
    bigrams1.add(s1.substring(i, i + 2));
  }

  let intersection = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    const bigram = s2.substring(i, i + 2);
    if (bigrams1.has(bigram)) {
      intersection++;
      bigrams1.delete(bigram); // count each only once
    }
  }

  return (2 * intersection) / (s1.length - 1 + s2.length - 1);
}
