'use client';
import { useEffect, useState } from 'react';
import { ref, onValue }        from 'firebase/database';
import { db }                  from '@/lib/firebase';
import { DEVICE_PATH, ONLINE_THRESHOLD_SECONDS } from '@/lib/constants';
import type { DeviceData }     from '@/types';

export function useDevice() {
  const [data,    setData]    = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const unsub = onValue(
      ref(db, DEVICE_PATH),
      (snap) => {
        setData(snap.exists() ? (snap.val() as DeviceData) : null);
        if (!snap.exists()) setError('Device tidak ditemukan di database.');
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const isOnline =
    data?.lastSeen != null &&
    Date.now() / 1000 - data.lastSeen < ONLINE_THRESHOLD_SECONDS;

  return { data, loading, error, isOnline };
}
