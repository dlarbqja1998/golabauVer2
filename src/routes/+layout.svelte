<script>
	import './layout.css';
	import { page } from '$app/stores';
	import { Home, Search, User, MessageCircle } from 'lucide-svelte';

	// Svelte 5 Props (data 추가!)
	let { data, children } = $props();

	// ==========================================
	// 🔥 [PostHog Who] 유저 명찰(Identify) 달아주기
	// ==========================================
	$effect(() => {
		// 브라우저 환경이고 posthog이 제대로 로드되었을 때만 실행
		if (typeof window !== 'undefined' && window.posthog) {
			if (data?.user) {
				const user = data.user;
				
				// 1. 유저 고유 ID로 신분증 발급 + 상세 프로필 동시 등록!
				// identify의 두 번째 인자로 프로필 객체를 넘기는 것이 공식 권장 방식입니다.
				window.posthog.identify(user.id, {
					name: user.nickname, // ⭐️ PostHog 대시보드 리스트에 보여질 대표 이름
					nickname: user.nickname,
					grade: user.grade,        
					gender: user.gender,      
					birth_year: user.birthYear,
					college: user.college,    
					department: user.department 
				});
			} else {
				// 2. 로그아웃 시 기존 유저의 세션과 섞이지 않도록 익명(초기화) 처리
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