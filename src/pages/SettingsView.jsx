import React, { useState, useEffect } from 'react';
import { loadConfig, saveConfig } from '../services/storageService';
import { Save, AlertCircle, Plus, Trash2, X } from 'lucide-react';

export default function SettingsView() {
  const [config, setConfig] = useState(null);
  const [savedMessage, setSavedMessage] = useState('');

  // Local state for UI inputs
  const [newMarketName, setNewMarketName] = useState('');
  const [newItemNames, setNewItemNames] = useState({}); // marketIndex -> newItem string

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  if (!config) return <div className="p-4">Loading...</div>;

  const handleSave = () => {
    saveConfig(config);
    setSavedMessage('Pengaturan berhasil disimpan!');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  // --- Market Management ---
  const addMarket = () => {
    if (!newMarketName.trim()) return;
    setConfig(prev => ({
      ...prev,
      markets: [...prev.markets, { name: newMarketName.trim(), items: [] }]
    }));
    setNewMarketName('');
  };

  const removeMarket = (idx) => {
    const newMarkets = [...config.markets];
    newMarkets.splice(idx, 1);
    setConfig({ ...config, markets: newMarkets });
  };

  // --- Item Management ---
  const addItemToMarket = (marketIdx) => {
    const itemName = newItemNames[marketIdx];
    if (!itemName || !itemName.trim()) return;

    const newMarkets = [...config.markets];
    if (!newMarkets[marketIdx].items.includes(itemName.trim())) {
      newMarkets[marketIdx].items.push(itemName.trim());
    }
    
    setConfig({ ...config, markets: newMarkets });
    setNewItemNames({ ...newItemNames, [marketIdx]: '' });
  };

  const removeItemFromMarket = (marketIdx, itemIdx) => {
    const newMarkets = [...config.markets];
    newMarkets[marketIdx].items.splice(itemIdx, 1);
    setConfig({ ...config, markets: newMarkets });
  };

  return (
    <div className="p-4 bg-bg flex flex-col gap-6 animate-fade-in" style={{ paddingBottom: '7rem' }}>
      
      <div>
        <h2 className="fs-xl fw-bold mb-2">Google Gemini API Key</h2>
        <div className="card">
          <p className="fs-sm text-muted mb-3">
            Aplikasi ini membutuhkan API key dari Google AI Studio untuk memproses teks/gambar pesanan.
          </p>
          <input 
            type="password" 
            className="input mb-2" 
            placeholder="AIzaSy..." 
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
          />
          {!config.apiKey && (
            <div className="flex items-center gap-2 text-danger fs-sm mt-2">
              <AlertCircle size={16} /> <span>API key belum diisi. AI tidak akan berfungsi.</span>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="fs-xl fw-bold mb-2">Daftar Toko / Pasar & Barang</h2>
        <p className="fs-sm text-muted mb-3">Kelola toko tempat Anda belanja dan barang apa saja yang biasa dibeli di sana agar AI bisa mengelompokkan dengan otomatis.</p>
        
        <div className="flex flex-col gap-4">
          {config.markets.map((market, mIdx) => (
            <div key={mIdx} className="card p-0 overflow-hidden">
              {/* Market Header */}
              <div className="bg-surface-hover p-3 flex justify-between items-center border-b">
                <span className="fw-bold text-primary">{market.name}</span>
                <button onClick={() => removeMarket(mIdx)} className="btn-ghost flex items-center justify-center p-1 border-none cursor-pointer">
                  <Trash2 size={16} className="text-danger" />
                </button>
              </div>

              {/* Items List */}
              <div className="p-3">
                <div className="flex flex-wrap gap-2 mb-3">
                  {market.items.length === 0 && <span className="text-muted fs-sm italic">Belum ada barang spesifik.</span>}
                  {market.items.map((item, iIdx) => (
                    <div key={iIdx} className="bg-bg border px-2 py-1 flex items-center gap-1 fs-sm" style={{ borderRadius: 'var(--radius-sm)' }}>
                      {item}
                      <button onClick={() => removeItemFromMarket(mIdx, iIdx)} className="btn-ghost p-0 border-none cursor-pointer flex items-center text-muted hover:text-danger">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Item Input */}
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="input py-1 px-2 fs-sm" 
                    placeholder="Tambah barang (e.g. Beras)"
                    value={newItemNames[mIdx] || ''}
                    onChange={(e) => setNewItemNames({...newItemNames, [mIdx]: e.target.value})}
                    onKeyDown={(e) => e.key === 'Enter' && addItemToMarket(mIdx)}
                  />
                  <button onClick={() => addItemToMarket(mIdx)} className="btn btn-secondary py-1 px-2 fs-sm">Tambah</button>
                </div>
              </div>
            </div>
          ))}

          {/* Add New Market Input */}
          <div className="flex gap-2">
            <input 
              type="text" 
              className="input" 
              placeholder="Nama Toko/Pasar baru..."
              value={newMarketName}
              onChange={(e) => setNewMarketName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMarket()}
            />
            <button onClick={addMarket} className="btn btn-primary flex items-center gap-1">
              <Plus size={18} /> Toko
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="fs-xl fw-bold mb-2">Data Latih (Contoh Pesanan)</h2>
        <div className="card">
          <p className="fs-sm text-muted mb-3">
            Masukkan teks riwayat pesanan yang sering masuk agar AI lebih presisi membaca gaya tulisan.
          </p>
          <textarea 
            className="input" 
            rows={4}
            value={config.dataLatih}
            onChange={(e) => setConfig({ ...config, dataLatih: e.target.value })}
            placeholder="Contoh: \nResto A: Bawang 1kg, Cabe 2kg\nResto B: Beras 10kg..."
          ></textarea>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mt-2 mb-8">
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={20} />
          Simpan Pengaturan
        </button>
        {savedMessage && <span className="text-success fw-medium animate-fade-in">{savedMessage}</span>}
      </div>

    </div>
  );
}
