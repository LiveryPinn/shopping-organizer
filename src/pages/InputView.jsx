import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, ChevronRight, X, AlertCircle } from 'lucide-react';
import { processOrders } from '../services/geminiService';
import { saveToTodayList, getTodayList } from '../services/storageService';
import { useNavigate } from 'react-router-dom';

export default function InputView() {
  const [textInput, setTextInput] = useState('');
  const [images, setImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleImageUpload = (e) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      setImages(prev => [...prev, ...filesArr]);
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!textInput.trim() && images.length === 0) {
      setErrorMsg('Masukkan teks atau pilih gambar pesanan.');
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);

    try {
      const parsedItems = await processOrders(textInput, images);
      
      // Combine with existing items if they exist for today
      const existingItems = getTodayList();
      
      // Merge logic: we just append to the daily list. 
      // If we want to merge identical items, we could do it here or let the user view them as separate batches.
      // For simplicity and safety, we append the batches. But wait, the prompt asks to group things.
      // Let's just merge by "pasar" and "namaBarang"
      let merged = [...existingItems];
      
      for (const newPasar of parsedItems) {
        let existingPasar = merged.find(p => p.pasar.toLowerCase() === newPasar.pasar.toLowerCase());
        
        if (!existingPasar) {
          existingPasar = { pasar: newPasar.pasar, barang: [] };
          merged.push(existingPasar);
        }

        for (const newBarang of newPasar.barang) {
          let existingBarang = existingPasar.barang.find(b => b.namaBarang.toLowerCase() === newBarang.namaBarang.toLowerCase());
          
          if (!existingBarang) {
            existingPasar.barang.push({ ...newBarang, done: false, price: 0 });
          } else {
            // Merge pemesan arrays
            for (const newPemesan of newBarang.pemesan) {
              const existingPemesan = existingBarang.pemesan.find(p => p.restoran.toLowerCase() === newPemesan.restoran.toLowerCase());
              if (existingPemesan) {
                // If same resto, just append quantities as string or we assume it's separate. 
                // Let's just push it since parsing units like "3kg" vs "2 ikat" algorithmically is hard in JS.
                existingBarang.pemesan.push(newPemesan);
              } else {
                existingBarang.pemesan.push(newPemesan);
              }
            }
          }
        }
      }

      saveToTodayList(merged);
      
      // Clear forms
      setTextInput('');
      setImages([]);
      
      // Navigate to Shopping List
      navigate('/list');

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 bg-bg flex flex-col gap-4 animate-fade-in" style={{ paddingBottom: '7rem' }}>
      <div className="flex justify-between items-center mb-2">
        <h2 className="fs-xl fw-bold">Input Pesanan</h2>
        {getTodayList().length > 0 && (
          <span className="fs-sm px-2 py-1 bg-primary text-inverse fw-semibold" style={{ borderRadius: 'var(--radius-full)'}}>
            Ada list aktif hari ini
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="bg-surface border p-3 flex items-start gap-2 text-danger fs-sm" style={{ borderColor: 'var(--color-danger)', borderRadius: 'var(--radius-md)' }}>
          <AlertCircle size={18} className="mt-1 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="card">
        <label className="fs-sm fw-semibold mb-2 block">Teks Pesanan (Bisa banyak sekaligus)</label>
        <textarea 
          className="input mb-4" 
          rows={6}
          placeholder="Paste pesanan dari WhatsApp di sini..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
        />

        <label className="fs-sm fw-semibold mb-2 block">Atau Upload Gambar (Notes / Invoice)</label>
        <div 
          className="input flex flex-col items-center justify-center p-6 mb-4" 
          style={{ borderStyle: 'dashed', backgroundColor: 'var(--color-surface-hover)', cursor: 'pointer' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud size={32} className="text-muted mb-2" />
          <span className="fs-sm text-muted fw-medium text-center">Ketuk untuk pilih gambar</span>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            multiple
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
        </div>

        {images.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {images.map((file, idx) => (
              <div key={idx} className="relative flex-shrink-0" style={{ width: '80px', height: '80px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <img src={URL.createObjectURL(file)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button 
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-surface flex items-center justify-center" 
                  style={{ width: '20px', height: '20px', borderRadius: '50%', color: 'var(--color-danger)', border: 'none' }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

      </div>

      <button 
        className="btn btn-primary w-full mt-2 flex justify-between"
        onClick={handleSubmit}
        disabled={isProcessing}
        style={{ opacity: isProcessing ? 0.7 : 1 }}
      >
        <span className="flex items-center gap-2">
          <CheckCircle2 size={20} />
          {isProcessing ? 'Memproses dengan AI...' : 'Proses & Masukkan Daftar'}
        </span>
        {!isProcessing && <ChevronRight size={20} />}
      </button>

    </div>
  );
}
