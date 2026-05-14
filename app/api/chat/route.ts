import { NextRequest } from 'next/server';

export const runtime = 'edge'; // streaming lebih baik di edge runtime

const SYSTEM_PROMPT = `Kamu adalah Monrun AI — asisten cerdas untuk sistem monitoring ruangan berbasis IoT ESP32.

Kamu membantu pengguna memahami data sensor (suhu, kelembapan, heat index), memberikan rekomendasi kenyamanan ruangan, dan menjawab pertanyaan seputar sistem monitoring ini.

Konteks sistem:
- 3 ruangan terpantau (A, B, C) dengan sensor DHT11
- Data update setiap 15 detik via Firebase Realtime Database
- Parameter: suhu (°C), kelembapan (%), heat index, comfort level
- Comfort level: Nyaman (<27°C HI), Waspada (27-32°C), Berbahaya (32-40°C), Ekstrem (>40°C)

Jawab dalam bahasa Indonesia, singkat dan informatif. Jika ditanya data real-time, jelaskan bahwa kamu tidak bisa akses langsung tapi user bisa lihat di dashboard.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key tidak ditemukan' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { messages } = await req.json();

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Authorization':  `Bearer ${apiKey}`,
      'Content-Type':   'application/json',
      'HTTP-Referer':   'https://monrun.vercel.app',
      'X-Title':        'Monrun IoT Dashboard',
    },
    body: JSON.stringify({
      model:    'inclusionai/ring-2.6-1t:free',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
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
