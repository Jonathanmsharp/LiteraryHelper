import { NextApiRequest } from 'next'
import { createRemoteJWKSet, jwtVerify } from 'jose'

const JWKS = createRemoteJWKSet(new URL(process.env.JWT_JWKS_URL!))

export async function verifyToken(req: NextApiRequest) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header')
  }

  const token = authHeader.split(' ')[1]
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: process.env.JWT_ISSUER!,
    algorithms: ['RS256'],
  })

  return payload
}
