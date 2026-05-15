import type { HistoryEntry, RoomId } from '@/types';

export function toCSV(data: HistoryEntry[]): string {
  const header = 'Timestamp,Room,Temperature (°C),Humidity (%),Heat Index (°C),Comfort\n';
  const rows = data.map((d) => {
    const ts = new Date(d.timestamp * 1000).toLocaleString('id-ID');
    return `"${ts}",${d.room},${d.temp},${d.humidity},${d.heatIndex},"${d.comfort}"`;
  });
  return header + rows.join('\n');
}

export function downloadCSV(data: HistoryEntry[], filename = 'monitoring_data.csv') {
  const blob = new Blob([toCSV(data)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJSON(data: HistoryEntry[], filename = 'monitoring_data.json') {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadPDF(data: HistoryEntry[], filename = 'monitoring_data.pdf') {
  // Dynamic import agar tidak memberatkan bundle Next.js saat initial load
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text('FORSENCE - IoT Monitoring Report', 14, 22);
  
  // Meta Info
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Exported on: ${new Date().toLocaleString('id-ID')}`, 14, 30);
  doc.text(`Total Entries: ${data.length}`, 14, 36);
  
  const tableData = data.map(d => [
    new Date(d.timestamp * 1000).toLocaleString('id-ID'),
    `Room ${d.room}`,
    `${d.temp}°C`,
    `${d.humidity}%`,
    `${d.heatIndex}°C`,
    d.comfort
  ]);

  autoTable(doc, {
    startY: 45,
    head: [['Timestamp', 'Room', 'Temp', 'Humidity', 'Heat Index', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [6, 182, 212] }, // cyan-500 equivalent
    styles: { fontSize: 9 },
  });

  doc.save(filename);
}

export function filterByDateRange(
  data: HistoryEntry[],
  from: Date | null,
  to: Date | null,
  room: RoomId | 'ALL'
): HistoryEntry[] {
  return data.filter((d) => {
    const ts = new Date(d.timestamp * 1000);
    if (room !== 'ALL' && d.room !== room) return false;
    if (from && ts < from) return false;
    if (to   && ts > to)   return false;
    return true;
  });
}
