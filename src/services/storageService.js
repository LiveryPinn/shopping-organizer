const CONFIG_KEY = 'shopOrg_config';
const HISTORY_KEY_PREFIX = 'shopOrg_history_';

export const defaultConfig = {
  apiKey: '',
  markets: [
    { name: 'Pasar A', items: ['Sayur Kol', 'Bawang Merah'] },
    { name: 'Pasar B', items: ['Ayam', 'Daging'] },
    { name: 'Supermarket', items: ['Susu', 'Keju'] },
    { name: 'Toko Plastik', items: ['Kresek', 'Sedotan'] }
  ],
  dataLatih: ''
};

// --- Config Management ---
export function saveConfig(config) {
  // If we accidentally get old string array for markets, migrate it
  const migratedConfig = { ...config };
  if (migratedConfig.markets && migratedConfig.markets.length > 0 && typeof migratedConfig.markets[0] === 'string') {
    migratedConfig.markets = migratedConfig.markets.map(m => ({ name: m, items: [] }));
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(migratedConfig));
}

export function loadConfig() {
  const saved = localStorage.getItem(CONFIG_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Migration check for old users
      if (parsed.markets && parsed.markets.length > 0 && typeof parsed.markets[0] === 'string') {
        parsed.markets = parsed.markets.map(m => ({ name: m, items: [] }));
      }
      return { ...defaultConfig, ...parsed };
    } catch(e) {
      console.error("Failed to parse config", e);
    }
  }
  return defaultConfig;
}

// --- Daily History Management ---
function getTodayDateString() {
  const d = new Date();
  // YYYY-MM-DD local time
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function saveDailyList(dateString, itemsData) {
  localStorage.setItem(`${HISTORY_KEY_PREFIX}${dateString}`, JSON.stringify(itemsData));
}

export function loadDailyList(dateString) {
  const saved = localStorage.getItem(`${HISTORY_KEY_PREFIX}${dateString}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch(e) {
      console.error("Failed to parse daily list", e);
    }
  }
  return []; // return empty array if no data for the day
}

export function getTodayList() {
  return loadDailyList(getTodayDateString());
}

export function saveToTodayList(itemsData) {
  saveDailyList(getTodayDateString(), itemsData);
}

// Get all historical dates that have data
export function getAllHistoryDates() {
  const dates = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(HISTORY_KEY_PREFIX)) {
      dates.push(key.replace(HISTORY_KEY_PREFIX, ''));
    }
  }
  // Sort dates descending (newest first)
  return dates.sort((a, b) => new Date(b) - new Date(a));
}
