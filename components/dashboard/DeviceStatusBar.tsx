'use client';
import { useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff, BatteryFull, Battery, BatteryLow, Cpu, Power } from 'lucide-react';
import { sendWifiOffCommand, sendActiveRoomCommand } from '@/lib/firebase-actions';
import type { DeviceData } from '@/types';

interface Props { data: DeviceData; isOnline: boolean }

export function DeviceStatusBar({ data, isOnline }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const pct = data.battery ?? 0;

  useEffect(() => {
    const tick = () => setElapsed(Math.floor(Date.now() / 1000 - data.lastSeen));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data.lastSeen]);

  // Format pendek untuk mobile, lengkap untuk desktop
  const elapsedShort =
    elapsed < 60    ? `${elapsed}d`
    : elapsed < 3600 ? `${Math.floor(elapsed / 60)}m`
    : `${Math.floor(elapsed / 3600)}j`;

  const elapsedFull =
    elapsed < 60    ? `${elapsed} detik lalu`
    : elapsed < 3600 ? `${Math.floor(elapsed / 60)} menit lalu`
    : `${Math.floor(elapsed / 3600)} jam lalu`;

  const batColor = pct > 70 ? 'text-emerald-400' : pct > 30 ? 'text-amber-400' : 'text-red-400';
  const batBarBg = pct > 70 ? 'bg-emerald-400'   : pct > 30 ? 'bg-amber-400'   : 'bg-red-400';
  const BatIcon  = pct > 70 ? BatteryFull : pct > 30 ? Battery : BatteryLow;

  const handleWifiOff = useCallback(async () => {
    setSending(true);
    try {
      await sendWifiOffCommand();
      setShowConfirm(false);
    } catch (err) {
      console.error('[WiFi OFF] Gagal:', err);
    } finally {
      setSending(false);
    }
  }, []);

  return (
    <>
      <div className="flex items-center px-3 md:px-5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] overflow-x-auto gap-0">

        {/* Device */}
        <div className="flex items-center gap-1.5 pr-3 md:pr-5 shrink-0">
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] md:text-xs font-semibold text-white/60 tracking-wide">
            <span className="hidden md:inline">ESP32-01</span>
            <span className="md:hidden">ESP32</span>
          </span>
        </div>

        <Sep />

        {/* Connection */}
        <div className="flex items-center gap-1.5 px-3 md:px-5 shrink-0">
          {isOnline ? (
            <>
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-[10px] md:text-xs text-emerald-400 font-medium">Online</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              <WifiOff className="w-3 h-3 text-red-400 shrink-0" />
              <span className="text-[10px] md:text-xs text-red-400 font-medium">Offline</span>
            </>
          )}
        </div>

        <Sep />

        {/* Last seen — short on mobile */}
        <span className="px-3 md:px-5 shrink-0 text-white/30 text-[10px] md:text-xs">
          <span className="md:hidden">{elapsedShort} lalu</span>
          <span className="hidden md:inline">Terakhir:&nbsp;<span className="text-white/50">{elapsedFull}</span></span>
        </span>

        <Sep />

        {/* Battery */}
        <div className={`flex items-center gap-1.5 pl-3 md:pl-5 shrink-0 ${batColor}`}>
          <BatIcon className="w-3 h-3 shrink-0" />
          <span className="text-[10px] md:text-xs font-semibold tabular-nums">{pct}%</span>
          {/* Bar — hanya desktop */}
          <div className="hidden md:block w-12 h-1 rounded-full bg-white/5 overflow-hidden shrink-0">
            <div className={`h-full rounded-full ${batBarBg} transition-all duration-700`} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Active room Selector */}
        <Sep />
        <div className="flex items-center gap-1 px-3 md:px-5 shrink-0">
          <span className="text-[9px] text-white/25 hidden md:inline mr-1">Ruang:</span>
          <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
            {['A', 'B', 'C'].map(r => (
              <button
                key={r}
                onClick={() => sendActiveRoomCommand(r)}
                className={`w-6 h-5 md:w-8 md:h-6 flex items-center justify-center text-[10px] md:text-xs font-bold rounded-md transition-all ${data.activeRoom === r ? 'bg-cyan-500 text-white shadow-md' : 'text-white/40 hover:text-white hover:bg-white/10'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* WiFi OFF button — hanya saat online */}
        {isOnline && (
          <>
            <Sep />
            <button
              id="btn-wifi-off"
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 pl-3 md:pl-5 shrink-0 group cursor-pointer
                         text-red-400/60 hover:text-red-400 transition-colors duration-200"
              title="Matikan WiFi ESP32"
            >
              <Power className="w-3 h-3 shrink-0 group-hover:drop-shadow-[0_0_6px_rgba(248,113,113,0.6)] transition-all duration-200" />
              <span className="hidden md:inline text-[10px] font-medium group-hover:text-red-300 transition-colors duration-200">
                Matikan WiFi
              </span>
            </button>
          </>
        )}
      </div>

      {/* Confirmation Modal Overlay */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-red-500/20 bg-[#0d1117] shadow-2xl shadow-red-500/10 overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20">
                  <WifiOff className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Matikan WiFi?</h3>
                  <p className="text-[11px] text-white/40">ESP32-01</p>
                </div>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                Perangkat akan berhenti mengirim data dan menjadi <span className="text-red-400 font-medium">offline</span>.
              </p>
            </div>

            {/* Warning */}
            <div className="mx-6 mb-4 px-3 py-2.5 rounded-lg bg-amber-500/8 border border-amber-500/15">
              <p className="text-[11px] text-amber-400/90 leading-relaxed">
                ⚠️ Untuk menyalakan kembali, harus <span className="font-bold text-amber-300">sentuh 4× di perangkat fisik</span>. 
                Tidak bisa dinyalakan dari dashboard.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={sending}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium
                           bg-white/5 border border-white/10 text-white/60
                           hover:bg-white/10 hover:text-white/80
                           transition-all duration-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                id="btn-confirm-wifi-off"
                onClick={handleWifiOff}
                disabled={sending}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold
                           bg-red-500/15 border border-red-500/30 text-red-400
                           hover:bg-red-500/25 hover:text-red-300 hover:border-red-500/50
                           disabled:opacity-40 disabled:cursor-not-allowed
                           transition-all duration-200 cursor-pointer
                           flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <span className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Power className="w-3.5 h-3.5" />
                    Ya, Matikan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Sep() {
  return <div className="h-3 w-px bg-white/8 shrink-0 mx-0.5 md:mx-0" />;
}
