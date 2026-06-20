# Mobile (AppAuth) + MyEQ

Integrate MyEQ in native mobile apps with **AppAuth** — Authorization Code +
PKCE in an in-app browser tab (SFSafariViewController / Chrome Custom Tabs).
Public client, no secret. Examples use
[`react-native-app-auth`](https://github.com/FormidableLabs/react-native-app-auth);
native pointers at the end.

## 1. Prerequisites

A **public** `client_id` from EQ ([Getting access](../README.md#-getting-access))
with a **native redirect URI** registered — either a custom scheme or an
App Link / Universal Link, e.g.:

- `com.yourapp:/oauth2redirect` (custom scheme), or
- `https://yourapp.example.com/oauth2redirect` (App Link / Universal Link)

PKCE is mandatory and is **on by default** in AppAuth.

## 2. Install (React Native)

```bash
npm install react-native-app-auth
cd ios && pod install && cd ..
```

Register the redirect scheme: iOS → `CFBundleURLSchemes` in `Info.plist`;
Android → `appAuthRedirectScheme` manifest placeholder in `build.gradle`. See the
library README for the exact snippets.

## 3. Configure

```ts
// auth.ts
import { authorize, refresh, logout } from 'react-native-app-auth'

export const config = {
  issuer: 'https://auth.europequalitegroup.com', // endpoints auto-discovered
  clientId: 'my-mobile-app',
  redirectUrl: 'com.yourapp:/oauth2redirect',
  scopes: ['openid', 'profile', 'email', 'offline_access'],
  // usePKCE defaults to true — keep it.
}
```

AppAuth reads `/.well-known/openid-configuration` from `issuer` automatically.

## 4. Sign in

```ts
import { authorize } from 'react-native-app-auth'
import { config } from './auth'

export async function signIn() {
  const result = await authorize(config)
  // result.accessToken, result.idToken, result.refreshToken,
  // result.accessTokenExpirationDate, result.tokenAdditionalParameters
  await saveTokensSecurely(result) // Keychain (iOS) / Keystore (Android)
  return result
}
```

Store tokens in the **platform secure store** (Keychain / Keystore), never in
plain `AsyncStorage`.

## 5. Call an API

```ts
await fetch('https://api.example.com/things', {
  headers: { Authorization: `Bearer ${accessToken}` },
})
```

The access token is **opaque** (15 min); your API validates it by introspection —
[node-resource-server.md](node-resource-server.md).

## 6. Refresh

```ts
import { refresh } from 'react-native-app-auth'

const result = await refresh(config, { refreshToken })
// MyEQ ROTATES refresh tokens — persist result.refreshToken and drop the old one.
await saveTokensSecurely(result)
```

Refresh tokens last **12 h** and are single-use (rotation + reuse detection):
always save the new `refreshToken` returned by `refresh()`.

## 7. Logout

```ts
import { logout } from 'react-native-app-auth'

await logout(config, {
  idToken, // from the original authorize() result
  postLogoutRedirectUrl: 'com.yourapp:/logout',
})
```

`postLogoutRedirectUrl` must be registered with EQ.

## Native (without React Native)

The flow is identical; use the platform SDK:

- **iOS** — [AppAuth-iOS](https://github.com/openid/AppAuth-iOS):
  `OIDAuthState.authState(byPresenting:)` after
  `OIDAuthorizationService.discoverConfiguration(forIssuer:)`.
- **Android** — [AppAuth-Android](https://github.com/openid/AppAuth-Android):
  `AuthorizationServiceConfiguration.fetchFromIssuer(...)` then
  `AuthorizationRequest.Builder(...)` (PKCE added automatically).

In both, set the issuer to `https://auth.europequalitegroup.com`, use
`response_type=code`, your registered redirect URI, and the scopes above.

## Notes

- Use the system browser tab (the AppAuth default) — **not** a `WebView`. MyEQ,
  like most IdPs, is built for the secure in-app browser pattern.
- Public client: no `client_secret` ships in the app; PKCE is the protection.
