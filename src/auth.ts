import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts'

const authority = import.meta.env.VITE_OIDC_AUTHORITY
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID

if (!authority || !clientId) {
	throw new Error(
		'Missing config: set VITE_OIDC_AUTHORITY and VITE_OIDC_CLIENT_ID in your .env file (see .env.example).',
	)
}

export const isDemoPlaceholder = clientId === 'my-demo-rp'

export const userManager = new UserManager({
	authority,
	client_id: clientId,
	redirect_uri: import.meta.env.VITE_OIDC_REDIRECT_URI || `${location.origin}/callback.html`,
	post_logout_redirect_uri: `${location.origin}/`,
	response_type: 'code',
	scope: import.meta.env.VITE_OIDC_SCOPE || 'openid profile email',
	userStore: new WebStorageStateStore({ store: window.sessionStorage }),
})

export function signIn(returnTo: string = location.pathname + location.search): Promise<void> {
	return userManager.signinRedirect({ state: { returnTo } })
}

export function signOut(): Promise<void> {
	return userManager.signoutRedirect()
}

export function getUser(): Promise<User | null> {
	return userManager.getUser()
}
