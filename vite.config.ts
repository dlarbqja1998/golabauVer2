// =========================================================
//  [vite.config.ts]
//  Vite 빌드 설정 및 PWA 커스텀 서비스 워커 주입
//  (기존 흰색 테마 유지 및 원본 아이콘 파일명 사용)
// =========================================================
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		tailwindcss(), // 디자인 엔진
		sveltekit(),
		SvelteKitPWA({
			strategies: 'injectManifest', // ★ 우리가 직접 만든 서비스 워커 파일을 쓰겠다는 설정
			srcDir: 'src',
			filename: 'service-worker.ts', // 읽어들일 워커 파일 이름
			manifest: {
				name: '골라바유',
				short_name: '골라바유',
				display: 'standalone', // 레퍼런스처럼 주소창 숨기기
				theme_color: '#ffffff', // 말씀하신 대로 기존 흰색 깔끔하게 유지!
				icons: [
					{ src: 'icon.png', sizes: '192x192', type: 'image/png' }, // 원상 복구
					{ src: 'thumbnail.png', sizes: '512x512', type: 'image/png' } // 원상 복구
				]
			}
		})
	]
});