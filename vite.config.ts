import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		tailwindcss(), // 디자인 엔진
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: '골라바유',
				short_name: '골라바유',
				display: 'standalone', // 레퍼런스처럼 주소창 숨기기
				theme_color: '#ffffff',
				icons: [
					{ src: 'icon.png', sizes: '192x192', type: 'image/png' },
					{ src: 'thumbnail.png', sizes: '512x512', type: 'image/png' }
				]
			}
		})
	]
});