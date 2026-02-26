<script>
	import { Star, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-svelte';
	import { getCategoryIconPath } from '$lib/data/categoryIcons.js';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let { data } = $props();
	
	let sortOption = $state(data.sort || 'rating'); 

	// 🔥 우리가 만든 5개 구역 + 전체
	const zones = ['전체', '욱일', '고대앞', '홍대사이', '조치원역', '기타'];

	// 정렬 변경
	function handleSortChange() {
		const url = new URL($page.url);
		url.searchParams.set('sort', sortOption);
		url.searchParams.set('page', '1');
		goto(url.toString(), { invalidateAll: true }); 
	}

	// 🔥 구역 탭 변경
	function handleZoneChange(newZone) {
		const url = new URL($page.url);
		url.searchParams.set('zone', newZone);
		url.searchParams.set('page', '1'); // 구역을 바꾸면 1페이지로!
		goto(url.toString(), { invalidateAll: true });
	}

	let displayRestaurants = $derived(data.restaurants || []);

	function getPageLink(pageNum) {
		const url = new URL($page.url);
		url.searchParams.set('page', pageNum);
		url.searchParams.set('sort', sortOption);
		url.searchParams.set('zone', data.currentZone); // 🔥 페이지 넘길 때 구역 정보도 잃어버리지 않게 유지!
		return url.toString();
	}

	let visiblePages = $derived.by(() => {
		const current = data.pagination.page;
		const total = data.pagination.totalPages;
		if (total === 0) return [];
		const blockSize = 5;
		const currentBlock = Math.ceil(current / blockSize);
		const start = (currentBlock - 1) * blockSize + 1;
		const end = Math.min(start + blockSize - 1, total);

		const pages = [];
		for (let i = start; i <= end; i++) {
			pages.push(i);
		}
		return pages;
	});
</script>

<div class="flex flex-col w-full min-h-screen bg-[#F8F9FA] max-w-md mx-auto pb-24">
	
	<header class="bg-white sticky top-0 z-10 border-b border-gray-100 shadow-sm">
		<div class="px-4 pt-6 pb-2 flex items-center justify-between">
			<div class="flex items-center gap-2">
				<a href="/" class="text-gray-800 p-1 -ml-2 rounded-full active:bg-gray-100"><ChevronLeft size={28} /></a>
				<img src={getCategoryIconPath(data.category)} alt={data.category} class="w-10 h-10 object-contain pb-1" />
				<h1 class="text-2xl font-bold font-['Jua'] text-gray-900 pt-1">{data.category}</h1>
			</div>
			<select bind:value={sortOption} onchange={handleSortChange} class="bg-transparent font-medium text-sm text-gray-500 text-right pr-6 focus:outline-none">
				<option value="distance">거리순</option>
				<option value="rating">별점순</option>
				<option value="review">리뷰순</option>
			</select>
		</div>

		<div class="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
			{#each zones as zone}
				<button 
					onclick={() => handleZoneChange(zone)}
					class="whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-bold transition-all border
						{data.currentZone === zone 
							? 'bg-gray-900 text-white border-gray-900 shadow-md' 
							: 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}"
				>
					{zone}
				</button>
			{/each}
		</div>
	</header>

	<div class="flex flex-col p-4 gap-4">
		{#if displayRestaurants.length > 0}
			{#each displayRestaurants as restaurant (restaurant.id)}
				<a href="/restaurant/{restaurant.id}" class="group block bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.99] transition-all">
					<div class="flex gap-4 items-start">
						<div class="w-20 h-20 rounded-xl bg-gray-50 flex-shrink-0 flex items-center justify-center border border-gray-100">
							<img src={getCategoryIconPath(data.category)} alt={restaurant.name} class="w-10 h-10 object-contain opacity-80" />
						</div>

						<div class="flex-1 min-w-0 flex flex-col gap-1">
							<h3 class="text-lg font-bold text-gray-900 truncate font-['Noto_Sans_KR'] leading-tight">{restaurant.name}</h3>
							
							<div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
								<span class="text-[11px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold border border-purple-100">{restaurant.zone}</span>
								<span class="text-[11px] bg-red-50 text-[#6b0d0d] px-1.5 py-0.5 rounded font-bold">도보 {restaurant.walkTimeInMinutes ?? '?'}분</span>
								<span class="text-xs text-gray-400 font-medium">({restaurant.distanceInMeters ?? 0}m)</span>
							</div>

							<div class="flex items-center gap-2 mt-1.5 flex-wrap">
								<div class="flex items-center gap-1">
									<Star size={14} class="fill-yellow-400 text-yellow-400" />
									<span class="text-sm font-bold text-gray-800">{restaurant.rating ? restaurant.rating.toFixed(1) : '0.0'}</span>
								</div>
								<div class="w-[1px] h-3 bg-gray-300"></div>
								<span class="text-xs text-gray-500">키워드 {restaurant.keywordReviewCount}개</span>
								<div class="w-[1px] h-3 bg-gray-300"></div>
								<span class="text-xs text-gray-500">리뷰 {restaurant.ratingCount}개</span>
							</div>
						</div>
					</div>

					{#if restaurant.topKeywords && restaurant.topKeywords.length > 0}
						<div class="mt-3 pt-3 border-t border-gray-50 flex gap-2 overflow-x-auto no-scrollbar">
							{#each restaurant.topKeywords as k}
								<span class="inline-flex items-center px-2 py-1 rounded-md bg-red-50 text-[10px] text-[#6b0d0d] font-medium whitespace-nowrap">
									{k.keyword} <span class="ml-1 font-bold text-blue-400">{k.count}</span>
								</span>
							{/each}
						</div>
					{/if}
				</a>
			{/each}
		{:else}
			<div class="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
				<span class="text-4xl">🥲</span>
				<p class="font-medium text-sm">해당 구역에는 식당이 없어요!</p>
			</div>
		{/if}
	</div>

	{#if visiblePages.length > 0}
		<div class="flex justify-center items-center gap-1 py-6 pb-10">
			
			<a href={getPageLink(1)} 
			   class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 {data.pagination.page === 1 ? 'pointer-events-none opacity-30' : ''}">
				<ChevronsLeft size={18}/>
			</a>

			<a href={getPageLink(Math.max(1, data.pagination.page - 1))} 
			   class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 {data.pagination.page === 1 ? 'pointer-events-none opacity-30' : ''}">
				<ChevronLeft size={18}/>
			</a>

			{#each visiblePages as p}
				<a href={getPageLink(p)} 
				   class="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors 
				   {data.pagination.page === p 
						? 'bg-black text-white shadow-md' 
						: 'bg-white text-gray-500 hover:bg-gray-100'}">
					{p}
				</a>
			{/each}

			<a href={getPageLink(Math.min(data.pagination.totalPages, data.pagination.page + 1))} 
			   class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 {data.pagination.page === data.pagination.totalPages ? 'pointer-events-none opacity-30' : ''}">
				<ChevronRight size={18}/>
			</a>

			<a href={getPageLink(data.pagination.totalPages)} 
			   class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 {data.pagination.page === data.pagination.totalPages ? 'pointer-events-none opacity-30' : ''}">
				<ChevronsRight size={18}/>
			</a>

		</div>
	{/if}
</div>

<style> .no-scrollbar::-webkit-scrollbar { display: none; } </style>