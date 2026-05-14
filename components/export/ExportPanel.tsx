'use client';
import { useState, useMemo } from 'react';
import { Download, FileText, FileJson, FileType } from 'lucide-react';
import type { HistoryEntry, RoomId } from '@/types';
import { downloadCSV, downloadJSON, downloadPDF, filterByDateRange } from '@/lib/utils/export';

const ROOMS: Array<RoomId | 'ALL'> = ['ALL', 'A', 'B', 'C'];

interface Props { history: HistoryEntry[] }

export function ExportPanel({ history }: Props) {
  const [room, setRoom] = useState<RoomId | 'ALL'>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');

  const filtered = useMemo(() =>
    filterByDateRange(
      history,
      from ? new Date(from) : null,
      to   ? new Date(to + 'T23:59:59') : null,
      room
    ),
  [history, room, from, to]);

  const filename = `forsence_room${room}_${from||'all'}_${to||'now'}`;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Export Data</h2>
        <p className="text-sm text-white/40 mt-1">
          Filter dan download data sensor ke CSV atau JSON
        </p>
      </div>

      <div className="glass-card p-5 space-y-4">
        {/* Room */}
        <div>
          <label className="text-xs text-white/40 font-medium uppercase tracking-wide mb-2 block">
            Ruangan
          </label>
          <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
            {ROOMS.map((r) => (
              <button
                key={r}
                onClick={() => setRoom(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  room === r
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {r === 'ALL' ? 'Semua' : `Room ${r}`}
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/40 font-medium uppercase tracking-wide mb-2 block">
              Dari Tanggal
            </label>
            <input
              type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/40 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 font-medium uppercase tracking-wide mb-2 block">
              Sampai Tanggal
            </label>
            <input
              type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/40 transition-colors"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="px-3 py-2 bg-white/3 rounded-lg border border-white/5">
          <p className="text-xs text-white/40">
            {filtered.length} entri akan diexport
            {room !== 'ALL' ? ` untuk Room ${room}` : ''}
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => downloadCSV(filtered, `${filename}.csv`)}
            disabled={filtered.length === 0}
            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-xl
              bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium
              hover:bg-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={() => downloadJSON(filtered, `${filename}.json`)}
            disabled={filtered.length === 0}
            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-xl
              bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium
              hover:bg-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileJson className="w-4 h-4" />
            JSON
          </button>
          <button
            onClick={() => downloadPDF(filtered, `${filename}.pdf`)}
            disabled={filtered.length === 0}
            className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-xl
              bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium
              hover:bg-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileType className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>
    </div>
  );
}
