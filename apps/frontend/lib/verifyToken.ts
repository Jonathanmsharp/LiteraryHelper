import type { NextApiRequest } from 'next'
import { jwtVerify } from 'jose'

export async function verifyToken(req: NextApiRequest) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) throw new Error('Missing token')
  // Continue with your token verification logic
}
