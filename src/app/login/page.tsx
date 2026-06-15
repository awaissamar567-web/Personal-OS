'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { loginAction } from './actions';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await loginAction(password);

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.refresh();
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-xl border border-[#1f1f1f] bg-[#111111] p-8 shadow-2xl shadow-black/80"
      >
        <div className="mb-8 text-center">
          <h1 className="text-xl font-black tracking-wider text-white">
            PERSONAL <span className="text-neutral-500">OS</span>
          </h1>
          <p className="text-[10px] text-[#888] uppercase tracking-wider mt-1 font-semibold">Access Verification System</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#888]">
              Security Key / Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-[#1f1f1f] bg-[#0c0c0c] pl-4 pr-12 py-3 text-sm text-white outline-none transition duration-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white p-1 rounded transition duration-200"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-500 font-medium bg-red-950/10 border border-red-900/20 rounded-md p-2.5">
              Access Denied: {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white py-3 text-xs font-bold text-black hover:bg-neutral-200 active:scale-[0.98] transition duration-200 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center tracking-wider"
          >
            {loading ? 'VERIFYING KEY...' : 'INITIALIZE SYSTEM'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
