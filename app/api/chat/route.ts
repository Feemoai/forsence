import { NextRequest } from 'next/server';

export const runtime = 'edge'; // streaming lebih baik di edge runtime

const BASE_SYSTEM_PROMPT = `Kamu adalah FORSENCE AI — asisten cerdas untuk sistem monitoring ruangan berbasis IoT ESP32.

Kamu membantu pengguna menganalisis data sensor (suhu, kelembapan, heat index), memberikan rekomendasi kenyamanan ruangan, dan menjawab pertanyaan seputar kondisi ruangan terkini.

Konsep kenyamanan:
- Nyaman (< 27°C Heat Index)
- Waspada / Agak Panas (27 - 32°C Heat Index)
- Berbahaya / Panas! (32 - 40°C Heat Index)
- Ekstrem (> 40°C Heat Index)

Aturan Utama:
1. Jawab dalam bahasa Indonesia, aktif, profesional tapi ramah.
2. JANGAN PERNAH membocorkan arsitektur seperti "Firebase", "Next.js", "OpenRouter", atau "Monrun". Sebut dirimu "FORSENCE AI".
3. Jika pengguna meminta perbandingan atau detail banyak ruang, gunakan tabel markdown agar rapi.
4. Jangan halusinasi data. Berdasarkan data real-time di bawah ini, jawab pertanyaan user.`;

function buildSystemPrompt(deviceData: any) {
  if (!deviceData) {
    return BASE_SYSTEM_PROMPT + '\n\n[SISTEM SEDANG OFFLINE ATAU DATA REAL-TIME BELUM TERSEDIA]';
  }

  const roomA = deviceData.rooms?.A?.latest || { temp: '-', humidity: '-', heatIndex: '-', comfort: 'Tidak ada data' };
  const roomB = deviceData.rooms?.B?.latest || { temp: '-', humidity: '-', heatIndex: '-', comfort: 'Tidak ada data' };
  const roomC = deviceData.rooms?.C?.latest || { temp: '-', humidity: '-', heatIndex: '-', comfort: 'Tidak ada data' };

  return `${BASE_SYSTEM_PROMPT}

=== DATA SENSOR REAL-TIME SAAT INI ===
- Baterai ESP32: ${deviceData.battery ?? '-'}%
- Ruangan Aktif Terpantau: Room ${deviceData.activeRoom ?? '-'}

[Room A - ${deviceData.rooms?.A?.label || 'Ruangan A'}]
Suhu: ${roomA.temp}°C | Lembap: ${roomA.humidity}% | Heat Index: ${roomA.heatIndex}°C | Status: ${roomA.comfort}

[Room B - ${deviceData.rooms?.B?.label || 'Ruangan B'}]
Suhu: ${roomB.temp}°C | Lembap: ${roomB.humidity}% | Heat Index: ${roomB.heatIndex}°C | Status: ${roomB.comfort}

[Room C - ${deviceData.rooms?.C?.label || 'Ruangan C'}]
Suhu: ${roomC.temp}°C | Lembap: ${roomC.humidity}% | Heat Index: ${roomC.heatIndex}°C | Status: ${roomC.comfort}
======================================
`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key tidak ditemukan' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages, deviceData } = await req.json();
  const currentPrompt = buildSystemPrompt(deviceData);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Authorization':  `Bearer ${apiKey}`,
      'Content-Type':   'application/json',
      'HTTP-Referer':   'https://forsence.vercel.app',
      'X-Title':        'FORSENCE IoT Dashboard',
    },
    body: JSON.stringify({
      model:    'google/gemma-2-9b-it:free',
      messages: [
        { role: 'system', content: currentPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return new Response(JSON.stringify({ error: err }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Teruskan stream langsung ke client
  return new Response(response.body, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
