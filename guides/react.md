# React / Next.js + MyEQ

Integrate MyEQ into React with
[`react-oidc-context`](https://github.com/authts/react-oidc-context) (a thin
wrapper over `oidc-client-ts`). Public client, Authorization Code + PKCE.

## 1. Prerequisites

A **public** `client_id` from EQ ([Getting access](../README.md#-getting-access)),
with your redirect URI registered, e.g. `http://localhost:3000/auth/callback`.

## 2. Install

```bash
npm install react-oidc-context oidc-client-ts
```

## 3. Provider setup

```tsx
// src/main.tsx
import { AuthProvider } from 'react-oidc-context'
import { WebStorageStateStore } from 'oidc-client-ts'

const oidcConfig = {
  authority: import.meta.env.VITE_OIDC_AUTHORITY, // https://auth.europequalitegroup.com
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
  redirect_uri: `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  response_type: 'code', // PKCE (S256) automatic
  scope: 'openid profile email',
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  // Clean the ?code & ?state out of the URL after the callback
  onSigninCallback: () =>
    window.history.replaceState({}, document.title, window.location.pathname),
}

createRoot(document.getElementById('root')!).render(
  <AuthProvider {...oidcConfig}>
    <App />
  </AuthProvider>,
)
```

## 4. Use it

```tsx
import { useAuth } from 'react-oidc-context'

export function App() {
  const auth = useAuth()

  if (auth.isLoading) return <p>Loading…</p>
  if (auth.error) return <p>Error: {auth.error.message}</p>

  if (!auth.isAuthenticated) {
    return <button onClick={() => void auth.signinRedirect()}>Sign in with MyEQ</button>
  }

  return (
    <>
      <p>Hello {auth.user?.profile.name}</p>
      <button onClick={() => void auth.signoutRedirect()}>Sign out</button>
    </>
  )
}
```

`react-oidc-context` processes the redirect callback automatically when the app
mounts on the `redirect_uri` path, so no dedicated callback component is needed
for an SPA. Style the button with [`src/signin-button.css`](../src/signin-button.css).

## 5. Protecting routes

```tsx
import { useAuth, hasAuthParams } from 'react-oidc-context'
import { useEffect } from 'react'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  useEffect(() => {
    if (!hasAuthParams() && !auth.isAuthenticated && !auth.isLoading) {
      void auth.signinRedirect()
    }
  }, [auth.isAuthenticated, auth.isLoading])
  return auth.isAuthenticated ? <>{children}</> : null
}
```

## 6. Calling an API

```tsx
const auth = useAuth()
await fetch('/api/things', {
  headers: { Authorization: `Bearer ${auth.user?.access_token}` },
})
```

The access token is **opaque**; your API validates it by introspection —
[node-resource-server.md](node-resource-server.md).

## 7. Refresh & logout

- **Refresh** — add `offline_access` to `scope` and set
  `automaticSilentRenew: true` in `oidcConfig`. MyEQ rotates refresh tokens;
  the library swaps them transparently.
- **Logout** — `auth.signoutRedirect()` hits `/oidc/end-session` and returns to
  `post_logout_redirect_uri`.

## Next.js note

For the **App Router** with server components, browser-only `react-oidc-context`
isn't enough — handle the code exchange in a route handler (server side) and keep
the session in an HttpOnly cookie, or use a library such as
[`@auth/core`](https://authjs.dev) configured with a **custom OIDC provider**
pointing at the discovery URL. The configuration values (authority, client_id,
scopes, PKCE) are identical; only where the exchange runs changes. A confidential
client + secret is recommended for server-side Next.js.
