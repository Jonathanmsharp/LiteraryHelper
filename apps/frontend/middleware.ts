import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware for authentication and request processing
 * 
 * This middleware:
 * 1. Checks if demo mode is enabled
 * 2. Authenticates requests using Clerk (when configured and demo mode is disabled)
 * 3. Attaches user data to the request for API routes
 * 4. Redirects unauthenticated users for protected routes
 */
export async function middleware(request: NextRequest) {
  try {
    let userId: string | null | undefined;
    let sessionId: string | null | undefined;

    // Demo-mode flags are read directly from env to avoid heavyweight config import
    const demoMode =
      process.env.ENABLE_DEMO_MODE === 'true' ||
      process.env.ALLOW_ANONYMOUS_ACCESS === 'true';

    console.log(`[middleware] Demo mode: ${demoMode ? 'ENABLED' : 'DISABLED'}`);

  // If demo mode is enabled, skip authentication checks
  if (demoMode) {
    console.log('[middleware] Demo mode active - allowing anonymous access');
    
    // For API routes in demo mode, we still want to set a demo user ID
    const path = request.nextUrl.pathname;
    if (path.startsWith('/api')) {
      const response = NextResponse.next();
      response.headers.set('x-auth-user-id', 'demo-user');
      response.headers.set('x-auth-session-id', 'demo-session');
      return response;
    }
    
    return NextResponse.next();
  }

  // Demo mode is disabled, proceed with Clerk authentication
  // Defensive initialisation – if Clerk isn't configured this must NOT throw
  try {
    const { getAuth } = await import('@clerk/nextjs/server');
    const auth = getAuth(request);
    userId = auth?.userId;
    sessionId = auth?.sessionId;
  } catch (err) {
    // Clerk not initialised / env-vars missing → run app in public-mode
    console.warn(
      '[middleware] Clerk authentication unavailable, continuing without auth check –',
      (err as Error)?.message ?? err
    );
    return NextResponse.next();
  }
  
  const path = request.nextUrl.pathname;
  
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

  } catch (err) {
    // In case of any unexpected error, do not block the request chain
    console.error('[middleware] Unexpected error – allowing request to proceed:', err);
    return NextResponse.next();
  }
}

// Configure which routes this middleware will run on
export const config = {
  matcher: [
    // Apply to all routes except public assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
