import { unsplashImagesCollections } from './unsplash/images/collections.ts'
import { unsplashImagesSearch } from './unsplash/images/search.ts'
import { bingImagesSearch } from './bing/images/search.ts'
import { storeDaylightImages } from './bonjourr/images/store/store.ts'
import { storeDaylightVideos } from './bonjourr/videos/store/store.ts'
import { pixabayVideosSearch } from './pixabay/videos/search.ts'
import { pixabayImagesSearch } from './pixabay/images/search.ts'
import { metMuseumPaintings } from './metmuseum/images/paintings.ts'
import { getDaylightImages } from './bonjourr/images/get.ts'
import { getDaylightVideos } from './bonjourr/videos/get.ts'
import { getAllStoredMedia } from './bonjourr/all/all.ts'
import { initUnsplashAuth } from './unsplash/shared.ts'
import { backgroundsProxy } from './proxy.ts'
import { metMuseumSearch } from './metmuseum/images/search.ts'
import { filterPaintings } from './metmuseum/filter.ts'

import type { Env } from '../index.ts'

async function fallbackToUnsplashImages(url: URL, env: Env, headers: Headers): Promise<Response> {
	if (env.UNSPLASH) {
		try {
			return await unsplashImagesSearch(url, headers)
		} catch (_) {
			// Fall through to the public Bonjourr service below.
		}
	}

	const fallbackPath = url.pathname.replace(
		'/backgrounds/pixabay/images/search',
		'/backgrounds/unsplash/images/search',
	)
	const fallbackUrl = new URL(fallbackPath + url.search, 'https://services.bonjourr.fr')
	return fetch(fallbackUrl.toString(), { headers })
}

export async function backgrounds(url: URL, env: Env, headers: Headers): Promise<Response> {
	initUnsplashAuth(env)

	//	Get URLs proxy

	if (url.pathname.includes('/backgrounds/proxy/')) {
		return backgroundsProxy(url, headers)
	}

	headers.set('Content-Type', 'application/json')
	headers.set('Cache-Control', 'public, max-age=10')

	//	Store daylight

	if (url.pathname.includes('/backgrounds/bonjourr/images/daylight/store')) {
		return await storeDaylightImages(env, headers)
	}
	if (url.pathname.includes('/backgrounds/bonjourr/videos/daylight/store')) {
		return await storeDaylightVideos(env, headers)
	}

	//	Get Daylight

	if (url.pathname.includes('/backgrounds/bonjourr/all')) {
		return await getAllStoredMedia(env, headers)
	}
	if (url.pathname.includes('/backgrounds/bonjourr/images/daylight')) {
		return await getDaylightImages(env, headers, url)
	}
	if (url.pathname.includes('/backgrounds/bonjourr/videos/daylight')) {
		return await getDaylightVideos(env, headers)
	}

	//	Get Unsplash

	if (url.pathname.includes('/backgrounds/unsplash')) {
		if (!env.UNSPLASH) {
			const fallbackUrl = new URL(url.pathname + url.search, 'https://services.bonjourr.fr')
			return fetch(fallbackUrl.toString(), { headers })
		}

		if (url.pathname.includes('/backgrounds/unsplash/images/collections')) {
			return unsplashImagesCollections(url, headers)
		}
		if (url.pathname.includes('/backgrounds/unsplash/images/search')) {
			return unsplashImagesSearch(url, headers)
		}
	}

	// Get Bing

	if (url.pathname.includes('/backgrounds/bing/images/search')) {
		try {
			return await bingImagesSearch(url, headers)
		} catch (_) {
			return fallbackToUnsplashImages(url, env, headers)
		}
	}

	//	Get Pixabay

	if (url.pathname.includes('/backgrounds/pixabay/images/search')) {
		try {
			if (!env.PIXABAY) {
				throw new Error('Missing PIXABAY API key')
			}
			return await pixabayImagesSearch(url, env, headers)
		} catch (_) {
			return fallbackToUnsplashImages(url, env, headers)
		}
	}
	if (url.pathname.includes('/backgrounds/pixabay/videos/search')) {
		try {
			if (!env.PIXABAY) {
				throw new Error('Missing PIXABAY API key')
			}
			return await pixabayVideosSearch(url, env, headers)
		} catch (_) {
			const fallbackUrl = new URL(url.pathname + url.search, 'https://services.bonjourr.fr')
			const response = await fetch(fallbackUrl.toString(), { headers })
			if (response.ok) {
				return response
			}

			return new Response(JSON.stringify({ 'pixabay-videos-search': [] }), { headers })
		}
	}

	// Get MET Museum

	if (url.pathname.includes('/backgrounds/metmuseum/images/filter')) {
		return await filterPaintings()
	}
	if (url.pathname.includes('/backgrounds/metmuseum/images/paintings')) {
		return await metMuseumPaintings(url, headers)
	}
	if (url.pathname.includes('/backgrounds/metmuseum/images/search')) {
		return await metMuseumSearch(url, headers)
	}

	//	Get <some other provider>

	// ...

	return new Response('Not found', {
		status: 404,
	})
}
