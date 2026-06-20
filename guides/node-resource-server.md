# Node API as a resource server + MyEQ

Protect a Node API with MyEQ access tokens.

> **Important:** MyEQ issues **opaque** access tokens (reference tokens), **not**
> JWTs. You **cannot** decode or verify them with `jose`/JWKS — you validate them
> by calling the **introspection endpoint** (RFC 7662). `jose` is still the tool
> to verify the **ID token** (a JWT), shown at the end.

## 1. Prerequisites

A **confidential** client from EQ ([Getting access](../README.md#-getting-access))
— a `client_id` **and a `client_secret`** — because introspection requires the
caller to authenticate as a client. Keep the secret server-side only.

```bash
npm install express        # or your framework of choice
```

```
# .env (server-side, never shipped to the browser)
OIDC_ISSUER=https://auth.europequalitegroup.com
OIDC_CLIENT_ID=my-api
OIDC_CLIENT_SECRET=••••••••
```

## 2. Discover the introspection endpoint

```ts
// discovery.ts
let cache: Record<string, string> | undefined
export async function endpoints() {
  if (cache) return cache
  const res = await fetch(`${process.env.OIDC_ISSUER}/.well-known/openid-configuration`)
  const doc = await res.json()
  cache = doc
  return doc as { introspection_endpoint: string; jwks_uri: string; issuer: string }
}
```

## 3. Introspection middleware

```ts
// requireAuth.ts
import type { Request, Response, NextFunction } from 'express'
import { endpoints } from './discovery'

// Small cache so we don't introspect the same token on every request.
const seen = new Map<string, { exp: number; token: IntrospectionResult }>()

interface IntrospectionResult {
  active: boolean
  sub?: string
  scope?: string
  client_id?: string
  exp?: number
  [claim: string]: unknown
}

async function introspect(token: string): Promise<IntrospectionResult> {
  const now = Math.floor(Date.now() / 1000)
  const hit = seen.get(token)
  if (hit && hit.exp > now) return hit.token

  const { introspection_endpoint } = await endpoints()
  const basic = Buffer.from(
    `${process.env.OIDC_CLIENT_ID}:${process.env.OIDC_CLIENT_SECRET}`,
  ).toString('base64')

  const res = await fetch(introspection_endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ token, token_type_hint: 'access_token' }),
  })
  const data = (await res.json()) as IntrospectionResult
  if (data.active && data.exp) seen.set(token, { exp: data.exp, token: data })
  return data
}

export function requireAuth(...requiredScopes: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'missing_token' })

    const result = await introspect(header.slice(7))
    if (!result.active) return res.status(401).json({ error: 'invalid_token' })

    const granted = new Set((result.scope ?? '').split(' '))
    if (!requiredScopes.every((s) => granted.has(s))) {
      return res.status(403).json({ error: 'insufficient_scope' })
    }

    ;(req as Request & { user: IntrospectionResult }).user = result
    next()
  }
}
```

## 4. Protect routes

```ts
import express from 'express'
import { requireAuth } from './requireAuth'

const app = express()

app.get('/api/me', requireAuth('openid'), (req, res) => {
  const user = (req as any).user
  res.json({ sub: user.sub, scope: user.scope })
})

app.get('/api/employees', requireAuth('erp:employee'), (req, res) => {
  res.json({ ok: true })
})

app.listen(8080)
```

## 5. Need richer user claims?

Introspection returns the token’s scope and `sub`. For the full claim set, call
**UserInfo** with the same Bearer token:

```ts
const { userinfo_endpoint } = await endpoints() // from discovery
const claims = await fetch(userinfo_endpoint, {
  headers: { Authorization: `Bearer ${accessToken}` },
}).then((r) => r.json())
```

## 6. Caching & revocation

Cache introspection results until the token’s `exp` (done above). Tokens are
short-lived (**15 min**), so a revoked or expired token stops working quickly.
For immediate revocation checks, drop the cache or shorten its window.

## 7. Verifying an ID token with `jose` (JWT)

If your service instead receives an **ID token** (a JWT, RS256), verify it
against the JWKS — this is where `jose` fits:

```ts
import { jwtVerify, createRemoteJWKSet } from 'jose'

const ISSUER = process.env.OIDC_ISSUER!
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/oidc/jwks`))

export async function verifyIdToken(idToken: string, audience: string) {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: ISSUER,
    audience, // your client_id
  })
  return payload // sub, name, email, …
}
```

Use this only for ID tokens. **Access tokens are opaque** — always introspect
them.

> JWT access tokens (decodable directly with `jose`) are not issued today. If a
> future EQ change enables them, the discovery document’s
> `introspection_endpoint` stays valid, so introspection-based services keep
> working unchanged.
