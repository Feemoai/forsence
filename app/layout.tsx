import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar }   from '@/components/layout/Sidebar';
import { AppShell } from '@/components/AppShell';
import { Analytics } from '@vercel/analytics/react';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'FORSENCE — IoT Monitoring Dashboard',
  description: 'Real-time ESP32 environmental monitoring — FORSENCE v2.4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="bg-[#070d1a] text-white antialiased">
        <AppShell>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 min-h-0 overflow-y-auto
              pt-[56px] pb-[64px]
              md:pt-0    md:pb-0">
              {children}
            </main>
          </div>
        </AppShell>
        <Analytics />
      </body>
    </html>
  );
}
