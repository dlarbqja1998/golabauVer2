<script>
	import './layout.css';
	import { Home, Search, User, MessageCircle } from 'lucide-svelte';
	import { page } from '$app/stores';

	// Svelte 5 Props
	let { children } = $props();

	// ==========================================
	//  [DAE] 사용자 행동 추적기 (CCTV 시스템)
	// ==========================================
	
	let pageStartTime = Date.now();
	let currentPath = '';

	// 1. 로그 전송 함수 (서버 API로 쏘는 역할)
	async function sendLog(type, target, meta = {}) {
		try {
			// 브라우저 환경에서만 실행
			if (typeof window === 'undefined') return;

			const isMobile = /Mobi/i.test(navigator.userAgent);

			await fetch('/api/log', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					actionType: type,
					target: target,
					metadata: {
						...meta,
						url: window.location.href,
						device: isMobile ? 'mobile' : 'desktop'
					}
				})
			});
		} catch (e) {
			// 에러 발생해도 유저 사용성에는 영향 없도록 조용히 넘어감
			console.error('Tracking Error:', e);
		}
	}

	// 2. 페이지 이동 감지 ($effect 사용)
	// URL이 바뀔 때마다 실행됨
	$effect(() => {
		const newPath = $page.url.pathname;
		
		// (A) 이전 페이지 체류시간 전송 (페이지가 실제로 바뀌었을 때만)
		if (currentPath && currentPath !== newPath) {
			const duration = (Date.now() - pageStartTime) / 1000;
			sendLog('dwell_time', currentPath, { duration_sec: duration });
		}

		// (B) 새 페이지 진입 기록
		if (currentPath !== newPath) {
			currentPath = newPath;
			pageStartTime = Date.now();
			sendLog('page_view', newPath); 
		}
	});

	// 3. 클릭 감지 (어디를 누르든 다 잡아냄)
	function handleGlobalClick(event) {
		// 클릭한 요소가 버튼, 링크, 입력창인지 확인
		const target = event.target.closest('a, button, input, select');
		
		if (target) {
			// 버튼의 텍스트나 ID 등을 식별자로 사용
			let label = target.innerText || target.id || target.href || target.name || 'unknown';
			label = label.substring(0, 50).replace(/\s+/g, ' ').trim(); // 50자 제한 및 공백 정리
			
			sendLog('click', label); 
		}
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
		// 탭 닫을 때 마지막 체류시간 전송
		const duration = (Date.now() - pageStartTime) / 1000;
		sendLog('dwell_time', currentPath, { duration_sec: duration, exit: true });
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
				<span class="text-[10px] font-bold tracking-tight">골라바쓔</span>
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