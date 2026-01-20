<script>
	import { ChevronLeft, Heart, MessageCircle, User, Plus, MapPin } from 'lucide-svelte';
	import { fade } from 'svelte/transition';

	// ★ 1. 서버에서 가져온 진짜 데이터 받기
	let { data } = $props();

	// 2. 탭 필터 & 정렬
	const tabs = ['전체', '신정문앞'];
	let activeTab = $state('전체'); 
	let activeSort = $state('latest'); 

	// ★ 3. 날짜를 "방금 전", "3일 전"으로 바꿔주는 마법사 함수
	function timeAgo(date) {
		if (!date) return '';
		const seconds = Math.floor((new Date() - new Date(date)) / 1000);
		if (seconds < 60) return '방금 전';
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}분 전`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}시간 전`;
		const days = Math.floor(hours / 24);
		return `${days}일 전`;
	}

	// 4. 필터링 로직 (data.posts를 사용!)
	let filteredPosts = $derived.by(() => {
		// 서버에서 가져온 posts 사용
		let result = data.posts;

		// 탭 필터링 (지역)
		if (activeTab !== '전체') {
			result = result.filter(p => p.area === activeTab);
		}

		// 정렬 (최신순 / 공감순)
		if (activeSort === 'likes') { 
			return [...result].sort((a, b) => (b.likes || 0) - (a.likes || 0));
		} else { 
			return [...result].sort((a, b) => b.id - a.id);
		}
	});
</script>

<div class="flex flex-col w-full min-h-screen bg-[#F8F9FA] max-w-md mx-auto relative shadow-sm">
	
	<header class="bg-white sticky top-0 z-30 border-b border-gray-100 shadow-sm">
		<div class="flex items-center justify-between p-4">
			<div class="flex items-center">
				<a href="/" class="p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-full">
					<ChevronLeft size={24} />
				</a>
				<h1 class="text-2xl font-bold font-['Jua'] ml-1 text-gray-800">
					골라바쓔
				</h1>
			</div>

			<div class="flex gap-2 text-xs font-medium text-gray-400">
				<button 
					onclick={() => activeSort = 'latest'} 
					class={activeSort === 'latest' ? 'text-gray-900 font-bold' : 'hover:text-gray-600'}
				>
					최신순
				</button>
				<span class="text-gray-300">|</span>
				<button 
					onclick={() => activeSort = 'likes'} 
					class={activeSort === 'likes' ? 'text-gray-900 font-bold' : 'hover:text-gray-600'}
				>
					공감순
				</button>
			</div>
		</div>
	</header>

	<div class="px-4 py-6 flex gap-6">
		{#each tabs as tab}
			<button 
				onclick={() => activeTab = tab}
				class="pb-1 text-sm font-bold transition-all duration-200 
				{activeTab === tab 
					? 'text-red-600 border-b-[3px] border-red-600' 
					: 'text-gray-400 border-b-[3px] border-transparent hover:text-gray-500'}"
			>
				{tab}
			</button>
		{/each}
	</div>

	<main class="px-4 pb-24 flex flex-col gap-3">
		{#if filteredPosts.length === 0}
			<div class="py-20 text-center text-gray-400 text-sm">
				<p>아직 등록된 글이 없어요 🥲</p>
				<p>첫 번째 후기를 남겨보세요!</p>
			</div>
		{:else}
			{#each filteredPosts as post (post.id)}
				<div class="p-5 rounded-xl border border-gray-100 shadow-sm bg-white flex flex-col gap-4 cursor-pointer hover:border-red-100 transition-colors" transition:fade>
					
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<div class="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400">
								<User size={18} strokeWidth={1.5} />
							</div>
							<div class="flex flex-col">
								<div class="flex items-center gap-1.5">
									<span class="text-sm font-bold text-gray-900">{post.writerName || '익명'}</span>
									<span class="text-[10px] text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded-md">
										{post.writerBadge || '뉴비'}
									</span>
								</div>
								<span class="text-[10px] text-gray-400">{timeAgo(post.createdAt)}</span>
							</div>
						</div>

						<div class="flex items-center gap-1 text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
							<MapPin size={12} class="text-gray-400" />
							<span class="text-[11px] font-bold text-gray-600 tracking-tight">{post.restaurant}</span>
						</div>
					</div>

					<div class="flex justify-between gap-4">
						<div class="flex-1 flex flex-col min-w-0 justify-start">
							<h3 class="text-base font-bold text-gray-800 mb-1 line-clamp-1">
								{post.title}
							</h3>
							<p class="text-sm text-gray-500 line-clamp-3 leading-relaxed font-['Noto_Sans_KR']">
								{post.content}
							</p>
						</div>

						<div class="w-24 h-24 flex-shrink-0">
							{#if post.imageUrl}
								<img 
									src={post.imageUrl} 
									alt="thumbnail" 
									class="w-full h-full object-cover rounded-lg bg-gray-100 border border-gray-100 shadow-sm"
								/>
							{:else}
								<div class="w-full h-full rounded-lg bg-[#FFF5F5] border border-red-50 flex flex-col items-center justify-center text-center">
									<span class="text-red-300 font-['Jua'] text-sm leading-tight transform -rotate-6">
										골라<br/><span class="text-red-400">바쓔</span>
									</span>
								</div>
							{/if}
						</div>
					</div>

					<div class="flex items-center gap-5 pt-2 border-t border-gray-50">
						<div class="flex items-center gap-1.5">
							<Heart color="#DC143C" size={20} strokeWidth={2.5} />
							<span class="text-sm font-bold text-[#DC143C]">
								{post.likes || 0}
							</span>
						</div>
						
						<div class="flex items-center gap-1.5 text-gray-400">
							<MessageCircle size={20} />
							<span class="text-sm font-bold">0</span>
						</div>
					</div>

				</div>
			{/each}
		{/if}
	</main>

	<a 
		href="/golabassyu/write" 
		class="fixed bottom-24 right-5 z-50 w-14 h-14 rounded-full bg-[#DC143C] text-white shadow-[0_4px_14px_rgba(220,20,60,0.4)] flex items-center justify-center active:scale-95 transition-transform hover:brightness-110"
		aria-label="글쓰기"
	>
		<Plus size={32} strokeWidth={2.5} />
	</a>

</div>