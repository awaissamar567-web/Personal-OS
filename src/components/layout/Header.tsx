'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Heart, 
  DollarSign, 
  Briefcase, 
  CheckSquare, 
  BookOpen, 
  Users, 
  Compass, 
  Book, 
  Sparkles,
  Menu as MenuIcon,
  X as CloseIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Health', href: '/health', icon: Heart },
  { name: 'Wealth', href: '/wealth', icon: DollarSign },
  { name: 'Work', href: '/work', icon: Briefcase },
  { name: 'Habits', href: '/habits', icon: CheckSquare },
  { name: 'Growth', href: '/growth', icon: BookOpen },
  { name: 'Relationships', href: '/relationships', icon: Users },
  { name: 'Vision', href: '/vision', icon: Compass },
  { name: 'Journal', href: '/journal', icon: Book },
  { name: 'AI Coach', href: '/coach', icon: Sparkles },
];

const titleMap: Record<string, { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  '/dashboard': { title: 'DASHBOARD', subtitle: 'System Status Overview', icon: LayoutDashboard, color: 'text-indigo-400' },
  '/health': { title: 'HEALTH LOGS', subtitle: 'Vitals & Physiological Metrics', icon: Heart, color: 'text-emerald-400' },
  '/wealth': { title: 'WEALTH MATRIX', subtitle: 'Assets, Income & Balances', icon: DollarSign, color: 'text-violet-400' },
  '/work': { title: 'WORK & PRODUCTIVITY', subtitle: 'Deep Work Hours & Output', icon: Briefcase, color: 'text-blue-400' },
  '/habits': { title: 'HABIT LOOP', subtitle: 'Daily Routine Trackers', icon: CheckSquare, color: 'text-amber-400' },
  '/growth': { title: 'INTELLECTUAL GROWTH', subtitle: 'Readings, Skills & Courses', icon: BookOpen, color: 'text-amber-400' },
  '/relationships': { title: 'RELATIONS & NETWORK', subtitle: 'CRM & Key Interactions', icon: Users, color: 'text-rose-400' },
  '/vision': { title: 'VISION BOARD', subtitle: 'Manifesto & Core Goals', icon: Compass, color: 'text-indigo-400' },
  '/journal': { title: 'DEEP JOURNAL', subtitle: 'Morning & Night Reflections', icon: Book, color: 'text-indigo-400' },
  '/coach': { title: 'AI COACHING', subtitle: 'Analytical Optimization Engine', icon: Sparkles, color: 'text-purple-400' },
};

export default function Header() {
  const pathname = usePathname();
  const [currentDate, setCurrentDate] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentDate(formatDate(new Date()));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Find matching path
  const match = Object.keys(titleMap).find(key => pathname === key || pathname.startsWith(key + '/'));
  const info = match ? titleMap[match] : { title: 'PERSONAL OS', subtitle: 'Core Control Unit', icon: LayoutDashboard, color: 'text-white' };
  const Icon = info.icon;

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-[#1f1f1f] bg-[#0a0a0a] px-6 py-4">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${info.color}`} />
          <div>
            <h2 className="text-sm font-bold tracking-wider text-white md:text-base">
              {info.title}
            </h2>
            <p className="hidden text-xs text-muted md:block">{info.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block rounded-md border border-[#1f1f1f] bg-[#111111] px-3 py-1 text-xs font-semibold text-[#888888]">
            {currentDate || 'Loading...'}
          </div>

          {/* Menu Toggle Button for mobile */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1f1f1f] bg-[#111111] text-xs font-bold text-white hover:bg-neutral-800 transition duration-200"
          >
            <MenuIcon className="h-3.5 w-3.5" />
            <span>NAVIGATE</span>
          </button>
        </div>
      </header>

      {/* Navigation Overlay (Bottom Sheet) */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black md:hidden"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-[#1f1f1f] bg-[#0c0c0c] p-6 pb-8 shadow-2xl md:hidden max-h-[85vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-sm font-black tracking-wider text-white uppercase">System Core</h4>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">Control Navigation</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg border border-[#1f1f1f] bg-[#111111] text-neutral-400 hover:text-white transition duration-200"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Navigation Grid */}
              <div className="grid grid-cols-2 gap-3">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-3 p-4 rounded-xl border text-center transition-all duration-300",
                        isActive
                          ? "bg-[#111111] text-white border-indigo-500 shadow-md shadow-indigo-500/5"
                          : "bg-[#0f0f0f] text-neutral-400 border-[#1f1f1f] hover:border-neutral-700 hover:text-white"
                      )}
                    >
                      <Icon className={cn(
                        "h-6 w-6 transition-colors duration-300",
                        isActive ? "text-indigo-400" : "text-[#555555]"
                      )} />
                      <span className="text-xs font-bold tracking-wider">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
