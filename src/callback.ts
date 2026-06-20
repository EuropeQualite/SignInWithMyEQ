// Runs on the OAuth redirect page (callback.html). It exchanges the
// authorization code for tokens (PKCE verifier handled by oidc-client-ts),
// then sends the user back to where they started.
import { userManager } from './auth'

/**
 * Only allow returning to a same-origin path. Even though `returnTo` comes from
 * our own OIDC `state`, we validate it defensively to avoid an open-redirect if
 * the value is ever attacker-influenced: it must be an absolute path ('/...'),
 * not protocol-relative ('//', '/\'), and must resolve to this origin.
 */
function safeReturnTo(value: unknown): string {
	if (typeof value !== 'string') return '/'
	if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
		return '/'
	}
	try {
		const url = new URL(value, location.origin)
		if (url.origin !== location.origin) return '/'
		return url.pathname + url.search + url.hash
	} catch {
		return '/'
	}
}

async function handleCallback(): Promise<void> {
	try {
		const user = await userManager.signinRedirectCallback()
		const returnTo =
			user.state && typeof user.state === 'object' && 'returnTo' in user.state
				? safeReturnTo((user.state as { returnTo?: unknown }).returnTo)
				: '/'
		location.replace(returnTo)
	} catch (err) {
		const el = document.getElementById('status')
		if (el) {
			el.textContent = `Sign-in failed: ${err instanceof Error ? err.message : String(err)}`
		}
		// Fall back to home after a short delay so the user is never stranded.
		setTimeout(() => location.replace('/'), 4000)
	}
}

void handleCallback()
