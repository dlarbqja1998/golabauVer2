<script lang="ts">
	import { onMount } from 'svelte';
	import { ChevronLeft, Plus, Users, User, ShoppingCart } from 'lucide-svelte';
	import { fade, fly } from 'svelte/transition';
	import { page } from '$app/stores';

	let { data } = $props();

	let user = $derived(data?.user);
	let rooms = $derived(data?.rooms || []);
	let myRooms = $derived(data?.myRooms || []);

	let isTestMode = $state(false);
	let activeTab = $state('준비');
    let toastMessage = $state('');
    let toastTimeout: any;

    function showToast(msg: string) {
        toastMessage = msg;
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => { toastMessage = ''; }, 2500);
    }

    $effect(() => {
        const error = $page.url.searchParams.get('error');
        if (error === 'forbidden') {
            showToast('매칭이 완료되어 참여자만 들어갈 수 있어유! 🔒');
            window.history.replaceState({}, '', '/meetup');
        }
    });

	let filteredRooms = $derived(
		activeTab === '준비' ? rooms : myRooms
	);

	onMount(() => {
		if (typeof window !== 'undefined' && 'Notification' in window) {
			if (Notification.permission === 'default') {
				Notification.requestPermission().then((permission) => {
					if (permission === 'granted' && window.posthog) {
						window.posthog.capture('completed_push_onboarding');
					}
				});
			}
		}
	});

	function changeTab(tab: string) {
		activeTab = tab;
		if (typeof window !== 'undefined' && window.posthog) {
			window.posthog.capture('meetup_tab_changed', { tab_name: tab });
		}
	}

	function getGenderText(condition: string) {
		if (condition === 'MALE') return '남자만';
		if (condition === 'FEMALE') return '여자만';
		return '성별무관';
	}
</script>

<div class="flex flex-col w-full min-h-screen bg-[#F8F9FA] max-w-md mx-auto relative pb-24 overflow-x-hidden">
	<header class="bg-white sticky top-0 z-30 p-4 flex items-center justify-between border-b border-gray-100 shadow-sm">
		<a href="/" class="p-2 -ml-2 text-gray-800 active:scale-95">
			<ChevronLeft size={24} />
		</a>
		<h1 class="text-xl font-bold font-['Jua'] text-[#8B0029]">만나볼텨?</h1>
		<a href="/shop" class="p-2 -mr-2 text-[#8B0029] active:scale-95 transition-transform" onclick={() => typeof window !== 'undefined' && window.posthog && window.posthog.capture('clicked_shop_from_meetup')}>
			<ShoppingCart size={24} />
		</a>
	</header>

	{#if user?.role === 'admin'}
		<div class="bg-gray-800 text-yellow-300 p-3 mx-4 mt-4 rounded-xl flex justify-between items-center shadow-md animate-fade-in">
			<span class="text-xs font-bold font-['Jua']">👑 관리자 테스트 모드</span>
			<label class="flex items-center gap-2 text-xs cursor-pointer font-bold">
				<input type="checkbox" bind:checked={isTestMode} class="w-4 h-4 accent-[#8B0029]" />
				참여자로 방 들어가기
			</label>
		</div>
	{/if}

	<div class="flex bg-white border-b border-gray-100 relative z-20 shadow-sm mt-2">
		{#each ['준비', '내 방과 완료'] as tab}
			<button
				onclick={() => changeTab(tab)}
				class="flex-1 py-4 flex flex-col sm:flex-row justify-center items-center gap-1 font-bold text-sm transition-colors relative {activeTab === tab
					? 'text-[#8B0029]'
					: 'text-gray-400 hover:bg-gray-50'}"
			>
				{#if tab === '준비'}
					<Users size={16} />
				{:else}
					<User size={16} />
				{/if}
				<span>{tab}</span>

				{#if activeTab === tab}
					<div
						class="absolute bottom-0 left-0 w-full h-0.5 bg-[#8B0029]"
						transition:fade={{ duration: 150 }}
					></div>
				{/if}
			</button>
		{/each}
	</div>

	<div class="px-5 mt-4 flex flex-col gap-3">
		{#if filteredRooms.length === 0}
			<div class="py-20 text-center flex flex-col items-center justify-center gap-2 animate-fade-in">
				<div class="text-4xl mb-2">😢</div>
				<h3 class="font-bold text-gray-600 font-['Jua'] text-lg">
                    {activeTab === '준비' ? '아직 모집 중인 방이 없어유' : '내 방이나 매칭된 방이 없어유'}
                </h3>
				<p class="text-gray-400 text-sm font-['Noto_Sans_KR']">
                    {#if activeTab === '준비'}
					    우측 하단 버튼을 눌러<br />직접 첫 번째 방을 만들어 보셔유!
                    {:else}
                        새로운 방을 파거나 매칭에 참여해 보셔유!
                    {/if}
				</p>
			</div>
		{:else}
			{#each filteredRooms as room}
				<a
					href="/meetup/{room.id}{isTestMode ? '?test=participant' : ''}"
					class="relative block bg-white p-5 rounded-2xl shadow-sm border {room.status === 'MATCHED' ? 'border-[#8B0029]' : 'border-gray-100'} active:scale-[0.98] transition-transform animate-fade-in hover:border-red-100 overflow-hidden"
				>
                    {#if room.status === 'MATCHED'}
                        <div class="absolute inset-0 bg-black/60 backdrop-blur-[1.5px] flex flex-col items-center justify-center z-10 transition-all">
                            <span class="text-3xl mb-1">🔒</span>
                            <span class="text-white font-bold font-['Jua'] text-lg drop-shadow-md tracking-wider text-yellow-300">매칭 성사 완료!</span>
                        </div>
                    {/if}
                    <div class="{room.status === 'MATCHED' ? 'opacity-30 blur-[1px]' : ''}">
                        <div class="flex justify-between items-start mb-2">
                            <span class="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded-md flex items-center">
                                <span>
                                    {getGenderText(room.genderCondition)} {room.headcountCondition
                                        ? `· ${room.headcountCondition}`
                                        : ''}
                                </span>
                                {#if room.creatorGrade && room.creatorGender}
                                    <span class="mx-1.5 text-gray-300 font-normal">|</span>
                                    <span class="text-[#8B0029]">
                                        {room.creatorGrade} {room.creatorGender === 'MALE' ? '남' : room.creatorGender === 'FEMALE' ? '여' : ''}
                                    </span>
                                {/if}
                            </span>
                            <span class="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded-md">
                                {new Date(room.appointmentTime).toLocaleString('ko-KR', {
                                    month: 'numeric',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                        <h2 class="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{room.title}</h2>
                        <p class="text-sm text-gray-500 flex items-center gap-1 font-bold">
                            📍 {room.restaurantName}
                        </p>
                    </div>
				</a>
			{/each}
		{/if}
	</div>

	<div class="fixed bottom-20 left-0 right-0 max-w-md mx-auto px-4 pointer-events-none z-40">
		<div class="flex justify-end pointer-events-auto">
			<a
				href="/meetup/create"
				class="bg-[#8B0029] text-white w-14 h-14 rounded-full shadow-[0_4px_15px_rgba(139,0,41,0.4)] flex items-center justify-center hover:bg-[#6b0d0d] active:scale-95 transition-transform"
			>
				<Plus size={28} />
			</a>
		</div>
	</div>
</div>

{#if toastMessage}
	<div class="fixed top-20 left-1/2 -translate-x-1/2 bg-[#9e1b34]/95 backdrop-blur-sm text-white px-5 py-3 rounded-full shadow-2xl text-sm font-bold z-[10000] whitespace-nowrap" transition:fly={{ y: -20, duration: 300 }}>
		{toastMessage}
	</div>
{/if}

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: scale(0.98);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	.animate-fade-in {
		animation: fade-in 0.2s ease-out;
	}
</style>