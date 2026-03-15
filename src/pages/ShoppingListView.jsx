import React, { useState, useEffect } from 'react';
import { getTodayList, saveToTodayList } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Store, Trash2, X } from 'lucide-react';

export default function ShoppingListView() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    async function load() {
      const data = await getTodayList(user.uid);
      setList(data);
      setLoading(false);
    }
    load();
  }, [user.uid]);

  const handleToggleDone = async (pasarIdx, barangIdx) => {
    const newList = [...list];
    newList[pasarIdx].barang[barangIdx].done = !newList[pasarIdx].barang[barangIdx].done;
    setList(newList);
    await saveToTodayList(user.uid, newList);
  };

  const handlePriceChange = async (pasarIdx, barangIdx, rawPriceInput) => {
    const newList = [...list];
    const price = parseInt(rawPriceInput.replace(/[^0-9]/g, ''), 10) || 0;
    newList[pasarIdx].barang[barangIdx].price = price;
    setList(newList);
    await saveToTodayList(user.uid, newList);
  };

  // Delete a single item from a market group
  const handleDeleteItem = async (pasarIdx, barangIdx) => {
    const newList = [...list];
    newList[pasarIdx].barang.splice(barangIdx, 1);
    // If no items left in this market, remove the market group too
    if (newList[pasarIdx].barang.length === 0) {
      newList.splice(pasarIdx, 1);
    }
    setList(newList);
    await saveToTodayList(user.uid, newList);
  };

  // Remove a specific restaurant's order from an item
  const handleRemovePemesan = async (pasarIdx, barangIdx, pemesanIdx) => {
    const newList = [...list];
    const barang = newList[pasarIdx].barang[barangIdx];
    barang.pemesan.splice(pemesanIdx, 1);

    // If no more pemesan, remove the item entirely
    if (barang.pemesan.length === 0) {
      newList[pasarIdx].barang.splice(barangIdx, 1);
      if (newList[pasarIdx].barang.length === 0) {
        newList.splice(pasarIdx, 1);
      }
    }

    setList(newList);
    await saveToTodayList(user.uid, newList);
  };

  // Clear the entire today list
  const handleClearAll = async () => {
    if (!confirm('Hapus semua daftar belanja hari ini?')) return;
    setList([]);
    await saveToTodayList(user.uid, []);
  };

  const toggleExpand = (key) => {
    setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const calcTotalPerPasar = (pasar) => {
    return pasar.barang.reduce((acc, b) => acc + (b.price || 0), 0);
  };
  
  const calcGrandTotal = () => {
    return list.reduce((acc, p) => acc + calcTotalPerPasar(p), 0);
  };

  const formatRp = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  if (loading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full animate-fade-in text-center" style={{ paddingTop: '5rem' }}>
        <span className="text-muted fs-sm">Memuat daftar belanja...</span>
      </div>
    );
  }

  if (!list || list.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full animate-fade-in text-center" style={{ paddingTop: '5rem' }}>
        <Store size={48} className="text-muted mb-4 opacity-50" />
        <h2 className="fs-lg fw-bold mb-2">Belum ada daftar belanja hari ini</h2>
        <p className="text-muted fs-sm">Gunakan tab Input untuk memproses pesanan masuk.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-bg flex flex-col gap-4 animate-fade-in" style={{ paddingBottom: '7rem' }}>
      
      <div className="flex justify-between items-center mb-2">
        <h2 className="fs-xl fw-bold">Daftar Belanja Aktif</h2>
        <div className="flex items-center gap-2">
          <span className="fs-sm px-3 py-1 bg-surface border fw-bold text-primary" style={{ borderRadius: 'var(--radius-full)', borderColor: 'var(--color-primary)'}}>
            {formatRp(calcGrandTotal())}
          </span>
          <button
            onClick={handleClearAll}
            className="btn-ghost p-1 border-none cursor-pointer"
            title="Hapus semua"
          >
            <Trash2 size={18} className="text-danger" />
          </button>
        </div>
      </div>

      {list.map((pasar, pIdx) => (
        <div key={pIdx} className="mb-4">
          <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="fs-lg fw-extrabold text-primary flex items-center gap-2">
              <Store size={20} />
              {pasar.pasar}
            </h3>
            <span className="fs-sm fw-semibold text-muted bg-surface px-2 py-1 rounded">
              Sub: {formatRp(calcTotalPerPasar(pasar))}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {pasar.barang.map((barang, bIdx) => {
              const itemKey = `${pIdx}-${bIdx}`;
              const isExpanded = expandedItems[itemKey];

              return (
                <div key={bIdx} className={`card p-0 overflow-hidden transition-all ${barang.done ? 'opacity-60' : ''}`}>
                  <div className="p-3 flex items-start gap-3">
                    <button 
                      onClick={() => handleToggleDone(pIdx, bIdx)} 
                      className="mt-1 bg-transparent border-none text-primary cursor-pointer"
                    >
                      {barang.done ? <CheckCircle2 size={24} className="text-success" /> : <Circle size={24} className="text-muted" />}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className={`fw-bold fs-md ${barang.done ? 'line-through' : ''}`}>
                          {barang.namaBarang} <span className="text-primary fs-sm">({barang.totalKuantitas})</span>
                        </span>
                        <div className="flex gap-1 items-center">
                          <input 
                            type="text" 
                            className="input p-1 px-2 text-right fs-sm" 
                            style={{ width: '90px', height: '32px' }}
                            placeholder="Rp 0"
                            value={barang.price ? formatRp(barang.price).replace('Rp', '').trim() : ''}
                            onChange={(e) => handlePriceChange(pIdx, bIdx, e.target.value)}
                            onClick={(e) => e.target.select()}
                          />
                          <button
                            onClick={() => handleDeleteItem(pIdx, bIdx)}
                            className="btn-ghost p-1 border-none cursor-pointer"
                            title="Hapus barang"
                          >
                            <Trash2 size={16} className="text-danger" />
                          </button>
                        </div>
                      </div>

                      <button 
                        onClick={() => toggleExpand(itemKey)}
                        className="mt-2 text-muted fs-sm flex items-center gap-1 bg-transparent border-none cursor-pointer p-0"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {barang.pemesan?.length || 0} Restoran
                      </button>
                    </div>
                  </div>

                  {isExpanded && barang.pemesan && barang.pemesan.length > 0 && (
                    <div className="bg-surface-hover p-3 border-t">
                      <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                        {barang.pemesan.map((p, i) => (
                          <li key={i} className="flex justify-between items-center fs-sm py-1 border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                            <span className="fw-medium">{p.restoran}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted fw-bold">{p.kuantitas}</span>
                              <button
                                onClick={() => handleRemovePemesan(pIdx, bIdx, i)}
                                className="btn-ghost p-0 border-none cursor-pointer"
                                title="Hapus restoran ini"
                              >
                                <X size={14} className="text-danger" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      ))}
      
    </div>
  );
}
