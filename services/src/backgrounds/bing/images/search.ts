import type { Image } from '../../types.ts'

interface BingImage {
	startdate: string
	fullstartdate: string
	enddate: string
	url: string
	urlbase: string
	copyright: string
	copyrightlink: string
	title: string
}

interface BingArchive {
	images?: BingImage[]
}

function normalizeBingUrl(path: string, width: string, height: string): string {
	const url = new URL(path, 'https://www.bing.com')
	url.searchParams.set('w', width)
	url.searchParams.set('h', height)
	url.searchParams.set('qlt', '100')
	return url.toString()
}

export async function bingImagesSearch(url: URL, headers: Headers): Promise<Response> {
	const width = url.searchParams.get('w') ?? '1920'
	const height = url.searchParams.get('h') ?? '1080'
	const market = url.searchParams.get('mkt') ?? 'zh-CN'
	const count = url.searchParams.get('n') ?? '8'

	const apiUrl = new URL('https://www.bing.com/HPImageArchive.aspx')
	apiUrl.searchParams.set('format', 'js')
	apiUrl.searchParams.set('idx', '0')
	apiUrl.searchParams.set('n', count)
	apiUrl.searchParams.set('mkt', market)

	const resp = await fetch(apiUrl.toString(), {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
		},
	})
	if (!resp.ok) {
		throw new Error(`Bing daily image fetch failed: ${resp.status}`)
	}

	const json = await resp.json<BingArchive>()
	const result: Image[] = (json.images ?? []).map((image) => ({
		format: 'image',
		page: image.copyrightlink || 'https://www.bing.com',
		username: 'Bing',
		name: image.title || image.copyright,
		urls: {
			full: normalizeBingUrl(image.urlbase || image.url, width, height),
			medium: normalizeBingUrl(image.urlbase || image.url, '1280', '720'),
			small: normalizeBingUrl(image.urlbase || image.url, '320', '180'),
		},
	}))

	return new Response(JSON.stringify({ 'bing-images-search': result }), { headers })
}
