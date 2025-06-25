import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';

/**
 * Next.js middleware for authentication and request processing
 * 
 * This middleware:
 * 1. Authenticates requests using Clerk
 * 2. Attaches user data to the request for API routes
 * 3. Redirects unauthenticated users for protected routes
 */
export async function middleware(request: NextRequest) {
  /* ------------------------------------------------------------------
   * TEMPORARY INITIAL-DEPLOYMENT OVERRIDE
   * ------------------------------------------------------------------
   * Until proper environment variables are set up in Vercel we run the
   * entire application in *demo* mode.  This bypasses Clerk/JWT checks
   * and prevents “401 Unauthorized” errors when typing in the editor.
   *
   * Once real authentication is configured simply set
   * `ALWAYS_DEMO_MODE` to `false` (or remove this block).
   * ------------------------------------------------------------------ */
  const ALWAYS_DEMO_MODE = true;

  const path = request.nextUrl.pathname;

  if (ALWAYS_DEMO_MODE) {
    // For API routes attach deterministic demo headers so downstream
    // handlers can still rely on a user-id being present.
    if (path.startsWith('/api')) {
      const res = NextResponse.next();
      res.headers.set('x-auth-user-id', 'demo-user');
      res.headers.set('x-auth-session-id', 'demo-session');
      return res;
    }

    // All other routes continue without auth checks.
    return NextResponse.next();
  }

  // Get auth data from Clerk
  const { userId, sessionId } = getAuth(request);
  
  // Skip authentication for public routes
  if (
    path === '/' || 
    path.startsWith('/_next') || 
    path.startsWith('/api/auth') ||
    path.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  // For API routes, check authentication
  if (path.startsWith('/api')) {
    // If not authenticated, return 401
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // For authenticated requests, attach user data to headers
    // This will be available in the API route handlers
    const response = NextResponse.next();
    response.headers.set('x-auth-user-id', userId);
    if (sessionId) {
      response.headers.set('x-auth-session-id', sessionId);
    }
    
    return response;
  }
  
  // For protected pages, redirect to sign-in if not authenticated
  if (!userId) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', request.url);
    return NextResponse.redirect(signInUrl);
  }
  
  // Allow authenticated requests to continue
  return NextResponse.next();
}

// Configure which routes this middleware will run on
export const config = {
  matcher: [
    // Apply to all routes except public assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
