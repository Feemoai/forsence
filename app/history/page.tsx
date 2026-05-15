'use client';
import { useState }   from 'react';
import { useHistory } from '@/lib/hooks/useHistory';
import { DataTable }  from '@/components/history/DataTable';
import { clearAllHistory } from '@/lib/firebase-actions';
import { Trash2, AlertTriangle } from 'lucide-react';

export default function HistoryPage() {
  const { history, loading } = useHistory(500);
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    const confirmText = window.prompt(
      'Yakin ingin menghapus data history?\n(2 data terakhir tiap ruangan akan disisakan)\n\nKetik "DataFORSENCE" untuk mengonfirmasi penghapusan:'
    );

    if (confirmText !== 'DataFORSENCE') {
      if (confirmText !== null) {
        alert('Teks konfirmasi salah. Penghapusan dibatalkan.');
      }
      return;
    }
    
    setClearing(true);
    try {
      await clearAllHistory();
      alert('Data history berhasil dihapus (disisakan 2 data terakhir per ruangan)!');
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">History</h1>
          <p className="text-sm text-white/40 mt-0.5">Riwayat data sensor semua ruangan</p>
        </div>
        
        {history.length > 0 && (
          <button
            onClick={handleClear}
            disabled={clearing}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 
              text-red-400 border border-red-500/20 rounded-xl transition-all disabled:opacity-50 text-sm font-medium"
          >
            {clearing ? <span className="animate-spin text-lg leading-none">↻</span> : <Trash2 className="w-4 h-4" />}
            {clearing ? 'Menghapus...' : 'Bersihkan Data History'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="animate-pulse bg-white/5 rounded-xl h-96" />
      ) : (
        <DataTable history={history} />
      )}
    </div>
  );
}
