import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

// The HTML ships a strict, production-grade Content Security Policy. Vite's dev
// server needs a WebSocket for HMR and injects <style> tags for CSS updates, so
// relax `connect-src` and `style-src` — only while serving in development.
function devCspRelax(): Plugin {
	return {
		name: 'dev-csp-relax',
		apply: 'serve',
		transformIndexHtml(html) {
			return html.replace(
				/(<meta\s+http-equiv="Content-Security-Policy"\s+content=")([^"]*)(")/,
				(_match, prefix, policy, suffix) => {
					const relaxed = policy
						.replace(/connect-src ([^;]*)/, 'connect-src $1 ws: http:')
						.replace(/style-src ([^;]*)/, "style-src $1 'unsafe-inline'")
					return prefix + relaxed + suffix
				},
			)
		},
	}
}

// Two entry points: the home page and the OAuth redirect callback page.
export default defineConfig({
	plugins: [devCspRelax()],
	build: {
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'index.html'),
				callback: resolve(__dirname, 'callback.html'),
			},
		},
	},
})
