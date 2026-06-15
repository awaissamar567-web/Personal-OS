'use server';

import { cookies } from 'next/headers';

export async function loginAction(password: string) {
  if (password === 'Awais{7650}') {
    const cookieStore = await cookies();
    cookieStore.set('operator_session', 'active', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return { success: true };
  }

  return { error: 'Invalid security key' };
}

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.set('operator_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // delete immediately
  });
  return { success: true };
}
