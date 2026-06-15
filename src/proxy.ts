import { NextResponse, type NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const session = request.cookies.get('operator_session')?.value;
  const isAuthenticated = session === 'active';
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  // If not authenticated and not on login page, redirect to /login
  if (!isAuthenticated && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If authenticated and tries to hit /login, redirect to /dashboard
  if (isAuthenticated && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next (Next.js internal assets, static files, and HMR hot-reloads)
     * - api (API endpoints)
     * - favicon.ico (favicon file)
     */
    '/((?!_next|api|favicon.ico).*)',
  ],
};
