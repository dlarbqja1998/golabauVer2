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
			strategies: 'generateSW', // ★ 빌드 안정성을 위해 자동 생성 모드 사용
			registerType: 'autoUpdate', // 🔥 새 버전 발견 시 백그라운드에서 즉시 교체!
			workbox: {
				importScripts: ['/sw-push.js'], // 푸시 알림 로직은 별도 파일로 분리
			},
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
	],
	// 🔥 여기가 28개 에러를 한방에 잠재우는 통역기(Alias) 설정입니다!
	resolve: {
		alias: {
			http: 'node:http',
			https: 'node:https',
			crypto: 'node:crypto',
			stream: 'node:stream',
			util: 'node:util',
			buffer: 'node:buffer',
			net: 'node:net',
			tls: 'node:tls',
			url: 'node:url',
			assert: 'node:assert'
		}
	}
});