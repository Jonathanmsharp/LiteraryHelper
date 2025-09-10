import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth, clerkClient } from '@clerk/nextjs/server';

/**
 * Next.js middleware for authentication and request processing
 * 
 * This middleware:
 * 1. Authenticates requests using Clerk
 * 2. Attaches user data to the request for API routes
 * 3. Redirects unauthenticated users for protected routes
 * 4. Allows demo mode for /api/analyze endpoint
 */
export async function middleware(request: NextRequest) {
  // Get auth data from Clerk
  const { userId, sessionId } = getAuth(request);
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
    // Allow /api/analyze to work in demo mode without authentication
    if (path === '/api/analyze' && !userId) {
      const response = NextResponse.next();
      // Set demo user ID for unauthenticated requests
      response.headers.set('x-auth-user-id', 'demo-user');
      response.headers.set('x-auth-session-id', 'demo-session');
      response.headers.set('x-auth-demo-mode', 'true');
      return response;
    }
    
    // For other API routes, require authentication
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // For authenticated requests, attach user data to headers
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