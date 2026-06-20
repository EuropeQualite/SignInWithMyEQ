// Home page logic: render the signed-out or signed-in view depending on the
// current MyEQ session, and wire the button + sign-out action.
import './styles.css'
import './signin-button.css'
import { signIn, signOut, getUser } from './auth'
import { initPlayground } from './playground'
import type { User } from 'oidc-client-ts'

const signedOut = document.getElementById('signed-out')!
const signedIn = document.getElementById('signed-in')!
const signInButton = document.getElementById('signin-button')!
const signOutButton = document.getElementById('signout-button')!
const avatar = document.getElementById('avatar')!
const nameEl = document.getElementById('profile-name')!
const emailEl = document.getElementById('profile-email')!
const claimsEl = document.getElementById('claims')!

function initial(name: string): string {
	return (name.trim()[0] ?? '?').toUpperCase()
}

function renderSignedIn(user: User): void {
	const claims = user.profile
	const name =
		claims.name ||
		[claims.given_name, claims.family_name].filter(Boolean).join(' ') ||
		claims.preferred_username ||
		claims.sub
	avatar.textContent = initial(String(name))
	nameEl.textContent = String(name)
	emailEl.textContent = claims.email ? String(claims.email) : ''
	claimsEl.textContent = JSON.stringify(claims, null, 2)

	signedOut.classList.add('hidden')
	signedIn.classList.remove('hidden')
}

signInButton.addEventListener('click', () => {
	void signIn()
})

signOutButton.addEventListener('click', () => {
	void signOut()
})

async function init(): Promise<void> {
	const user = await getUser()
	if (user && !user.expired) {
		renderSignedIn(user)
	}
}

initPlayground()
void init()
