import { ClerkProvider } from '@clerk/nextjs'
import type { AppProps } from 'next/app'

export default function MyApp({ Component, pageProps }: AppProps) {
  // Make Clerk optional if not configured
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  
  if (!publishableKey || publishableKey === 'your_publishable_key_here') {
    // No Clerk configured, run without auth
    console.warn('[_app] Clerk not configured, running without authentication')
    return <Component {...pageProps} />
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <Component {...pageProps} />
    </ClerkProvider>
  )
}
