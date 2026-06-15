import { createClient } from '@supabase/supabase-js';

const mockUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'awais@example.com',
  role: 'authenticated',
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const mockAuth = {
  getUser: async () => {
    return { data: { user: mockUser }, error: null };
  },
  getSession: async () => {
    // Return null session so the client falls back to the valid project anon key in headers
    return { data: { session: null }, error: null };
  },
  signInWithPassword: async ({ password }: any) => {
    if (password === 'Awais{7650}') {
      return { data: { user: mockUser, session: null }, error: null };
    }
    return { data: { user: null, session: null }, error: { message: 'Invalid password' } };
  },
  signOut: async () => {
    return { error: null };
  },
  onAuthStateChange: (callback: any) => {
    // Call with null to indicate signed out/no active session, forcing fallback to anon key
    setTimeout(() => {
      callback('SIGNED_OUT', null);
    }, 0);
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
};

export function createSupabaseClient() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    }
  );

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'auth') {
        return mockAuth;
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}
