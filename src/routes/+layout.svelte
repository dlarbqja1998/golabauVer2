<script>
	import './layout.css';
	import { page } from '$app/stores';
	import { Home, Search, User, MessageCircle } from 'lucide-svelte';
	import { afterNavigate } from '$app/navigation'; // 🔥 [추가] 라우팅 감지를 위한 함수 임포트
	import { onMount } from 'svelte';

	// ==========================================
	// [버전 관리] 새 배포 시 딱 1번만 강제 새로고침
	// ==========================================
	const APP_VERSION = '2.1.0'; // ★ 배포할 때마다 이 숫자만 올려주면 됩니다!

	onMount(() => {
		const lastVersion = localStorage.getItem('app_version');
		if (lastVersion !== APP_VERSION) {
			// 버전이 다르면 → 기존 캐시 전부 날리고 딱 1번 새로고침
			localStorage.setItem('app_version', APP_VERSION);
			if ('caches' in window) {
				caches.keys().then(names => {
					names.forEach(name => caches.delete(name));
				});
			}
			// 서비스워커도 최신으로 갱신 요청!
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.getRegistrations().then(regs => {
					regs.forEach(reg => reg.update());
				});
			}
			// 캐시 무시하고 서버에서 최신 파일 받아오기
			location.reload();
			return;
		}
	});

	// Svelte 5 Props (data 추가!)
	let { data, children } = $props();

	// ==========================================
	// 🔥 [PostHog View] 페이지 이동할 때마다 '조회' 로그 찍기
	// ==========================================
	afterNavigate(() => {
		// 화면 전환(네비게이션 바 클릭 등)이 일어날 때마다 무조건 실행됨
		if (typeof window !== 'undefined' && window.posthog) {
			window.posthog.capture('$pageview');
		}
	});

	// ==========================================
	// 🔥 [PostHog Who] 유저 명찰(Identify) 달아주기
	// ==========================================
	$effect(() => {
		console.log("PostHog 체크! 현재 유저 데이터:", data?.user);
		if (typeof window !== 'undefined' && window.posthog) {
			
			if (data?.user) {
				// 🔥 KV 캐시 덕분에 모든 페이지에서 유저 식별 가능! (고유 ID 사용)
				window.posthog.identify(String(data.user.id), {
					nickname: data.user.nickname,
				});
			} else if (!data?.hasSession) {
				// 2. ⭐️ 핵심 포인트: data.user가 없더라도 세션 쿠키가 있다면(홈 화면 등) 가만히 냅둠!
				// 오직 세션 쿠키마저 없는 '진짜 로그아웃/비로그인' 상태일 때만 익명 처리
				window.posthog.reset();
			}

		}
	});
</script>

<svelte:head>
	<title>골라바유</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>

<div class="flex flex-col min-h-screen bg-[#F8F9FA]">
	<main class="flex-1 pb-24">
		{@render children()}
	</main>

	<nav class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 safe-area-bottom">
		<div class="max-w-md mx-auto flex justify-around items-center h-16">
			
			<a href="/" class="flex flex-col items-center gap-1 w-16 {$page.url.pathname === '/' ? 'text-[#8B0029]' : 'text-gray-400 hover:text-gray-600'} transition-colors">
				<Home size={24} />
				<span class="text-[10px] font-bold">홈</span>
			</a>

			<a href="/search" class="flex flex-col items-center gap-1 w-16 {$page.url.pathname === '/search' ? 'text-[#8B0029]' : 'text-gray-400 hover:text-gray-600'} transition-colors">
				<Search size={24} />
				<span class="text-[10px] font-bold">검색</span>
			</a>

			<div class="relative w-16 h-full flex justify-center">
				<a href="/roulette" class="absolute -top-5 flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-[#8B0029] to-[#E51937] rounded-full shadow-[0_4px_10px_rgba(139,0,41,0.3)] border-[4px] border-white active:scale-95 transition-transform group z-10">
					<span class="text-2xl transition-transform duration-700 group-hover:rotate-[360deg]">🎡</span>
				</a>
				<span class="text-[10px] font-bold absolute bottom-1 {$page.url.pathname.startsWith('/roulette') ? 'text-[#8B0029]' : 'text-gray-400'}"></span>
			</div>

			<a href="/golabassyu" class="flex flex-col items-center gap-1 w-16 {$page.url.pathname.startsWith('/golabassyu') ? 'text-[#8B0029]' : 'text-gray-400 hover:text-gray-600'} transition-colors">
				<MessageCircle size={24} />
				<span class="text-[10px] font-bold tracking-tight">골라밧슈</span>
			</a>

			<a href="/my" class="flex flex-col items-center gap-1 w-16 {$page.url.pathname === '/my' ? 'text-[#8B0029]' : 'text-gray-400 hover:text-gray-600'} transition-colors">
				<User size={24} />
				<span class="text-[10px] font-bold">마이</span>
			</a>

		</div>
	</nav>
</div>

<style>
	.safe-area-bottom {
		padding-bottom: env(safe-area-inset-bottom);
	}
</style>