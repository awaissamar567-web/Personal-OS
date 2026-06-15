import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import AppLayout from '@/components/layout/AppLayout';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Personal OS',
  description: 'Private productivity and life tracking dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full bg-[#0a0a0a] text-white antialiased font-sans">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
