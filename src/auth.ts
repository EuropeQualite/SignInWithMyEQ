// ─────────────────────────────────────────────────────────────────────────────
// MyEQ OIDC wiring — the only file you need to adapt to integrate "Sign in with
// MyEQ" into your own app.
//
// Pattern: public client, Authorization Code flow with PKCE (S256). No backend,
// no client secret. oidc-client-ts discovers every endpoint from the issuer's
// `/.well-known/openid-configuration` and enables PKCE automatically for the
// code flow.
// ─────────────────────────────────────────────────────────────────────────────
import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts'

const authority = import.meta.env.VITE_OIDC_AUTHORITY
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID

if (!authority || !clientId) {
	throw new Error(
		'Missing config: set VITE_OIDC_AUTHORITY and VITE_OIDC_CLIENT_ID in your .env file (see .env.example).',
	)
}

// The placeholder client_id shipped in .env.example. While it is in use there is
// no real registered client, so the redirect would only land on an issuer error.
// The UI uses this to show an explanatory note instead of redirecting.
export const isDemoPlaceholder = clientId === 'my-demo-rp'

export const userManager = new UserManager({
	authority,
	client_id: clientId,
	// Must exactly match a redirect URI registered for the client.
	redirect_uri: import.meta.env.VITE_OIDC_REDIRECT_URI || `${location.origin}/callback.html`,
	post_logout_redirect_uri: `${location.origin}/`,
	response_type: 'code',
	scope: import.meta.env.VITE_OIDC_SCOPE || 'openid profile email',
	// Tokens are kept in sessionStorage by default: they are cleared when the
	// tab closes, which shrinks the window in which an XSS flaw could exfiltrate
	// them. Browser storage is still readable by any script on the page, so for
	// production / long-lived sessions prefer a server-side (confidential) client
	// or a BFF that keeps tokens in HttpOnly cookies. Swap to window.localStorage
	// only if you explicitly need the session to survive a tab close.
	userStore: new WebStorageStateStore({ store: window.sessionStorage }),
})

/**
 * Start the login flow. `returnTo` is round-tripped through the OIDC `state`
 * so the callback can send the user back where they started.
 */
export function signIn(returnTo: string = location.pathname + location.search): Promise<void> {
	return userManager.signinRedirect({ state: { returnTo } })
}

/** Clear the local session and end the session at the issuer. */
export function signOut(): Promise<void> {
	return userManager.signoutRedirect()
}

/** The current user (with tokens + claims), or null if not signed in. */
export function getUser(): Promise<User | null> {
	return userManager.getUser()
}
