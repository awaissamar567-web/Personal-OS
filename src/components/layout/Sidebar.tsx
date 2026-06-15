'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  LogOut 
} from 'lucide-react';
import { signOutAction } from '@/app/login/actions';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, glowClass: 'glow-vision', hoverColor: 'hover:text-indigo-400' },
  { name: 'Health', href: '/health', icon: Heart, glowClass: 'glow-health', hoverColor: 'hover:text-emerald-400' },
  { name: 'Wealth', href: '/wealth', icon: DollarSign, glowClass: 'glow-wealth', hoverColor: 'hover:text-violet-400' },
  { name: 'Work', href: '/work', icon: Briefcase, glowClass: 'glow-work', hoverColor: 'hover:text-blue-400' },
  { name: 'Habits', href: '/habits', icon: CheckSquare, glowClass: 'glow-growth', hoverColor: 'hover:text-amber-400' },
  { name: 'Growth', href: '/growth', icon: BookOpen, glowClass: 'glow-growth', hoverColor: 'hover:text-amber-400' },
  { name: 'Relationships', href: '/relationships', icon: Users, glowClass: 'glow-relationships', hoverColor: 'hover:text-rose-400' },
  { name: 'Vision', href: '/vision', icon: Compass, glowClass: 'glow-vision', hoverColor: 'hover:text-indigo-400' },
  { name: 'Journal', href: '/journal', icon: Book, glowClass: 'glow-vision', hoverColor: 'hover:text-indigo-400' },
  { name: 'AI Coach', href: '/coach', icon: Sparkles, glowClass: 'glow-wealth', hoverColor: 'hover:text-purple-400' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const handleSignOut = async () => {
    await signOutAction();
    router.refresh();
    router.push('/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-[#1f1f1f] bg-[#0c0c0c] px-4 py-6 md:flex">
      {/* Brand Header */}
      <div className="mb-8 px-4">
        <h1 className="text-xl font-bold tracking-wider text-white">
          PERSONAL <span className="text-neutral-500">OS</span>
        </h1>
        <p className="text-xs text-muted">Core Control Unit</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-300",
                isActive 
                  ? "bg-[#111111] text-white border border-[#1f1f1f] shadow-md shadow-black/40"
                  : "text-[#888888] hover:bg-[#111111]/50 hover:text-white"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 transition-colors duration-300",
                isActive ? "text-white" : "text-[#555555] group-hover:text-neutral-300"
              )} />
              <span className="flex-1">{item.name}</span>
              {isActive && (
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  item.name === 'Health' && 'bg-emerald-500 shadow-[0_0_8px_#10b981]',
                  item.name === 'Wealth' && 'bg-violet-500 shadow-[0_0_8px_#8b5cf6]',
                  item.name === 'Work' && 'bg-blue-500 shadow-[0_0_8px_#3b82f6]',
                  (item.name === 'Habits' || item.name === 'Growth') && 'bg-amber-500 shadow-[0_0_8px_#f59e0b]',
                  item.name === 'Relationships' && 'bg-rose-500 shadow-[0_0_8px_#f43f5e]',
                  (item.name === 'Vision' || item.name === 'Journal' || item.name === 'Dashboard') && 'bg-indigo-500 shadow-[0_0_8px_#6366f1]',
                  item.name === 'AI Coach' && 'bg-purple-500 shadow-[0_0_8px_#a855f7]'
                )} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Sign Out */}
      <div className="border-t border-[#1f1f1f] pt-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-[#888888] hover:bg-[#111111] hover:text-white transition-all duration-300"
        >
          <LogOut className="h-4 w-4 text-[#555555]" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
