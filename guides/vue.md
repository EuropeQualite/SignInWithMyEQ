# Vue 3 + MyEQ

Integrate MyEQ into a Vue 3 (Vite) SPA with
[`oidc-client-ts`](https://github.com/authts/oidc-client-ts), wrapped in a small
composable. Public client, Authorization Code + PKCE — no backend, no secret.

> New to the flow? The [demo in this repo](../README.md) is the vanilla version
> of everything below.

## 1. Prerequisites

A **public** `client_id` from EQ ([Getting access](../README.md#-getting-access))
with these redirect URIs registered:

- `http://localhost:5173/auth/callback` (dev)
- `https://yourapp.example.com/auth/callback` (prod)

## 2. Install

```bash
npm install oidc-client-ts
```

## 3. The auth service

```ts
// src/auth.ts
import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts'

export const userManager = new UserManager({
  authority: import.meta.env.VITE_OIDC_AUTHORITY, // https://auth.europequalitegroup.com
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID,
  redirect_uri: `${location.origin}/auth/callback`,
  post_logout_redirect_uri: `${location.origin}/`,
  response_type: 'code', // PKCE (S256) is enabled automatically
  scope: 'openid profile email',
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
})

export const signIn = (returnTo = location.pathname) =>
  userManager.signinRedirect({ state: { returnTo } })
export const signOut = () => userManager.signoutRedirect()
export const getUser = (): Promise<User | null> => userManager.getUser()
```

## 4. The composable

```ts
// src/useAuth.ts
import { ref, computed } from 'vue'
import type { User } from 'oidc-client-ts'
import { userManager, signIn, signOut } from './auth'

const user = ref<User | null>(null)
userManager.getUser().then((u) => (user.value = u))
userManager.events.addUserLoaded((u) => (user.value = u))
userManager.events.addUserUnloaded(() => (user.value = null))

export function useAuth() {
  return {
    user,
    isAuthenticated: computed(() => !!user.value && !user.value.expired),
    claims: computed(() => user.value?.profile ?? null),
    accessToken: computed(() => user.value?.access_token ?? null),
    signIn,
    signOut,
  }
}
```

## 5. The callback route

```ts
// src/views/AuthCallback.vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { userManager } from '../auth'

const router = useRouter()
onMounted(async () => {
  const u = await userManager.signinRedirectCallback()
  const returnTo = (u.state as { returnTo?: string } | undefined)?.returnTo
  router.replace(returnTo ?? '/')
})
</script>

<template><p>Signing you in…</p></template>
```

```ts
// src/router.ts — register the callback (and silent-renew if you add it)
{ path: '/auth/callback', component: () => import('./views/AuthCallback.vue') }
```

## 6. Use it in a component

```vue
<script setup lang="ts">
import { useAuth } from '../useAuth'
const { isAuthenticated, claims, signIn, signOut } = useAuth()
</script>

<template>
  <button v-if="!isAuthenticated" @click="signIn()">Sign in with MyEQ</button>
  <template v-else>
    <p>Hello {{ claims?.name }}</p>
    <button @click="signOut()">Sign out</button>
  </template>
</template>
```

Use [`src/signin-button.css`](../src/signin-button.css) from this repo for the
branded button.

## 7. Route guard (optional)

```ts
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true
  const u = await userManager.getUser()
  if (u && !u.expired) return true
  await signIn(to.fullPath)
  return false
})
```

## 8. Calling an API

Send the access token as a Bearer header:

```ts
const { accessToken } = useAuth()
await fetch('/api/things', { headers: { Authorization: `Bearer ${accessToken.value}` } })
```

The access token is **opaque** — your API validates it by introspection, see
[node-resource-server.md](node-resource-server.md).

## 9. Refresh & logout

- **Refresh** — with `offline_access` in scope, enable silent renewal by setting
  `automaticSilentRenew: true` and a `silent_redirect_uri` page that calls
  `userManager.signinSilentCallback()`. MyEQ **rotates** refresh tokens, which
  `oidc-client-ts` handles transparently.
- **Logout** — `signOut()` redirects to `/oidc/end-session` and back to your
  `post_logout_redirect_uri`.

## Notes

- Tokens live in `sessionStorage` here. For stricter requirements use a
  server-side (confidential) client or a BFF with HttpOnly cookies.
- Prefer the framework-agnostic `oidc-client-ts` over abstractions so you control
  the storage and renewal model.
