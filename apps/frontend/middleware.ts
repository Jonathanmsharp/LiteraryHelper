import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware for authentication and request processing
 * 
 * This middleware:
 * 1. Authenticates requests using Clerk (when configured)
 * 2. Attaches user data to the request for API routes
 * 3. Redirects unauthenticated users for protected routes
 */
export async function middleware(request: NextRequest) {
  let userId: string | null | undefined;
  let sessionId: string | null | undefined;

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
}

// Configure which routes this middleware will run on
export const config = {
  matcher: [
    // Apply to all routes except public assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
