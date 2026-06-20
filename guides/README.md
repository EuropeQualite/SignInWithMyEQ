# MyEQ — RP integration guides

How to integrate **MyEQ** (the Europe Qualité OpenID Connect provider) as an
OAuth 2.0 / OIDC **Relying Party**, per stack. Every guide is end-to-end: client
configuration, discovery, PKCE, login, callback, using the tokens, refresh and
logout.

> The MyEQ provider itself is out of scope here — these guides only cover what an
> RP developer needs to plug in.

## Guides

| Stack | Guide |
| ----- | ----- |
| Vanilla JS / TypeScript (SPA) | [the demo in this repo](../README.md) |
| Vue 3 (`oidc-client-ts`) | [vue.md](vue.md) |
| React / Next.js (`react-oidc-context`) | [react.md](react.md) |
| Node API as a resource server | [node-resource-server.md](node-resource-server.md) |
| PHP (`league/oauth2-client`) | [php.md](php.md) |
| Mobile — iOS / Android / React Native (AppAuth) | [mobile.md](mobile.md) |

## Get access first

MyEQ is a **private** identity provider — there is no self-service registration.
Request a client from **[support@europequalitegroup.com](mailto:support@europequalitegroup.com)**
with your application name, the **origin(s)** it runs from, the exact
**redirect URI(s)** and the **scopes** you need. See
[Getting access](../README.md#-getting-access).

## Provider reference

### Endpoints

Discover everything from the well-known document — never hard-code endpoints:

```
https://auth.europequalitegroup.com/.well-known/openid-configuration
```

| Issuer | URL |
| ------ | --- |
| Production | `https://auth.europequalitegroup.com` |
| Staging | `https://beta.auth.europequalitegroup.com` |

| Purpose | Path |
| ------- | ---- |
| Authorization | `/oidc/authorize` |
| Token | `/oidc/token` |
| UserInfo | `/oidc/userinfo` |
| JWKS | `/oidc/jwks` |
| Introspection | `/oidc/introspect` |
| Revocation | `/oidc/revoke` |
| End session (logout) | `/oidc/end-session` |
| Pushed Authorization Request (PAR) | `/oidc/request` |

### Flow & rules

- **Authorization Code flow with PKCE (`S256`) only** — PKCE is **mandatory for
  every client**, public *and* confidential. No implicit, no hybrid.
- Redirect URIs are matched **exactly** (no wildcards). Register every origin.
- ID tokens are signed **RS256** (verify against the JWKS).
- Dynamic client registration is **disabled** — clients are provisioned by EQ.
- Optional, opt-in per client: **PAR** (RFC 9126), **DPoP** (RFC 9449),
  **back-channel logout**.

### Scopes

| Scope | Meaning |
| ----- | ------- |
| `openid` | **Required.** Enables OIDC, yields `sub`. |
| `profile` | Name claims (`given_name`, `family_name`, `name`, `preferred_username`). |
| `email` | `email` (and `email_verified`). |
| `offline_access` | Issues a **refresh token**. |
| `erp:employee` | Employee claim set (see below). Internal-audience clients. |
| `erp:external` | External-account claim set. External-audience clients. |

Employee claims (under `erp:employee`): `erp_role` (number, `0` = root),
`erp_permissions` (`string[]`), `erp_base_place_id`, `erp_base_place_name`,
`erp_head_of`, `erp_head_of_someone`. The UserInfo endpoint is the authoritative
source for the claims your client is allowed to see.

### Tokens

| Token | Format | Lifetime | How to use / validate |
| ----- | ------ | -------- | --------------------- |
| **ID token** | JWT (RS256) | 5 min | Verify signature against the JWKS, plus `iss`, `aud` (= your `client_id`), `exp`. Identifies the user to **your client**. |
| **Access token** | **Opaque** (reference token) | 15 min | **Not a JWT** — do not try to decode it. A resource server validates it via the **introspection endpoint**; a client reads claims from **UserInfo**. |
| **Refresh token** | Opaque | 12 h | `grant_type=refresh_token`. **Rotated on every use** with reuse detection — always persist the newest one and discard the old. |

> Because access tokens are **opaque**, JWT/JWKS validation (e.g. `jose`) applies
> to the **ID token**, not the access token. Resource servers use **introspection**
> — see [node-resource-server.md](node-resource-server.md).

### Logout

RP-initiated logout: redirect to `/oidc/end-session` with `id_token_hint` and
`post_logout_redirect_uri` (must be registered). Note: a MyEQ session logout
also invalidates issued tokens at their next refresh.
