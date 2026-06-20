// Runs on the OAuth redirect page (callback.html). It exchanges the
// authorization code for tokens (PKCE verifier handled by oidc-client-ts),
// then sends the user back to where they started.
import { userManager } from './auth'

async function handleCallback(): Promise<void> {
	try {
		const user = await userManager.signinRedirectCallback()
		const returnTo =
			user.state && typeof user.state === 'object' && 'returnTo' in user.state
				? String((user.state as { returnTo?: unknown }).returnTo ?? '/')
				: '/'
		location.replace(returnTo || '/')
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
