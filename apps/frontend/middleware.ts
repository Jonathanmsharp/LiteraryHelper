import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Simplified Next.js middleware for demo mode
 * 
 * This middleware:
 * 1. Allows all requests to pass through
 * 2. Sets demo mode headers for API routes
 * 3. Enables demo functionality without authentication
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Skip middleware for static assets
  if (
    path.startsWith('/_next') || 
    path.startsWith('/public') ||
    path.includes('.')
  ) {
    return NextResponse.next();
  }

  // For API routes, set demo mode headers
  if (path.startsWith('/api')) {
    const response = NextResponse.next();
    response.headers.set('x-auth-user-id', 'demo-user');
    response.headers.set('x-auth-session-id', 'demo-session');
    response.headers.set('x-auth-demo-mode', 'true');
    return response;
  }
  
  // Allow all other requests to continue
  return NextResponse.next();
}

// Configure which routes this middleware will run on
export const config = {
  matcher: [
    // Apply to all routes except public assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
