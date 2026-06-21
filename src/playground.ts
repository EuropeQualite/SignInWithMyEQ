const MARK = `<svg viewBox="0 0 512 512" role="presentation"><rect width="512" height="512" rx="104" fill="#e42528"/><path fill="#fff" d="M365.6,381.5c-6.6-6.4-15.3-9.9-24.5-9.9l-205,.3v70.6l205-.3c9.4,0,18.3-3.7,24.9-10.3,6.4-6.4,10.1-15.6,10-25.2,0-9.6-3.9-18.7-10.4-25.1Z"/><path fill="#fff" d="M375.6,104.9v-.2c0-9.6-3.9-18.5-10.7-25.1-6.6-6.5-15.4-10-24.6-10l-204.3.3v70.5l204.3-.2c19.5,0,35.3-15.8,35.3-35.3Z"/><path fill="#fff" d="M289.3,280.9c6.4-6.4,10.1-15.5,10-25,0-9.6-3.8-18.8-10.4-25.3-6.6-6.4-15.3-9.9-24.6-9.9l-128.3.2v70.6l128.4-.2c9.4,0,18.3-3.7,24.9-10.3Z"/></svg>`

const DEFAULT_RADIUS: Record<string, number> = { sm: 8, md: 10, lg: 12 }

interface Config {
	theme: string
	size: string
	shape: string
	radius: number
	label: string
	iconOnly: boolean
	block: boolean
}

const config: Config = {
	theme: 'light',
	size: 'md',
	shape: 'rounded',
	radius: 10,
	label: 'Sign in with MyEQ',
	iconOnly: false,
	block: false,
}

function $<T extends HTMLElement>(id: string): T {
	return document.getElementById(id) as T
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

function classList(): string {
	const c = [
		'eq-signin',
		`eq-signin--${config.theme}`,
		`eq-signin--${config.size}`,
		`eq-signin--${config.shape}`,
	]
	if (config.iconOnly) c.push('eq-signin--icon')
	else if (config.block) c.push('eq-signin--block')
	return c.join(' ')
}

function styleAttr(): string {
	if (config.shape === 'pill') return ''
	if (config.radius === DEFAULT_RADIUS[config.size]) return ''
	return `--eq-signin-radius: ${config.radius}px`
}

function renderPreview(): void {
	const btn = $<HTMLButtonElement>('preview-button')
	btn.className = classList()
	// Apply the custom radius via the CSSOM (not a `style` attribute) so the
	// page works under a strict `style-src 'self'` CSP with no `'unsafe-inline'`.
	if (config.shape !== 'pill' && config.radius !== DEFAULT_RADIUS[config.size]) {
		btn.style.setProperty('--eq-signin-radius', `${config.radius}px`)
	} else {
		btn.style.removeProperty('--eq-signin-radius')
	}
	btn.setAttribute('aria-label', config.label)
	btn.innerHTML =
		`<span class="eq-signin__logo" aria-hidden="true">${MARK}</span>` +
		(config.iconOnly ? '' : `<span class="eq-signin__label">${escapeHtml(config.label)}</span>`)
}

function renderSnippet(): void {
	const style = styleAttr()
	const styleAttribute = style ? ` style="${style}"` : ''
	const open = `<button class="${classList()}"${styleAttribute}>`
	const logo = `  <span class="eq-signin__logo"><!-- EQ mark SVG --></span>`
	const label = config.iconOnly
		? ''
		: `\n  <span class="eq-signin__label">${escapeHtml(config.label)}</span>`
	$('snippet').textContent = `${open}\n${logo}${label}\n</button>`
}

function syncDisabledStates(): void {
	$<HTMLElement>('radius-field').classList.toggle('is-disabled', config.shape === 'pill')
	$<HTMLInputElement>('ctl-radius').disabled = config.shape === 'pill'
	$<HTMLInputElement>('ctl-label').disabled = config.iconOnly
	$<HTMLInputElement>('ctl-block').disabled = config.iconOnly
}

function render(): void {
	syncDisabledStates()
	renderPreview()
	renderSnippet()
}

export function initPlayground(): void {
	$<HTMLSelectElement>('ctl-theme').addEventListener('change', (e) => {
		config.theme = (e.target as HTMLSelectElement).value
		render()
	})
	$<HTMLSelectElement>('ctl-size').addEventListener('change', (e) => {
		config.size = (e.target as HTMLSelectElement).value
		config.radius = DEFAULT_RADIUS[config.size]
		$<HTMLInputElement>('ctl-radius').value = String(config.radius)
		$('radius-value').textContent = `${config.radius}px`
		render()
	})
	$<HTMLSelectElement>('ctl-shape').addEventListener('change', (e) => {
		config.shape = (e.target as HTMLSelectElement).value
		render()
	})
	$<HTMLInputElement>('ctl-radius').addEventListener('input', (e) => {
		config.radius = Number((e.target as HTMLInputElement).value)
		$('radius-value').textContent = `${config.radius}px`
		render()
	})
	$<HTMLInputElement>('ctl-label').addEventListener('input', (e) => {
		config.label = (e.target as HTMLInputElement).value || 'Sign in with MyEQ'
		render()
	})
	$<HTMLInputElement>('ctl-icon').addEventListener('change', (e) => {
		config.iconOnly = (e.target as HTMLInputElement).checked
		render()
	})
	$<HTMLInputElement>('ctl-block').addEventListener('change', (e) => {
		config.block = (e.target as HTMLInputElement).checked
		render()
	})

	document
		.querySelectorAll<HTMLButtonElement>('.preview__surface-toggle [data-surface]')
		.forEach((btn) => {
			btn.addEventListener('click', () => {
				$('preview-stage').dataset.surface = btn.dataset.surface ?? 'light'
				document
					.querySelectorAll('.preview__surface-toggle [data-surface]')
					.forEach((b) => b.classList.toggle('is-active', b === btn))
			})
		})

	$<HTMLButtonElement>('copy-snippet').addEventListener('click', async () => {
		const button = $<HTMLButtonElement>('copy-snippet')
		try {
			await navigator.clipboard.writeText($('snippet').textContent ?? '')
			const previous = button.textContent
			button.textContent = 'Copied'
			setTimeout(() => (button.textContent = previous), 1500)
		} catch {
			button.textContent = 'Copy failed'
		}
	})

	render()
}
