import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Two entry points: the home page and the OAuth redirect callback page.
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
