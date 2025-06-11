import { jwtVerify } from 'jose'

export async function verifyToken(req: NextApiRequest) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) throw new Error('Missing token')

  const token = auth.split(' ')[1]
  const JWKS = createRemoteJWKSet(new URL(process.env.JWT_JWKS_URL!))
  
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: process.env.JWT_ISSUER!,
    algorithms: ['RS256'],
  })

  return payload
}
