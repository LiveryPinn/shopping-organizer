import React, { useState, useEffect } from 'react';
import { getAllHistoryDates, loadDailyList } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, ChevronRight, Store } from 'lucide-react';

export default function HistoryView() {
  const { user } = useAuth();
  const [historyDates, setHistoryDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedList, setSelectedList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const dates = await getAllHistoryDates(user.uid);
      setHistoryDates(dates);
      setLoading(false);
    }
    load();
  }, [user.uid]);

  const handleSelectDate = async (dateString) => {
    if (selectedDate === dateString) {
      setSelectedDate(null);
      setSelectedList([]);
    } else {
      setSelectedDate(dateString);
      const data = await loadDailyList(user.uid, dateString);
      setSelectedList(data);
    }
  };

  const formatRp = (num) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  const calcGrandTotal = (list) => {
    return list.reduce((acc, p) => acc + p.barang.reduce((bAcc, b) => bAcc + (b.price || 0), 0), 0);
  };

  if (loading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full animate-fade-in text-center" style={{ paddingTop: '5rem' }}>
        <span className="text-muted fs-sm">Memuat riwayat...</span>
      </div>
    );
  }

  if (historyDates.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full animate-fade-in text-center" style={{ paddingTop: '5rem' }}>
        <Calendar size={48} className="text-muted mb-4 opacity-50" />
        <h2 className="fs-lg fw-bold mb-2">Belum ada riwayat belanja</h2>
        <p className="text-muted fs-sm">Daftar belanja Anda yang sudah selesai akan tersimpan di sini per hari.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-bg flex flex-col gap-4 animate-fade-in" style={{ paddingBottom: '7rem' }}>
      <h2 className="fs-xl fw-bold mb-2">Riwayat Belanja</h2>

      <div className="flex flex-col gap-3">
        {historyDates.map(dateStr => (
          <div key={dateStr} className="card p-0 overflow-hidden">
            <button 
              className="w-full text-left p-4 flex items-center justify-between bg-surface cursor-pointer border-none"
              onClick={() => handleSelectDate(dateStr)}
            >
              <div className="flex items-center gap-3">
                <Calendar className="text-primary" size={24} />
                <span className="fw-bold fs-md">{dateStr}</span>
              </div>
              <ChevronRight 
                size={20} 
                className="text-muted" 
                style={{ 
                  transform: selectedDate === dateStr ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }} 
              />
            </button>

            {selectedDate === dateStr && (
              <div className="p-4 bg-surface-hover border-t" style={{ borderColor: 'var(--color-border)' }}>
                <div className="mb-4">
                  <span className="fs-sm text-muted block mb-1">Total Belanja (Semua Pasar)</span>
                  <span className="fs-xl fw-extrabold text-primary">{formatRp(calcGrandTotal(selectedList))}</span>
                </div>

                <div className="flex flex-col gap-4">
                  {selectedList.map((pasar, pIdx) => (
                    <div key={pIdx}>
                      <h4 className="fs-sm fw-bold mb-2 flex items-center gap-1 text-muted">
                        <Store size={14} /> {pasar.pasar}
                      </h4>
                      <ul className="flex flex-col gap-2" style={{ listStyleType: 'none', margin: 0, padding: 0 }}>
                        {pasar.barang.map((b, bIdx) => (
                          <li key={bIdx} className="flex justify-between items-start fs-sm bg-surface p-2" style={{ borderRadius: 'var(--radius-sm)' }}>
                            <div>
                              <span className="fw-semibold block">{b.namaBarang}</span>
                              <span className="text-muted fs-sm">
                                {b.pemesan?.length || 0} Resto • {b.totalKuantitas}
                              </span>
                            </div>
                            <span className="fw-bold">{formatRp(b.price || 0)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
