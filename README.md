# Sign in with MyEQ

A minimal, framework-agnostic example showing how to add **“Sign in with MyEQ”**
to a web application using **OpenID Connect** (Authorization Code flow with
**PKCE**). No backend, no client secret — it runs entirely in the browser and
deploys as static files.

Use it as a starting point for your own integration, or as a reference for the
button styling and the OIDC wiring.

> Stack: [Vite](https://vitejs.dev) + TypeScript + [`oidc-client-ts`](https://github.com/authts/oidc-client-ts).
> Vanilla on purpose — the same approach works in React, Vue, Svelte or plain HTML.

---

## What it does

1. Renders the branded **Sign in with MyEQ** button.
2. On click, redirects to the MyEQ issuer to authenticate (Authorization Code + PKCE).
3. Handles the redirect callback, exchanges the code for tokens.
4. Shows the signed-in user’s profile claims, with a **Sign out** action.

---

## Prerequisites — register a client

Ask a MyEQ administrator to register a **public** OAuth client
(Internal portal → **System → OAuth Clients** → enable *public client*):

| Field           | Value                                                          |
| --------------- | ------------------------------------------------------------- |
| `client_id`     | e.g. `my-demo-rp`                                              |
| Public client   | **Yes** (PKCE S256 — no secret)                               |
| Redirect URIs   | exact match, e.g. `http://localhost:5173/callback.html`       |
| Allowed scopes  | `openid`, `profile`, `email` (add `offline_access`, `erp:employee` as needed) |

Redirect URIs are matched **exactly** (no wildcards), so register every origin
you run from (local + production).

---

## Quick start

```bash
cp .env.example .env      # then fill in your client_id / authority
npm install
npm run dev               # http://localhost:5173
```

Build the static site:

```bash
npm run build && npm run preview
```

### Configuration (`.env`)

| Variable                 | Description                                            |
| ------------------------ | ------------------------------------------------------ |
| `VITE_OIDC_AUTHORITY`    | Issuer URL (`https://auth.europequalitegroup.com`)     |
| `VITE_OIDC_CLIENT_ID`    | Your registered `client_id`                            |
| `VITE_OIDC_REDIRECT_URI` | Must match a registered redirect URI                   |
| `VITE_OIDC_SCOPE`        | Space-separated scopes (`openid` is mandatory)         |

The app discovers all endpoints from
`${VITE_OIDC_AUTHORITY}/.well-known/openid-configuration`.

---

## Integrate into your own app

**1. The button** — copy [`src/signin-button.css`](src/signin-button.css) and the
markup from [`index.html`](index.html). It is plain HTML/CSS, themable via CSS
custom properties:

```html
<button class="eq-signin eq-signin--light eq-signin--md eq-signin--rounded">
  <span class="eq-signin__logo"><!-- inline EQ mark SVG --></span>
  <span class="eq-signin__label">Sign in with MyEQ</span>
</button>
```

Variants: `--light | --dark | --auto`, `--sm | --md | --lg`,
`--rounded | --pill`, plus `--block` (full width) and `--icon` (mark only).
Override `--eq-signin-accent` to retheme.

**2. The OIDC client** — see [`src/auth.ts`](src/auth.ts). The essential part:

```ts
import { UserManager } from 'oidc-client-ts'

const userManager = new UserManager({
  authority: 'https://auth.europequalitegroup.com',
  client_id: 'my-demo-rp',
  redirect_uri: window.location.origin + '/callback.html',
  response_type: 'code',          // PKCE is enabled automatically
  scope: 'openid profile email',
})

button.onclick = () => userManager.signinRedirect()
```

On your redirect page, finish the flow ([`src/callback.ts`](src/callback.ts)):

```ts
await userManager.signinRedirectCallback()
```

---

## Project layout

```
index.html            Home page + button markup
callback.html         OAuth redirect page
src/
  auth.ts             UserManager configuration (adapt this)
  callback.ts         Redirect callback handler
  main.ts             Home page logic (render signed-in / signed-out)
  signin-button.css   Framework-agnostic button styles
  styles.css          Demo page styles
```

---

## Security notes

- **PKCE (S256)** is mandatory for every MyEQ client and handled automatically.
- Tokens are kept in `sessionStorage` (cleared when the tab closes). Browser
  storage is readable by any script on the page, so for production or long-lived
  sessions prefer a server-side (confidential) client or a BFF with HttpOnly
  cookies rather than browser-readable storage.
- The redirect callback only returns to **same-origin** paths (no open redirect).
- Always register **exact** redirect URIs and serve the app over **HTTPS** in
  production.

## License

[MIT](LICENSE)
