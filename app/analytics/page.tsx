'use client';
import { useState } from 'react';
import { useHistory } from '@/lib/hooks/useHistory';
import { Activity, BrainCircuit, AlertTriangle, ThermometerSun, TrendingUp, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea, ScatterChart, Scatter, ZAxis
} from 'recharts';

export default function AnalyticsPage() {
  const { history, loading: historyLoading } = useHistory(200);
  const [analyzing, setAnalyzing] = useState(false);
  const [mlData, setMlData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (history.length < 5) {
      setError("Tidak cukup data untuk dianalisis (minimal 5 data).");
      return;
    }
    
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/ml/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: history })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memproses data");
      
      setMlData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 pb-24">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-purple-400" />
            Machine Learning Analytics
          </h1>
          <p className="text-sm text-white/40 mt-0.5">Analisis Prediktif & Deteksi Anomali dengan Python AI</p>
        </div>
        
        <button
          onClick={handleAnalyze}
          disabled={analyzing || historyLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 
            text-purple-400 border border-purple-500/20 rounded-xl transition-all disabled:opacity-50 text-sm font-medium w-full md:w-auto justify-center"
        >
          {analyzing ? (
            <span className="animate-spin text-lg leading-none">↻</span>
          ) : (
            <Activity className="w-4 h-4" />
          )}
          {analyzing ? "Menganalisis..." : "Jalankan Analisis ML"}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!mlData && !analyzing && !error && (
        <div className="h-64 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/5">
          <BrainCircuit className="w-12 h-12 text-white/20 mb-3" />
          <p className="text-white/40 text-sm">Klik tombol di atas untuk memulai analisis data historis.</p>
        </div>
      )}

      {analyzing && (
        <div className="h-64 flex flex-col items-center justify-center border border-white/5 rounded-2xl bg-[#0d1526] animate-pulse">
          <p className="text-white/40 text-sm">Menjalankan model Isolation Forest & Regresi Linear...</p>
        </div>
      )}

      {mlData && !analyzing && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <MetricCard title="Rata-rata Suhu" value={`${mlData.metrics.average_temp}°C`} icon={ThermometerSun} color="cyan" />
            <MetricCard title="Anomali Terdeteksi" value={mlData.metrics.anomalies_detected} icon={AlertTriangle} color="red" />
            <MetricCard title="Prediksi Teratas" value={`${mlData.forecast[mlData.forecast.length-1].predicted_temp}°C`} icon={TrendingUp} color="purple" />
            <MetricCard title="Rentang Data" value={`${mlData.processed_data.length} records`} icon={Calendar} color="emerald" />
          </div>

          {/* Forecasting Line Chart */}
          <div className="bg-[#0d1526] border border-white/5 rounded-2xl p-4 md:p-6">
            <div className="mb-4">
              <h3 className="text-white font-medium">Suhu Historis vs Forecasting ML</h3>
              <p className="text-xs text-white/40">Prediksi suhu beberapa jam ke depan menggunakan Linear Regression.</p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="timestamp" type="number" scale="time" domain={['auto', 'auto']} tickFormatter={formatTime} stroke="#ffffff40" fontSize={12} />
                  <YAxis domain={['auto', 'auto']} stroke="#ffffff40" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#070d1a', borderColor: '#ffffff20', borderRadius: '12px' }}
                    labelFormatter={(l) => `${formatDate(Number(l))} ${formatTime(Number(l))}`}
                  />
                  <Legend />
                  <Line 
                    data={mlData.processed_data} type="monotone" dataKey="temp" name="Suhu Historis (°C)" 
                    stroke="#22d3ee" strokeWidth={2} dot={false} 
                  />
                  <Line 
                    data={mlData.forecast} type="dashed" dataKey="predicted_temp" name="Prediksi ML (°C)" 
                    stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" dot={false} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Anomaly Bar Chart & Heatmap row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Anomaly Chart */}
            <div className="bg-[#0d1526] border border-white/5 rounded-2xl p-4 md:p-6">
              <div className="mb-4">
                <h3 className="text-white font-medium">Deteksi Anomali Suhu</h3>
                <p className="text-xs text-white/40">Dideteksi menggunakan algoritma Isolation Forest.</p>
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="timestamp" type="number" domain={['auto', 'auto']} tickFormatter={formatTime} stroke="#ffffff40" fontSize={12} />
                    <YAxis dataKey="temp" domain={['auto', 'auto']} stroke="#ffffff40" fontSize={12} />
                    <ZAxis range={[50, 50]} />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ backgroundColor: '#070d1a', borderColor: '#ffffff20', borderRadius: '12px' }}
                      labelFormatter={(l) => formatTime(Number(l))}
                    />
                    <Scatter 
                      name="Normal" 
                      data={mlData.processed_data.filter((d: any) => !d.is_anomaly)} 
                      fill="#22d3ee" fillOpacity={0.6}
                    />
                    <Scatter 
                      name="Anomali" 
                      data={mlData.processed_data.filter((d: any) => d.is_anomaly)} 
                      fill="#ef4444" 
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Simple correlation / Distribution */}
            <div className="bg-[#0d1526] border border-white/5 rounded-2xl p-4 md:p-6">
              <div className="mb-4">
                <h3 className="text-white font-medium">Distribusi Kelembapan</h3>
                <p className="text-xs text-white/40">Korelasi rentang kelembapan di seluruh ruangan.</p>
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mlData.processed_data.slice(-20)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="timestamp" tickFormatter={formatTime} stroke="#ffffff40" fontSize={12} />
                    <YAxis stroke="#ffffff40" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#070d1a', borderColor: '#ffffff20', borderRadius: '12px' }} />
                    <Bar dataKey="humidity" name="Kelembapan (%)" fill="#34d399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </motion.div>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: any) {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex flex-col items-center text-center justify-center relative overflow-hidden group">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 border ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs text-white/50 mb-1">{title}</p>
      <p className="text-xl font-bold text-white tracking-tight">{value}</p>
    </div>
  );
}
