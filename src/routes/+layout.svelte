<script>
	import './layout.css';
	import { page } from '$app/stores';
	import { Home, Search, User, MessageCircle } from 'lucide-svelte';

	// Svelte 5 Props
	let { children } = $props();

	// ==========================================
	//  [DAE] 사용자 행동 추적기 (CCTV 시스템) V2
	// ==========================================
	
	let lastPath = $state(''); // 이전 경로
	let enterTime = $state(Date.now()); // 진입 시간

	// 1. 로그 전송 함수
	async function sendLog(type, target, meta = {}) {
		if (typeof window === 'undefined') return;

		try {
			const isMobile = /Mobi/i.test(navigator.userAgent);
			
			await fetch('/api/log', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					actionType: type,
					target: target || 'unknown',
					metadata: {
						...meta,
						url: window.location.href,
						device: isMobile ? 'mobile' : 'desktop',
						timestamp: new Date().toISOString()
					}
				})
			});
		} catch (e) {
			console.warn('[Log Error]', e);
		}
	}

	// 2. 페이지 이동 및 체류시간 추적 ($effect)
	$effect(() => {
		const currentPath = $page.url.pathname;

		// (A) 초기 진입
		if (!lastPath) {
			lastPath = currentPath;
			enterTime = Date.now();
			sendLog('page_view', currentPath);
			return;
		}

		// (B) 페이지 변경 시
		if (lastPath !== currentPath) {
			const duration = (Date.now() - enterTime) / 1000;
			if (duration > 0.5) {
				sendLog('dwell_time', lastPath, { duration_sec: duration.toFixed(1) });
			}

			sendLog('page_view', currentPath);
			lastPath = currentPath;
			enterTime = Date.now();
		}
	});

	// 3. 클릭 감지 (노이즈 필터링 적용)
	function handleGlobalClick(event) {
		const el = event.target.closest('a, button, input, select, textarea, [role="button"]');
		
		if (!el) return; // 빈 공간 무시

		// 라벨 추출
		let label = el.getAttribute('aria-label') || el.innerText || el.getAttribute('name') || el.id || el.getAttribute('href') || '';
		label = label.replace(/\s+/g, ' ').trim().substring(0, 30);

		// ⭐ unknown 필터링 (서버로 안 보냄)
		if (!label || label.toLowerCase() === 'unknown') return;

		sendLog('click', label);
	}
</script>

<svelte:head>
	<title>골라바유</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<svelte:window 
	onclick={handleGlobalClick}
	onbeforeunload={() => {
		// 탭 닫을 때 체류시간 전송 (변수명 enterTime으로 통일)
		const duration = (Date.now() - enterTime) / 1000;
		sendLog('dwell_time', lastPath, { duration_sec: duration.toFixed(1), exit: true });
	}} 
/>

<div class="flex flex-col min-h-screen bg-[#F8F9FA]">
	<main class="flex-1 pb-24">
		{@render children()}
	</main>

	<nav class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-area-bottom">
		<div class="max-w-md mx-auto flex justify-around items-center py-3">
			
			<a href="/" class="flex flex-col items-center gap-1 {$page.url.pathname === '/' ? 'text-red-600' : 'text-gray-400'}">
				<Home size={24} />
				<span class="text-[10px] font-bold">홈</span>
			</a>

			<a href="/search" class="flex flex-col items-center gap-1 {$page.url.pathname === '/search' ? 'text-red-600' : 'text-gray-400'}">
				<Search size={24} />
				<span class="text-[10px] font-medium">검색</span>
			</a>

			<a href="/golabassyu" class="flex flex-col items-center gap-1 {$page.url.pathname.startsWith('/golabassyu') ? 'text-red-600' : 'text-gray-400'}">
				<MessageCircle size={24} />
				<span class="text-[10px] font-bold tracking-tight">골라밧슈</span>
			</a>

			<a href="/my" class="flex flex-col items-center gap-1 {$page.url.pathname === '/my' ? 'text-red-600' : 'text-gray-400'}">
				<User size={24} />
				<span class="text-[10px] font-medium">마이</span>
			</a>

		</div>
	</nav>
</div>

<style>
	.safe-area-bottom {
		padding-bottom: env(safe-area-inset-bottom);
	}
</style>