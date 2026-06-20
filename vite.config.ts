import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Two entry points: the home page and the OAuth redirect callback page.
// The callback page must be served at the exact `redirect_uri` registered
// for the client (default: <origin>/callback.html).
export default defineConfig({
	build: {
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
				callback: resolve(__dirname, 'callback.html'),
			},
		},
	},
})
