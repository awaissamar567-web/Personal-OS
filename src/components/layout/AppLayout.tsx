'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

import Header from './Header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <div className="min-h-screen bg-[#0a0a0a] text-white">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <Sidebar />
      
      {/* Main Layout Area */}
      <div className="flex flex-1 flex-col md:pl-64 min-h-screen">
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

    </div>
  );
}
