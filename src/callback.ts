import { userManager } from './auth'

// Same-origin guard against an open redirect.
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
		setTimeout(() => location.replace('/'), 4000)
	}
}

void handleCallback()
