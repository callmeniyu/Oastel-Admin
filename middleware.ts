import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Allow access to login page and static assets
  if (pathname === '/login' || 
      pathname.startsWith('/_next') || 
      pathname.startsWith('/images') || 
      pathname.startsWith('/icons') ||
      pathname.startsWith('/fonts')) {
    return NextResponse.next();
  }

  // For admin routes, we'll let the client-side auth handle it
  // since we're using localStorage for session management
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
