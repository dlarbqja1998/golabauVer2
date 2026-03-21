<script lang="ts">
	import './layout.css';
	import { page } from '$app/stores';
	import { Home, Search, User, MessageCircle } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { PUBLIC_VITE_VAPID_PUBLIC_KEY } from '$env/static/public';

	const APP_VERSION = '2.1.2';
	let lastPageviewKey = '';

	type PageDataRecord = Record<string, any>;

	function buildPageviewProperties(url: URL, pageData: PageDataRecord, hasSession: boolean) {
		const pathname = url.pathname;
		const baseProperties: Record<string, unknown> = {
			pathname,
			current_url: url.toString(),
			page_group: 'general',
			page_type: 'generic',
			is_logged_in: hasSession
		};

		if (pathname === '/') {
			return {
				...baseProperties,
				page_group: 'landing',
				page_type: 'home'
			};
		}

		if (pathname === '/search') {
			return {
				...baseProperties,
				page_group: 'restaurant',
				page_type: 'search',
				has_query: Boolean(pageData.query),
				search_query: pageData.query || null,
				result_count: Array.isArray(pageData.restaurants) ? pageData.restaurants.length : null
			};
		}

		if (pathname.startsWith('/list/')) {
			return {
				...baseProperties,
				page_group: 'restaurant',
				page_type: 'category_list',
				category_name: pageData.category || null,
				sort: pageData.sort || null,
				zone: pageData.currentZone || null,
				page_number: pageData.pagination?.page ?? 1,
				result_count: Array.isArray(pageData.restaurants) ? pageData.restaurants.length : null
			};
		}

		if (pathname.startsWith('/restaurant/')) {
			return {
				...baseProperties,
				page_group: 'restaurant',
				page_type: 'restaurant_detail',
				restaurant_id: pageData.restaurant?.id ?? null,
				restaurant_name: pageData.restaurant?.placeName ?? null,
				main_category: pageData.restaurant?.mainCategory ?? null,
				zone: pageData.restaurant?.zone ?? null
			};
		}

		if (pathname === '/golabassyu') {
			return {
				...baseProperties,
				page_group: 'community',
				page_type: 'golabassyu_list'
			};
		}

		if (pathname === '/shop') {
			return {
				...baseProperties,
				page_group: 'utility',
				page_type: 'point_shop'
			};
		}

		if (pathname === '/my') {
			return {
				...baseProperties,
				page_group: 'account',
				page_type: 'my_page'
			};
		}

		if (pathname === '/notices') {
			return {
				...baseProperties,
				page_group: 'policy',
				page_type: 'notices'
			};
		}

		if (pathname === '/meetup') {
			return {
				...baseProperties,
				page_group: 'meetup',
				page_type: 'meetup_list'
			};
		}

		if (pathname === '/meetup/create') {
			return {
				...baseProperties,
				page_group: 'meetup',
				page_type: 'meetup_create'
			};
		}

		if (pathname.startsWith('/meetup/')) {
			return {
				...baseProperties,
				page_group: 'meetup',
				page_type: 'meetup_room',
				room_id: pageData.room?.id ?? null,
				meeting_type: pageData.room?.meetingType ?? null,
				restaurant_name: pageData.room?.restaurantName ?? null,
				room_status: pageData.room?.status ?? null
			};
		}

		if (pathname === '/roulette') {
			return {
				...baseProperties,
				page_group: 'utility',
				page_type: 'roulette'
			};
		}

		return baseProperties;
	}

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

	function capturePushSubscriptionFailure(reason: string, errorName?: string) {
		if (typeof window === 'undefined' || !window.posthog) return;

		window.posthog.capture('push_subscription_fail', {
			reason,
			error_name: errorName || null,
			permission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
			is_secure_context: typeof window !== 'undefined' ? window.isSecureContext : false,
			platform: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
			is_pwa:
				typeof window !== 'undefined'
					? window.matchMedia('(display-mode: standalone)').matches ||
						(window.navigator as Navigator & { standalone?: boolean }).standalone === true
					: false
		});
	}

	async function registerPushSubscription() {
		if (!data?.user) return;
		if (!PUBLIC_VITE_VAPID_PUBLIC_KEY) {
			capturePushSubscriptionFailure('missing_vapid_public_key');
			return;
		}
		if (typeof window === 'undefined' || !window.isSecureContext) {
			capturePushSubscriptionFailure('insecure_context');
			return;
		}
		if (!('serviceWorker' in navigator)) {
			capturePushSubscriptionFailure('service_worker_unsupported');
			return;
		}
		if (!('PushManager' in window)) {
			capturePushSubscriptionFailure('push_manager_unsupported');
			return;
		}
		if (!('Notification' in window)) {
			capturePushSubscriptionFailure('notification_unsupported');
			return;
		}
		if (Notification.permission === 'denied') {
			capturePushSubscriptionFailure('permission_denied');
			return;
		}

		const registration = await navigator.serviceWorker.ready;

		let permission: NotificationPermission = Notification.permission;
		if (permission === 'default') {
			permission = await Notification.requestPermission();
		}

		if (permission !== 'granted') {
			capturePushSubscriptionFailure('permission_not_granted');
			return;
		}

		let subscription = await registration.pushManager.getSubscription();
		if (!subscription) {
			try {
				subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: base64UrlToUint8Array(PUBLIC_VITE_VAPID_PUBLIC_KEY)
				});
			} catch (error) {
				const typedError = error as Error;
				capturePushSubscriptionFailure('subscribe_failed', typedError.name);
				throw error;
			}
		}

		const response = await fetch('/api/push', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				subscription: subscription.toJSON(),
				userAgent: navigator.userAgent
			})
		});

		if (!response.ok) {
			capturePushSubscriptionFailure('save_subscription_failed');
			return;
		}

		if (typeof window !== 'undefined' && window.posthog) {
			window.posthog.capture('push_subscription_success', {
				permission,
				is_secure_context: window.isSecureContext,
				platform: navigator.userAgent,
				is_pwa:
					window.matchMedia('(display-mode: standalone)').matches ||
					(window.navigator as Navigator & { standalone?: boolean }).standalone === true
			});
		}
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
	$effect(() => {
		if (typeof window === 'undefined' || !window.posthog) return;

		const routeData = ($page.data ?? {}) as PageDataRecord;
		const pageviewKey = JSON.stringify({
			pathname: $page.url.pathname,
			search: $page.url.search,
			category: routeData.category ?? null,
			page: routeData.pagination?.page ?? null,
			restaurantId: routeData.restaurant?.id ?? null,
			roomId: routeData.room?.id ?? null,
			query: routeData.query ?? null,
			hasSession: Boolean(data?.hasSession)
		});

		if (lastPageviewKey === pageviewKey) return;
		lastPageviewKey = pageviewKey;

		window.posthog.capture('$pageview', buildPageviewProperties($page.url, routeData, Boolean(data?.hasSession)));
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
