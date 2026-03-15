import React, { useState, useEffect, useCallback } from 'react';
import {
  getApiKey, setApiKey,
  getMarkets, addMarket, deleteMarket,
  getIngredients, addIngredient, deleteIngredientGlobally, moveIngredientToMarket, updateIngredient,
  getRestaurants, updateRestaurant, deleteRestaurant,
  getRestaurantIngredients, addIngredientToRestaurant, removeIngredientFromRestaurant, updateRestaurantIngredient,
} from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';
import {
  Save, AlertCircle, Plus, Trash2, X, Lock, Unlock, Store, ChevronDown, ChevronUp,
  ArrowRightLeft, Utensils
} from 'lucide-react';

export default function SettingsView() {
  const { user } = useAuth();
  const [apiKeyVal, setApiKeyVal] = useState('');
  const [activeTab, setActiveTab] = useState('markets'); // 'markets' | 'restaurants'

  // Data
  const [markets, setMarkets] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantIngredients, setRestaurantIngredients] = useState({}); // restId -> [links]

  // UI State
  const [newMarketName, setNewMarketName] = useState('');
  const [expandedMarket, setExpandedMarket] = useState(null);
  const [expandedRestaurant, setExpandedRestaurant] = useState(null);
  const [newIngName, setNewIngName] = useState('');
  const [newIngMarket, setNewIngMarket] = useState('');
  const [loading, setLoading] = useState(true);
  const [savedMessage, setSavedMessage] = useState('');

  const loadAllData = useCallback(async () => {
    setLoading(true);
    const [m, i, r] = await Promise.all([
      getMarkets(user.uid),
      getIngredients(user.uid),
      getRestaurants(user.uid),
    ]);
    setMarkets(m);
    setIngredients(i);
    setRestaurants(r);
    setApiKeyVal(getApiKey());

    // Load restaurant ingredients
    const riMap = {};
    for (const rest of r) {
      riMap[rest.id] = await getRestaurantIngredients(user.uid, rest.id);
    }
    setRestaurantIngredients(riMap);
    setLoading(false);
  }, [user.uid]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const showSaved = (msg = 'Tersimpan!') => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(''), 2000);
  };

  // ─── API KEY ───
  const handleSaveApiKey = () => {
    setApiKey(apiKeyVal);
    showSaved('API Key disimpan!');
  };

  // ─── MARKETS ───
  const handleAddMarket = async () => {
    if (!newMarketName.trim()) return;
    await addMarket(user.uid, newMarketName.trim());
    setNewMarketName('');
    await loadAllData();
    showSaved();
  };

  const handleDeleteMarket = async (marketId) => {
    if (!confirm('Hapus pasar ini? Barang tidak akan dihapus, hanya dipindah ke tanpa pasar.')) return;
    await deleteMarket(user.uid, marketId);
    await loadAllData();
    showSaved('Pasar dihapus.');
  };

  const handleMoveIngredient = async (ingredientId, newMarketId) => {
    await moveIngredientToMarket(user.uid, ingredientId, newMarketId);
    await loadAllData();
    showSaved('Barang dipindahkan.');
  };

  const handleDeleteIngredient = async (ingredientId) => {
    if (!confirm('Hapus barang ini dari semua pasar DAN semua restoran?')) return;
    await deleteIngredientGlobally(user.uid, ingredientId);
    await loadAllData();
    showSaved('Barang dihapus.');
  };

  const handleAddIngredient = async () => {
    if (!newIngName.trim()) return;
    await addIngredient(user.uid, {
      canonicalName: newIngName.trim(),
      aliases: [],
      marketId: newIngMarket || '',
    });
    setNewIngName('');
    setNewIngMarket('');
    await loadAllData();
    showSaved();
  };

  // ─── RESTAURANTS ───
  const handleToggleRestaurantLock = async (restId, currentLock) => {
    await updateRestaurant(user.uid, restId, { isLocked: !currentLock });
    await loadAllData();
    showSaved(currentLock ? 'Restoran dibuka.' : 'Restoran dikunci.');
  };

  const handleDeleteRestaurant = async (restId) => {
    if (!confirm('Hapus restoran ini beserta semua link barangnya?')) return;
    await deleteRestaurant(user.uid, restId);
    await loadAllData();
    showSaved('Restoran dihapus.');
  };

  const handleToggleIngredientLock = async (restId, linkId, currentLock) => {
    await updateRestaurantIngredient(user.uid, restId, linkId, { isLocked: !currentLock });
    await loadAllData();
  };

  const handleRemoveIngredientFromRestaurant = async (restId, linkId) => {
    await removeIngredientFromRestaurant(user.uid, restId, linkId);
    await loadAllData();
    showSaved('Barang dihapus dari restoran.');
  };

  const handleAddIngredientToRestaurant = async (restId, ingredientId) => {
    if (!ingredientId) return;
    await addIngredientToRestaurant(user.uid, restId, ingredientId);
    await loadAllData();
    showSaved();
  };

  // ─── HELPERS ───
  const getIngredientById = (id) => ingredients.find(i => i.id === id);
  const getMarketById = (id) => markets.find(m => m.id === id);
  const getIngredientsForMarket = (marketId) => ingredients.filter(i => i.marketId === marketId);
  const getUnassignedIngredients = () => ingredients.filter(i => !i.marketId || !markets.some(m => m.id === i.marketId));

  if (loading) {
    return <div className="p-4 text-center text-muted fs-sm animate-fade-in" style={{ paddingTop: '5rem' }}>Memuat pengaturan...</div>;
  }

  return (
    <div className="p-4 bg-bg flex flex-col gap-6 animate-fade-in" style={{ paddingBottom: '7rem' }}>

      {/* API KEY */}
      <div>
        <h2 className="fs-xl fw-bold mb-2">Gemini API Key</h2>
        <div className="card">
          <p className="fs-sm text-muted mb-3">Disimpan hanya di perangkat ini. Tidak disinkronkan ke cloud.</p>
          <div className="flex gap-2">
            <input 
              type="password" 
              className="input" 
              placeholder="AIzaSy..." 
              value={apiKeyVal}
              onChange={(e) => setApiKeyVal(e.target.value)}
            />
            <button onClick={handleSaveApiKey} className="btn btn-primary flex items-center gap-1">
              <Save size={16} /> Simpan
            </button>
          </div>
          {!apiKeyVal && (
            <div className="flex items-center gap-2 text-danger fs-sm mt-2">
              <AlertCircle size={16} /> <span>API key belum diisi.</span>
            </div>
          )}
        </div>
      </div>

      {/* SAVED MESSAGE */}
      {savedMessage && (
        <div className="text-success fw-medium fs-sm animate-fade-in text-center">{savedMessage}</div>
      )}

      {/* TAB SWITCHER */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('markets')}
          className={`btn flex-1 flex items-center justify-center gap-1 fs-sm ${activeTab === 'markets' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Store size={16} /> Pasar & Barang
        </button>
        <button
          onClick={() => setActiveTab('restaurants')}
          className={`btn flex-1 flex items-center justify-center gap-1 fs-sm ${activeTab === 'restaurants' ? 'btn-primary' : 'btn-secondary'}`}
        >
          <Utensils size={16} /> Restoran
        </button>
      </div>

      {/* ═══════════ MARKETS TAB ═══════════ */}
      {activeTab === 'markets' && (
        <div className="flex flex-col gap-4">
          <p className="fs-sm text-muted">Kelola pasar dan barang. Pindahkan barang antar pasar — semua restoran otomatis mengikuti.</p>

          {markets.map(market => {
            const marketIngs = getIngredientsForMarket(market.id);
            const isExpanded = expandedMarket === market.id;

            return (
              <div key={market.id} className="card p-0 overflow-hidden">
                <div 
                  className="bg-surface-hover p-3 flex justify-between items-center border-b cursor-pointer"
                  onClick={() => setExpandedMarket(isExpanded ? null : market.id)}
                >
                  <span className="fw-bold text-primary flex items-center gap-2">
                    <Store size={16} /> {market.name}
                    <span className="text-muted fs-sm fw-medium">({marketIngs.length})</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteMarket(market.id); }} className="btn-ghost p-1 border-none cursor-pointer">
                      <Trash2 size={14} className="text-danger" />
                    </button>
                    {isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-3">
                    {marketIngs.length === 0 && <span className="text-muted fs-sm">Belum ada barang di pasar ini.</span>}
                    <div className="flex flex-col gap-2">
                      {marketIngs.map(ing => (
                        <div key={ing.id} className="flex justify-between items-center bg-bg border p-2" style={{ borderRadius: 'var(--radius-sm)' }}>
                          <div>
                            <span className="fs-sm fw-semibold">{ing.canonicalName}</span>
                            {ing.aliases?.length > 0 && (
                              <span className="text-muted fs-sm block">alias: {ing.aliases.join(', ')}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <select
                              className="input py-1 px-2 fs-sm"
                              style={{ width: '120px', height: '28px' }}
                              value={ing.marketId}
                              onChange={(e) => handleMoveIngredient(ing.id, e.target.value)}
                            >
                              {markets.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                            <button onClick={() => handleDeleteIngredient(ing.id)} className="btn-ghost p-1 border-none cursor-pointer">
                              <Trash2 size={14} className="text-danger" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Unassigned ingredients */}
          {getUnassignedIngredients().length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="bg-surface-hover p-3 border-b">
                <span className="fw-bold text-muted flex items-center gap-2">Belum ada pasar ({getUnassignedIngredients().length})</span>
              </div>
              <div className="p-3 flex flex-col gap-2">
                {getUnassignedIngredients().map(ing => (
                  <div key={ing.id} className="flex justify-between items-center bg-bg border p-2" style={{ borderRadius: 'var(--radius-sm)' }}>
                    <span className="fs-sm fw-semibold">{ing.canonicalName}</span>
                    <div className="flex items-center gap-1">
                      <select
                        className="input py-1 px-2 fs-sm"
                        style={{ width: '120px', height: '28px' }}
                        value=""
                        onChange={(e) => handleMoveIngredient(ing.id, e.target.value)}
                      >
                        <option value="">Pilih pasar</option>
                        {markets.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <button onClick={() => handleDeleteIngredient(ing.id)} className="btn-ghost p-1 border-none cursor-pointer">
                        <Trash2 size={14} className="text-danger" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new market */}
          <div className="flex gap-2">
            <input 
              type="text" className="input" placeholder="Nama Pasar baru..."
              value={newMarketName}
              onChange={(e) => setNewMarketName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddMarket()}
            />
            <button onClick={handleAddMarket} className="btn btn-primary flex items-center gap-1">
              <Plus size={18} /> Pasar
            </button>
          </div>

          {/* Add new ingredient */}
          <div className="card">
            <span className="fs-sm fw-semibold block mb-2">Tambah Barang Baru</span>
            <div className="flex gap-2">
              <input 
                type="text" className="input py-1 px-2 fs-sm" placeholder="Nama barang..."
                value={newIngName}
                onChange={(e) => setNewIngName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
              />
              <select
                className="input py-1 px-2 fs-sm"
                style={{ width: '130px' }}
                value={newIngMarket}
                onChange={(e) => setNewIngMarket(e.target.value)}
              >
                <option value="">Pilih pasar</option>
                {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button onClick={handleAddIngredient} className="btn btn-primary py-1 px-2 fs-sm">Tambah</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ RESTAURANTS TAB ═══════════ */}
      {activeTab === 'restaurants' && (
        <div className="flex flex-col gap-4">
          <p className="fs-sm text-muted">Restoran dibuat otomatis saat AI memproses pesanan baru. Kunci restoran agar AI tidak menambah barang baru.</p>

          {restaurants.length === 0 && (
            <div className="text-center text-muted fs-sm" style={{ paddingTop: '2rem' }}>
              <Utensils size={32} className="opacity-50 mb-2" style={{ display: 'inline-block' }} />
              <p>Belum ada restoran. Restoran akan muncul otomatis saat kamu memproses pesanan pertama.</p>
            </div>
          )}

          {restaurants.map(rest => {
            const links = restaurantIngredients[rest.id] || [];
            const isExpanded = expandedRestaurant === rest.id;

            return (
              <div key={rest.id} className="card p-0 overflow-hidden">
                {/* Restaurant Header */}
                <div 
                  className="bg-surface-hover p-3 flex justify-between items-center border-b cursor-pointer"
                  onClick={() => setExpandedRestaurant(isExpanded ? null : rest.id)}
                >
                  <span className="fw-bold text-primary flex items-center gap-2">
                    <Utensils size={16} /> {rest.name}
                    <span className="text-muted fs-sm fw-medium">({links.length} barang)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleRestaurantLock(rest.id, rest.isLocked); }}
                      className="btn-ghost p-1 border-none cursor-pointer"
                      title={rest.isLocked ? 'Buka kunci restoran' : 'Kunci restoran'}
                    >
                      {rest.isLocked
                        ? <Lock size={16} className="text-warning" />
                        : <Unlock size={16} className="text-success" />
                      }
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteRestaurant(rest.id); }} className="btn-ghost p-1 border-none cursor-pointer">
                      <Trash2 size={14} className="text-danger" />
                    </button>
                    {isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-3 flex flex-col gap-2">
                    {rest.isLocked && (
                      <div className="flex items-center gap-1 text-warning fs-sm mb-1">
                        <Lock size={12} /> AI tidak bisa menambah barang baru ke restoran ini.
                      </div>
                    )}

                    {links.length === 0 && <span className="text-muted fs-sm">Belum ada barang.</span>}

                    {links.map(link => {
                      const ing = getIngredientById(link.ingredientId);
                      if (!ing) return null;
                      const market = getMarketById(ing.marketId);

                      return (
                        <div key={link.id} className="flex justify-between items-center bg-bg border p-2" style={{ borderRadius: 'var(--radius-sm)' }}>
                          <div className="flex-1">
                            <span className="fs-sm fw-semibold flex items-center gap-1">
                              {link.isLocked && <Lock size={12} className="text-warning" />}
                              {ing.canonicalName}
                            </span>
                            {market && <span className="text-muted fs-sm">📍 {market.name}</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleIngredientLock(rest.id, link.id, link.isLocked)}
                              className="btn-ghost p-1 border-none cursor-pointer"
                              title={link.isLocked ? 'Buka kunci' : 'Kunci'}
                            >
                              {link.isLocked
                                ? <Lock size={14} className="text-warning" />
                                : <Unlock size={14} className="text-muted" />
                              }
                            </button>
                            <button onClick={() => handleRemoveIngredientFromRestaurant(rest.id, link.id)} className="btn-ghost p-1 border-none cursor-pointer">
                              <X size={14} className="text-danger" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add existing ingredient to restaurant */}
                    <div className="flex gap-2 mt-2">
                      <select
                        id={`add-ing-${rest.id}`}
                        className="input py-1 px-2 fs-sm flex-1"
                      >
                        <option value="">Tambah barang yang sudah ada...</option>
                        {ingredients
                          .filter(i => !links.some(l => l.ingredientId === i.id))
                          .map(i => <option key={i.id} value={i.id}>{i.canonicalName}</option>)
                        }
                      </select>
                      <button
                        onClick={() => {
                          const el = document.getElementById(`add-ing-${rest.id}`);
                          handleAddIngredientToRestaurant(rest.id, el.value);
                          el.value = '';
                        }}
                        className="btn btn-secondary py-1 px-2 fs-sm"
                      >
                        Tambah
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
