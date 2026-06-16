'use client';
import { useState } from 'react';
import { useHistory } from '@/lib/hooks/useHistory';
import { Activity, BrainCircuit, AlertTriangle, ThermometerSun, TrendingUp, Calendar, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis
} from 'recharts';
import type { RoomId } from '@/types';

interface MLRecord {
  timestamp: number;
  temp: number;
  humidity: number;
  is_anomaly: boolean;
  cluster: number;
}

interface MLData {
  metrics: {
    average_temp: number;
    max_temp: number;
    min_temp: number;
    anomalies_detected: number;
  };
  processed_data: MLRecord[];
  forecast: { timestamp: number; predicted_temp: number }[];
}

export default function AnalyticsPage() {
  const { history, loading: historyLoading } = useHistory(500); // Fetch more for ML
  const [analyzing, setAnalyzing] = useState(false);
  const [mlData, setMlData] = useState<MLData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedRoom, setSelectedRoom] = useState<RoomId | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | '1D' | '7D'>('ALL');

  const filteredHistory = history.filter((d) => {
    if (selectedRoom !== 'ALL' && d.room !== selectedRoom) return false;
    if (dateFilter !== 'ALL') {
      const diff = Date.now() - (d.timestamp * 1000);
      if (dateFilter === '1D' && diff > 86400000) return false;
      if (dateFilter === '7D' && diff > 7 * 86400000) return false;
    }
    return true;
  });

  const handleAnalyze = async () => {
    if (filteredHistory.length < 5) {
      setError(`Tidak cukup data untuk dianalisis (Ditemukan: ${filteredHistory.length}, Minimal: 5 data). Ubah filter untuk memperluas rentang data.`);
      return;
    }
    
    setAnalyzing(true);
    setError(null);
    setMlData(null);

    try {
      const res = await fetch('/api/python', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: filteredHistory })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses data");
      
      setMlData(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan sistem saat menghubungi Serverless Function.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

  return (
    <div className="p-3 md:p-6 space-y-6 md:space-y-8 pb-24">
      
      {/* HEADER CONTROL PANEL (PREMIUM GLASSMORPHISM) */}
      <div className="bg-[#0a101f]/80 border border-white/10 rounded-3xl p-5 md:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
          <div className="space-y-6 w-full lg:w-auto">
            
            {/* Title */}
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 flex items-center gap-3">
                <BrainCircuit className="w-8 h-8 text-purple-400" />
                FORSENCE AI Analytics
              </h1>
              <p className="text-sm md:text-base text-white/50 mt-1.5 max-w-lg">
                Jalankan model Machine Learning (Python) untuk mendeteksi anomali cuaca dan memprediksi tren suhu di ruangan.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3 h-3" /> Ruangan
                </label>
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                  {['ALL', 'A', 'B', 'C'].map(r => (
                    <button
                      key={r}
                      onClick={() => setSelectedRoom(r as any)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedRoom === r 
                        ? 'bg-purple-500/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {r === 'ALL' ? 'Semua' : `Room ${r}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Rentang Waktu
                </label>
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                  {[
                    { val: '1D', label: '24 Jam' },
                    { val: '7D', label: '7 Hari' },
                    { val: 'ALL', label: 'Semua' }
                  ].map(d => (
                    <button
                      key={d.val}
                      onClick={() => setDateFilter(d.val as any)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        dateFilter === d.val 
                        ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]' 
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing || historyLoading}
            className="group relative flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white rounded-2xl transition-all disabled:opacity-50 text-base font-bold w-full lg:w-auto justify-center shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:shadow-[0_0_40px_rgba(34,211,238,0.4)] hover:-translate-y-1 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            {analyzing ? (
              <span className="animate-spin text-xl leading-none relative z-10">↻</span>
            ) : (
              <Activity className="w-5 h-5 relative z-10" />
            )}
            <span className="relative z-10">{analyzing ? "Menganalisis Data..." : "Run AI Analysis"}</span>
          </button>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex items-start gap-3 backdrop-blur-md">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EMPTY / LOADING STATES */}
      {!mlData && !analyzing && !error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
            <BrainCircuit className="w-10 h-10 text-white/20" />
          </div>
          <h3 className="text-white font-medium text-lg mb-1">Siap Menganalisis {filteredHistory.length} Baris Data</h3>
          <p className="text-white/40 text-sm text-center max-w-sm">Tentukan filter di atas lalu klik tombol "Run AI Analysis" untuk memproses data menggunakan algoritma Python.</p>
        </motion.div>
      )}

      {analyzing && (
        <div className="h-[400px] flex flex-col items-center justify-center border border-white/5 rounded-3xl bg-[#0d1526]/80 backdrop-blur-sm">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-cyan-400 rounded-full border-t-transparent animate-spin" />
            <BrainCircuit className="absolute inset-0 m-auto w-8 h-8 text-cyan-400 animate-pulse" />
          </div>
          <h3 className="text-white font-bold text-lg">Memproses Model Machine Learning</h3>
          <p className="text-white/40 text-sm mt-1">Filtering Noise • Anomaly Detection • Forecasting</p>
        </div>
      )}

      {/* RESULTS PORTFOLIO */}
      {mlData && !analyzing && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8">
          
          {/* METRICS ROW */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Rata-rata Suhu" value={`${mlData.metrics.average_temp}°C`} icon={ThermometerSun} color="cyan" />
            <MetricCard title="Anomali Terdeteksi" value={mlData.metrics.anomalies_detected} icon={AlertTriangle} color="red" />
            <MetricCard title="Prediksi Maksimum" value={`${mlData.forecast[mlData.forecast.length-1].predicted_temp}°C`} icon={TrendingUp} color="purple" />
            <MetricCard title="Data Diproses" value={`${mlData.processed_data.length} Valid`} icon={Activity} color="emerald" />
          </div>

          {/* 1. FORECASTING */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-[2rem] opacity-20 group-hover:opacity-30 transition-opacity blur" />
            <div className="relative bg-[#0a101f] border border-white/10 rounded-[2rem] p-5 md:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-xl"><TrendingUp className="w-6 h-6 text-purple-400" /></div>
                    1. Time-Series Forecasting
                  </h2>
                  <p className="text-sm md:text-base text-white/50 mt-2">Prediksi arah tren suhu menggunakan model <span className="text-purple-300 font-medium">Linear Regression</span>. Sangat berguna untuk mengantisipasi ruangan overheating.</p>
                </div>
              </div>
              <div className="h-[300px] md:h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                    <XAxis dataKey="timestamp" type="number" scale="time" domain={['auto', 'auto']} tickFormatter={formatTime} stroke="#ffffff40" fontSize={12} tickMargin={10} />
                    <YAxis domain={['auto', 'auto']} stroke="#ffffff40" fontSize={12} tickMargin={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(10, 16, 31, 0.9)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
                      labelFormatter={(l) => `${formatDate(Number(l))} ${formatTime(Number(l))}`}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line 
                      data={mlData.processed_data} type="monotone" dataKey="temp" name="Suhu Valid (°C)" 
                      stroke="#22d3ee" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#22d3ee', stroke: '#0a101f', strokeWidth: 3 }}
                    />
                    <Line 
                      data={mlData.forecast} type="monotone" dataKey="predicted_temp" name="Prediksi Masa Depan (°C)" 
                      stroke="#a855f7" strokeWidth={3} strokeDasharray="6 6" dot={false} activeDot={{ r: 6, fill: '#a855f7', stroke: '#0a101f', strokeWidth: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* GRID: ANOMALY & CLUSTERING */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
            
            {/* 2. ANOMALY DETECTION */}
            <div className="bg-[#0a101f]/80 border border-white/10 rounded-[2rem] p-5 md:p-8 backdrop-blur-xl">
              <div className="mb-6">
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
                  2. Anomaly Detection
                </h2>
                <p className="text-sm text-white/50 mt-2">Pendeteksian suhu tak wajar dengan algoritma <span className="text-red-300 font-medium">Z-Score</span>. Titik merah menunjukan anomali ekstrim.</p>
              </div>
              <div className="h-[250px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                    <XAxis dataKey="timestamp" type="number" domain={['auto', 'auto']} tickFormatter={formatTime} stroke="#ffffff40" fontSize={12} tickMargin={10} />
                    <YAxis dataKey="temp" domain={['auto', 'auto']} stroke="#ffffff40" fontSize={12} tickMargin={10} />
                    <ZAxis range={[60, 60]} />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ backgroundColor: 'rgba(10, 16, 31, 0.9)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}
                      labelFormatter={(l) => formatTime(Number(l))}
                    />
                    <Scatter 
                      name="Suhu Normal" 
                      data={mlData.processed_data.filter((d) => !d.is_anomaly)} 
                      fill="#22d3ee" fillOpacity={0.6}
                    />
                    <Scatter 
                      name="Suhu Anomali" 
                      data={mlData.processed_data.filter((d) => d.is_anomaly)} 
                      fill="#ef4444" 
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. CLUSTERING */}
            <div className="bg-[#0a101f]/80 border border-white/10 rounded-[2rem] p-5 md:p-8 backdrop-blur-xl">
              <div className="mb-6">
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-xl"><Activity className="w-5 h-5 text-emerald-400" /></div>
                  3. K-Means Profiling
                </h2>
                <p className="text-sm text-white/50 mt-2">Membagi sebaran suhu & kelembapan ke dalam <span className="text-emerald-300 font-medium">3 Profil Identik</span>. Berguna untuk memahami pola kenyamanan.</p>
              </div>
              <div className="h-[250px] md:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                    <XAxis type="number" dataKey="temp" name="Suhu" unit="°C" stroke="#ffffff40" fontSize={12} domain={['auto', 'auto']} tickMargin={10} />
                    <YAxis type="number" dataKey="humidity" name="Kelembapan" unit="%" stroke="#ffffff40" fontSize={12} domain={['auto', 'auto']} tickMargin={10} />
                    <ZAxis range={[80, 80]} />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ backgroundColor: 'rgba(10, 16, 31, 0.9)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Scatter name="Profil Sejuk" data={mlData.processed_data.filter((d) => d.cluster === 0)} fill="#a855f7" fillOpacity={0.8} />
                    <Scatter name="Profil Optimal" data={mlData.processed_data.filter((d) => d.cluster === 1)} fill="#34d399" fillOpacity={0.8} />
                    <Scatter name="Profil Panas" data={mlData.processed_data.filter((d) => d.cluster === 2)} fill="#facc15" fillOpacity={0.8} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.1)]',
    red: 'text-red-300 bg-red-500/10 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]',
    purple: 'text-purple-300 bg-purple-500/10 border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.1)]',
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]',
  };

  return (
    <div className={`bg-[#0a101f]/80 p-5 rounded-[1.5rem] flex flex-col items-center text-center justify-center relative overflow-hidden group border ${colorMap[color]} backdrop-blur-md transition-transform hover:-translate-y-1`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${colorMap[color].split(' shadow')[0]} rotate-3 group-hover:-rotate-3 transition-transform duration-300`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-xs font-semibold text-white/50 mb-1.5 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
    </div>
  );
}
