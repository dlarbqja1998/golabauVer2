<script lang="ts">
	import './layout.css';
	import { page } from '$app/stores';
	import { Home, Search, User, MessageCircle } from 'lucide-svelte';
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { PUBLIC_VITE_VAPID_PUBLIC_KEY } from '$env/static/public';

	const APP_VERSION = '2.1.2';

	function base64UrlToUint8Array(base64Url: string) {
		const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
		const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
		const rawData = window.atob(base64);
		const outputArray = new Uint8Array(rawData.length);

		for (let i = 0; i < rawData.length; i += 1) {
			outputArray[i] = rawData.charCodeAt(i);
		}

		return outputArray;
	}

	async function registerPushSubscription() {
		if (!data?.user) return;
		if (!PUBLIC_VITE_VAPID_PUBLIC_KEY) return;
		if (typeof window === 'undefined' || !window.isSecureContext) return;
		if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
		if (Notification.permission === 'denied') return;

		const registration = await navigator.serviceWorker.ready;

		let permission: NotificationPermission = Notification.permission;
		if (permission === 'default') {
			permission = await Notification.requestPermission();
		}

		if (permission !== 'granted') return;

		let subscription = await registration.pushManager.getSubscription();
		if (!subscription) {
			subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: base64UrlToUint8Array(PUBLIC_VITE_VAPID_PUBLIC_KEY)
			});
		}

		await fetch('/api/push', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				subscription: subscription.toJSON(),
				userAgent: navigator.userAgent
			})
		});
	}

	onMount(() => {
		const lastVersion = localStorage.getItem('app_version');
		if (lastVersion !== APP_VERSION) {
			localStorage.setItem('app_version', APP_VERSION);
			if ('caches' in window) {
				caches.keys().then((names) => {
					names.forEach((name) => caches.delete(name));
				});
			}
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.getRegistrations().then((regs) => {
					regs.forEach((reg) => reg.update());
				});
			}
			location.reload();
			return;
		}

		registerPushSubscription().catch((error) => {
			console.error('Push registration failed:', error);
		});
	});

	let { data, children } = $props();

	afterNavigate(() => {
		if (typeof window !== 'undefined' && window.posthog) {
			window.posthog.capture('$pageview');
		}
	});

	$effect(() => {
		console.log('PostHog 체크! 현재 유저 데이터:', data?.user);
		if (typeof window !== 'undefined' && window.posthog) {
			if (data?.user) {
				window.posthog.identify(String(data.user.id), {
					nickname: data.user.nickname
				});
			} else if (!data?.hasSession) {
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
				<span class="text-[10px] font-bold tracking-tight">골라밥슈</span>
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
