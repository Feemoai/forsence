import { NextRequest } from 'next/server';

export const runtime = 'edge'; // streaming lebih baik di edge runtime

const BASE_SYSTEM_PROMPT = `Kamu adalah FORSENCE AI — asisten cerdas untuk sistem monitoring ruangan berbasis IoT ESP32.

Kamu membantu pengguna menganalisis data sensor (suhu, kelembapan, heat index), memberikan rekomendasi kenyamanan ruangan, membaca trend dari data history, dan menjawab pertanyaan seputar kondisi ruangan.

Konsep kenyamanan:
- Nyaman (< 27°C Heat Index)
- Waspada / Agak Panas (27 - 32°C Heat Index)
- Berbahaya / Panas! (32 - 40°C Heat Index)
- Ekstrem (> 40°C Heat Index)

Aturan Utama:
1. Jawab dalam bahasa Indonesia, aktif, ringkas, profesional tapi ramah.
2. JANGAN PERNAH membocorkan arsitektur (Firebase, Next.js, OpenRouter). Sebut dirimu "FORSENCE AI".
3. Analisis data history jika ada (tren naik/turun) untuk memberikan insight tambahan.
4. Jangan halusinasi data. Jawab berdasarkan data di bawah ini.
5. JANGAN gunakan format LaTeX matematika (seperti \\frac, $$, atau \\). Gunakan teks biasa saja (misal: a / b atau derajat Celcius).`;

function buildSystemPrompt(deviceData: any) {
  if (!deviceData) {
    return BASE_SYSTEM_PROMPT + '\n\n[SISTEM SEDANG OFFLINE ATAU DATA REAL-TIME BELUM TERSEDIA]';
  }

  const roomA = deviceData.rooms?.A?.latest || { temp: '-', humidity: '-', heatIndex: '-', comfort: 'Tidak ada data' };
  const roomB = deviceData.rooms?.B?.latest || { temp: '-', humidity: '-', heatIndex: '-', comfort: 'Tidak ada data' };
  const roomC = deviceData.rooms?.C?.latest || { temp: '-', humidity: '-', heatIndex: '-', comfort: 'Tidak ada data' };
  const activeRoom = deviceData.activeRoom ?? '-';

  // Ekstrak 5 history terakhir untuk active room
  let historyText = 'Tidak ada history untuk ruangan ini.';
  if (activeRoom !== '-' && deviceData.history && deviceData.history[activeRoom]) {
    const historyObj = deviceData.history[activeRoom];
    // Ambil nilai-nilai dari object (karena format Firebase adalah object dengan key random)
    const historyArr = Object.values(historyObj) as any[];
    // Urutkan berdasarkan timestamp descending (terbaru di atas)
    historyArr.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    // Ambil 5 data terbaru
    const latestHist = historyArr.slice(0, 5);
    
    historyText = latestHist.map((h, i) => {
      const timeStr = h.timestamp ? new Date(h.timestamp * 1000).toLocaleTimeString('id-ID') : 'Unknown';
      return `${timeStr} - Suhu: ${h.temp}°C, Lembap: ${h.humidity}%, HI: ${h.heatIndex}°C (${h.comfort})`;
    }).join('\n');
  }

  return `${BASE_SYSTEM_PROMPT}

=== DATA SENSOR REAL-TIME SAAT INI ===
- Baterai ESP32: ${deviceData.battery ?? '-'}%
- Ruangan Aktif Terpantau: Room ${activeRoom}

[Room A - ${deviceData.rooms?.A?.label || 'Ruangan A'}]
Suhu: ${roomA.temp}°C | Lembap: ${roomA.humidity}% | Heat Index: ${roomA.heatIndex}°C | Status: ${roomA.comfort}

[Room B - ${deviceData.rooms?.B?.label || 'Ruangan B'}]
Suhu: ${roomB.temp}°C | Lembap: ${roomB.humidity}% | Heat Index: ${roomB.heatIndex}°C | Status: ${roomB.comfort}

[Room C - ${deviceData.rooms?.C?.label || 'Ruangan C'}]
Suhu: ${roomC.temp}°C | Lembap: ${roomC.humidity}% | Heat Index: ${roomC.heatIndex}°C | Status: ${roomC.comfort}

=== DATA HISTORY TERBARU (ROOM ${activeRoom}) ===
${historyText}
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
      model:    'openai/gpt-oss-120b:free',
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
