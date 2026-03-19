import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			strategies: 'generateSW',
			registerType: 'autoUpdate',
			workbox: {
				importScripts: ['/sw-push.js'],
				cleanupOutdatedCaches: true,
				clientsClaim: true,
				skipWaiting: true,
				navigateFallbackDenylist: [/^\/api\//]
			},
			manifest: {
				name: '골라바유',
				short_name: '골라바유',
				display: 'standalone',
				theme_color: '#ffffff',
				icons: [
					{ src: 'icon.png', sizes: '192x192', type: 'image/png' },
					{ src: 'thumbnail.png', sizes: '512x512', type: 'image/png' }
				]
			}
		})
	]
});
