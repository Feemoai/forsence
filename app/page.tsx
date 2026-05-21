'use client';
import { useDevice }          from '@/lib/hooks/useDevice';
import { useHistory }         from '@/lib/hooks/useHistory';
import { WeatherHeader }      from '@/components/dashboard/WeatherHeader';
import { DeviceStatusBar }    from '@/components/dashboard/DeviceStatusBar';
import { RoomCard }           from '@/components/dashboard/RoomCard';
import { InsightsPanel }      from '@/components/dashboard/InsightsPanel';
import type { RoomId, HistoryEntry } from '@/types';
import dynamic from 'next/dynamic';

const ChartPanel = dynamic(() => import('@/components/dashboard/ChartPanel').then(m => m.ChartPanel), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-white/[0.04] rounded-2xl h-72" />
});

const ROOM_IDS: RoomId[] = ['A', 'B', 'C'];

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/[0.04] rounded-2xl ${className}`} />;
}

export default function DashboardPage() {
  const { data, loading, error, isOnline } = useDevice();
  const { history }                        = useHistory(40);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="glass-card px-8 py-6 text-center max-w-sm">
          <p className="text-red-400 text-sm font-semibold mb-1">Gagal memuat data</p>
          <p className="text-white/30 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">

      {/* ① Weather Header */}
      {loading
        ? <Skeleton className="h-36" />
        : <WeatherHeader weather={data?.weather ?? null} />
      }

      {/* ② Device Status Bar */}
      {!loading && data && (
        <DeviceStatusBar data={data} isOnline={isOnline} />
      )}

      {/* Page title */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-lg font-bold text-white">Monitoring Ruangan</h1>
          <p className="text-xs text-white/30 mt-0.5">Data sensor real-time · 3 ruangan</p>
        </div>
        {!loading && data && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
            isOnline
              ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/8 border-red-500/20 text-red-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            {isOnline ? 'Live' : 'Offline'}
          </div>
        )}
      </div>

      {/* ③ Room Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading
          ? ROOM_IDS.map((id) => <Skeleton key={id} className="h-56" />)
          : data
            ? ROOM_IDS.map((id) => {
              const meta = data.rooms?.[id];
              // Sumber 1: Data dari rooms/{id}/latest (per-room)
              const fromMeta = meta?.latest
                ? ({ ...meta.latest, room: id } as HistoryEntry)
                : undefined;
              
              // Sumber 2: Data global latest (devices/esp1/latest) — hanya untuk room yang aktif
              const deviceAny = data as unknown as Record<string, unknown>;
              const globalLatest = (data.activeRoom === id && deviceAny.latest)
                ? (deviceAny.latest as HistoryEntry)
                : undefined;
              
              // Sumber 3: Data terbaru dari koleksi history
              const fromHistory = history.find((h) => h.room === id);
              
              // Pilih yang benar-benar terbaru berdasarkan timestamp
              const candidates = [fromMeta, globalLatest, fromHistory].filter(
                (c): c is HistoryEntry => c != null && typeof c.timestamp === 'number'
              );
              const latestEntry = candidates.length > 0
                ? candidates.reduce((a, b) => (a.timestamp > b.timestamp ? a : b))
                : undefined;

              return (
                <RoomCard
                  key={id}
                  roomId={id}
                  meta={meta ?? { label: `Ruangan ${id}`, description: '', icon: 'school' }}
                  latest={latestEntry}
                  isActive={data.activeRoom === id}
                />
              );
            })
          : null
        }
      </div>

      {/* ④ Chart + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {loading ? <Skeleton className="h-72" /> : <ChartPanel history={history} />}
        </div>
        <div>
          {loading
            ? <Skeleton className="h-72" />
            : data && <InsightsPanel data={data} history={history} />
          }
        </div>
      </div>

    </div>
  );
}
