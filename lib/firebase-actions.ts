// ================================================================
// lib/firebase-actions.ts — Semua operasi WRITE ke Firebase
// (Separation of Concerns: komponen hanya panggil fungsi ini)
// ================================================================

import { ref, update, push }      from 'firebase/database';
import { db }                     from '@/lib/firebase';
import { DEVICE_PATH, INPUT_LIMITS, ALLOWED_ICONS } from '@/lib/constants';
import type { RoomId, HistoryEntry } from '@/types';

// ── Validation helpers ───────────────────────────────────────────

/** Sanitasi string: trim + buang karakter kontrol */
function sanitize(s: string): string {
  return s.trim().replace(/[\x00-\x1F\x7F]/g, '');
}

function assertMaxLength(value: string, max: number, field: string) {
  if (value.length > max) {
    throw new Error(`${field} terlalu panjang (maks ${max} karakter)`);
  }
}

// ── Room actions ─────────────────────────────────────────────────

/**
 * Update deskripsi ruangan di Firebase.
 * Validasi dilakukan SEBELUM menulis.
 */
export async function updateRoomDescription(
  roomId: RoomId,
  description: string
): Promise<void> {
  const clean = sanitize(description);
  assertMaxLength(clean, INPUT_LIMITS.DESCRIPTION, 'Deskripsi');

  await update(ref(db, `${DEVICE_PATH}/rooms/${roomId}`), {
    description: clean,
  });
}

/**
 * Update label ruangan.
 */
export async function updateRoomLabel(
  roomId: RoomId,
  label: string
): Promise<void> {
  const clean = sanitize(label);
  if (!clean) throw new Error('Label tidak boleh kosong');
  assertMaxLength(clean, INPUT_LIMITS.LABEL, 'Label');

  await update(ref(db, `${DEVICE_PATH}/rooms/${roomId}`), {
    label: clean,
  });
}

/**
 * Update ikon ruangan (hanya nilai yang diizinkan).
 */
export async function updateRoomIcon(
  roomId: RoomId,
  icon: string
): Promise<void> {
  if (!ALLOWED_ICONS.includes(icon as typeof ALLOWED_ICONS[number])) {
    throw new Error(`Ikon "${icon}" tidak diizinkan`);
  }
  await update(ref(db, `${DEVICE_PATH}/rooms/${roomId}`), { icon });
}

// ── Sensor data (ditulis oleh ESP32, bisa juga ditest dari sini) ──

/**
 * Tambahkan entri history baru.
 * Dipakai oleh ESP32 atau untuk testing.
 */
export async function pushHistoryEntry(entry: HistoryEntry): Promise<void> {
  // Validasi tipe data dasar
  if (!['A', 'B', 'C'].includes(entry.room)) {
    throw new Error(`Room ID tidak valid: ${entry.room}`);
  }
  if (typeof entry.temp !== 'number' || entry.temp < -40 || entry.temp > 80) {
    throw new Error(`Suhu tidak valid: ${entry.temp}`);
  }
  if (typeof entry.humidity !== 'number' || entry.humidity < 0 || entry.humidity > 100) {
    throw new Error(`Kelembapan tidak valid: ${entry.humidity}`);
  }

  await push(ref(db, `${DEVICE_PATH}/history`), entry);
}

/**
 * Hapus data history dari Firebase, tapi sisakan 2 data terakhir per ruangan.
 * (Agar grafik dan riwayat tidak kosong melompong)
 */
export async function clearAllHistory(): Promise<void> {
  const { ref, get, set, query, orderByChild, limitToLast } = await import('firebase/database');
  
  const rooms = ['A', 'B', 'C'];
  const newHistory: Record<string, any> = { A: {}, B: {}, C: {} };
  
  for (const r of rooms) {
    const q = query(
      ref(db, `${DEVICE_PATH}/history/${r}`),
      orderByChild('timestamp'),
      limitToLast(2)
    );
    const snap = await get(q);
    if (snap.exists()) {
      newHistory[r] = snap.val();
    }
  }

  // Timpa node history dengan data yang disisakan
  await set(ref(db, `${DEVICE_PATH}/history`), newHistory);
}
