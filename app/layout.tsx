import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Monrun — IoT Monitoring Dashboard',
  description: 'Real-time ESP32 environmental monitoring dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="bg-[#070d1a] text-white antialiased">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto
            pt-[56px] pb-[64px]
            md:pt-0    md:pb-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
