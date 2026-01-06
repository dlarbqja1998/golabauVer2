<script>
	import './layout.css';
	import { Home, Search, ClipboardList, User } from 'lucide-svelte';
	let { children } = $props();
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

	<nav class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100">
		<div class="max-w-md mx-auto flex justify-around items-center py-3">
			<button class="flex flex-col items-center gap-1 text-red-600">
				<Home size={24} />
				<span class="text-[10px] font-bold">홈</span>
			</button>
			<button class="flex flex-col items-center gap-1 text-gray-400">
				<Search size={24} />
				<span class="text-[10px] font-medium">검색</span>
			</button>
			<button class="flex flex-col items-center gap-1 text-gray-400">
				<ClipboardList size={24} />
				<span class="text-[10px] font-medium">리뷰</span>
			</button>
			<button class="flex flex-col items-center gap-1 text-gray-400">
				<User size={24} />
				<span class="text-[10px] font-medium">마이</span>
			</button>
		</div>
	</nav>
</div>