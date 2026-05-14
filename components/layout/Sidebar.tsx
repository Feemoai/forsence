'use client';
import { useState }      from 'react';
import Link              from 'next/link';
import { usePathname }   from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, History, Download,
  Sparkles, Cpu, ChevronRight, Menu, X,
} from 'lucide-react';

const NAV = [
  { href: '/',        label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/history', label: 'History',     icon: History         },
  { href: '/export',  label: 'Export Data', icon: Download        },
  { href: '/ai',      label: 'Monrun AI',   icon: Sparkles        },
];

// ── Isi nav (shared antara desktop & mobile drawer) ──────────────
function NavItems({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} onClick={onClose}>
            <motion.div
              whileHover={{ x: 2 }}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                transition-all duration-150 cursor-pointer relative
                ${active
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }
              `}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="font-medium">{label}</span>
              {active && <ChevronRight className="w-3 h-3 ml-auto text-cyan-400/60" />}
              {label === 'Monrun AI' && !active && (
                <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 font-medium">
                  AI
                </span>
              )}
            </motion.div>
          </Link>
        );
      })}
    </nav>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
        <Cpu className="w-4 h-4 text-cyan-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">Monrun</p>
        <p className="text-[10px] text-white/40 leading-none">IoT Dashboard</p>
      </div>
    </div>
  );
}

// ── Mobile bottom nav bar ────────────────────────────────────────
function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#080e1d]/95 backdrop-blur border-t border-white/5 flex md:hidden">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} className="flex-1">
            <div className={`flex flex-col items-center gap-1 py-2 px-1 transition-colors ${
              active ? 'text-cyan-400' : 'text-white/40'
            }`}>
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium leading-none">{label}</span>
              {active && (
                <span className="w-1 h-1 rounded-full bg-cyan-400" />
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

// ── Desktop Sidebar ──────────────────────────────────────────────
export function Sidebar() {
  return (
    <>
      {/* Desktop: sidebar kiri */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-white/5 bg-[#080e1d]">
        <div className="px-5 py-5 border-b border-white/5">
          <Logo />
        </div>
        <NavItems />
        <div className="px-5 py-4 border-t border-white/5">
          <p className="text-[10px] text-white/20">ESP32 v4.2 • 3 Ruangan</p>
        </div>
      </aside>

      {/* Mobile: top bar + bottom nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#080e1d]/95 backdrop-blur border-b border-white/5 px-4 py-3">
        <Logo />
      </div>
      <MobileNav />
    </>
  );
}
