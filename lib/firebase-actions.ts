// ================================================================
// lib/firebase-actions.ts — Semua operasi WRITE ke Firebase
// (Separation of Concerns: komponen hanya panggil fungsi ini)
// ================================================================

import { ref, update, push, set }   from 'firebase/database';
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

export async function addFakeHistory(room: RoomId) {
  const fakeEntry: HistoryEntry = {
    room,
    temp: 20 + Math.random() * 10,
    humidity: 40 + Math.random() * 20,
    heatIndex: 25 + Math.random() * 5,
    comfort: "Nyaman",
    timestamp: Date.now() / 1000
  };

  const path = `${DEVICE_PATH}/history/${room}`;
  await push(ref(db, path), fakeEntry);
}

// ── Remote Command Actions ──────────────────────────────────────

export async function sendActiveRoomCommand(room: string) {
  if (!['A', 'B', 'C'].includes(room)) {
    throw new Error('Room tidak valid. Harus A, B, atau C');
  }
  const path = `${DEVICE_PATH}/command/activeRoom`;
  await set(ref(db, path), room);
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

// ── Remote WiFi Control ─────────────────────────────────────────

/**
 * Kirim perintah matikan WiFi ke ESP32 melalui Firebase.
 * ESP32 polling /commands tiap 10 detik.
 * Setelah WiFi mati, harus 4x tap fisik untuk menyalakan kembali.
 */
export async function sendWifiOffCommand(): Promise<void> {
  await update(ref(db, `${DEVICE_PATH}/commands`), {
    wifiOff: true,
  });
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
