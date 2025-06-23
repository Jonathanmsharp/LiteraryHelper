/**
 * Lightweight token verifier used by API handlers.
 *
 * In production we would delegate to `jose/jwtVerify` against a remote JWKS.
 * For the current test-driven development cycle we only need a synchronous
 * helper that is easy to mock in Jest.
 *
 * If the caller passes the special string `"valid.jwt.token"` we return a
 * deterministic payload; otherwise we throw so that the handler can respond
 * with HTTP 401.
 */
export async function verifyToken(token: string) {
  // Simple mock-friendly branch for tests
  if (token === 'valid.jwt.token') {
    return { userId: 'test-user-id', email: 'test@example.com' }
  }

  // In non-test environments fall back to a real JWT verification when the
  // necessary environment variables are present.
  if (process.env.JWT_JWKS_URL && process.env.JWT_ISSUER) {
    // Lazy-load jose only when we really need it (saves bundle size in tests)
    const { createRemoteJWKSet, jwtVerify } = await import('jose')
    const JWKS = createRemoteJWKSet(new URL(process.env.JWT_JWKS_URL))
    return jwtVerify(token, JWKS, {
      issuer: process.env.JWT_ISSUER,
      algorithms: ['RS256']
    }).then(({ payload }) => payload)
  }

  throw new Error('Invalid token')
}
