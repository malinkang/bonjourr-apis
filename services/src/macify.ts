// Macify — sylvan.apple.com reverse proxy
// Based on Macify cloudflare worker

const APPLE_HOST = 'https://sylvan.apple.com'
const ALLOWED_PATH_PREFIX = '/itunes-assets/'
const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const FORWARDED_REQUEST_HEADERS = new Set([
	'range',
	'accept',
	'accept-encoding',
	'accept-language',
	'user-agent',
])

const FORWARDED_RESPONSE_HEADERS = new Set([
	'content-type',
	'content-length',
	'content-range',
	'accept-ranges',
	'cache-control',
	'etag',
	'last-modified',
	'expires',
	'age',
])

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
	'Access-Control-Allow-Headers': 'Range',
	'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
	'Access-Control-Max-Age': '86400',
}

function pickHeaders(source: Headers, allowed: Set<string>) {
	const out = new Headers()
	for (const [name, value] of source.entries()) {
		if (allowed.has(name.toLowerCase())) out.set(name, value)
	}
	return out
}

function deny(status: number, body: string) {
	return new Response(body, {
		status,
		headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS },
	})
}

export async function macify(request: Request): Promise<Response> {
	try {
		const url = new URL(request.url)

		if (!ALLOWED_METHODS.has(request.method)) {
			return deny(405, 'Method not allowed')
		}

		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: CORS_HEADERS })
		}

		if (!url.pathname.startsWith(ALLOWED_PATH_PREFIX)) {
			return deny(404, 'Not found')
		}

		const targetUrl = `${APPLE_HOST}${url.pathname}`

		let upstream: Response
		try {
			// @ts-ignore fetch allows 'manual' redirect in Cloudflare Workers
			upstream = await fetch(targetUrl, {
				method: request.method,
				headers: pickHeaders(request.headers, FORWARDED_REQUEST_HEADERS),
				redirect: 'manual',
			})
		} catch (e: any) {
			return deny(502, `Upstream fetch failed: ${e.message}`)
		}

		const headers = pickHeaders(upstream.headers, FORWARDED_RESPONSE_HEADERS)
		for (const [name, value] of Object.entries(CORS_HEADERS)) {
			headers.set(name, value)
		}

		return new Response(upstream.body, {
			status: upstream.status,
			statusText: upstream.statusText,
			headers,
		})
	} catch (err: any) {
		return new Response(`Global Macify Error: ${err.message}\n${err.stack}`, { status: 500 })
	}
}
