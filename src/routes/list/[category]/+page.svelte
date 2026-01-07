<script>
	// [수정] ChevronsLeft, ChevronsRight 아이콘 추가
	import { Star, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-svelte';
	import { getCategoryIconPath } from '$lib/data/categoryIcons.js';
	import { page } from '$app/stores';

	let { data } = $props();
	
	let sortOption = $state('rating'); 

	let sortedRestaurants = $derived.by(() => {
		const list = [...(data.restaurants || [])];
		if (sortOption === 'rating') return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
		if (sortOption === 'review') return list.sort((a, b) => (b.ratingCount || 0) - (a.ratingCount || 0));
		return list.sort((a, b) => (a.distanceInMeters || 9999) - (b.distanceInMeters || 9999));
	});

	function getPageLink(pageNum) {
		const url = new URL($page.url);
		url.searchParams.set('page', pageNum);
		return url.toString();
	}

	// [수정] 5개 단위 블록 페이지네이션 로직 (1~5, 6~10 ...)
	let visiblePages = $derived.by(() => {
		const current = data.pagination.page;
		const total = data.pagination.totalPages;
		const blockSize = 5;

		// 현재 페이지가 속한 블록 계산 (예: 1~5페이지는 1블록, 6~10페이지는 2블록)
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
	
	<header class="bg-white px-4 pt-6 pb-4 sticky top-0 z-10 border-b border-gray-100 flex items-center justify-between shadow-sm">
		<div class="flex items-center gap-2">
			<a href="/" class="text-gray-800 p-1 -ml-2 rounded-full active:bg-gray-100"><ChevronLeft size={28} /></a>
			<img src={getCategoryIconPath(data.category)} alt={data.category} class="w-10 h-10 object-contain pb-1" />
			<h1 class="text-2xl font-bold font-['Jua'] text-gray-900 pt-1">{data.category}</h1>
		</div>
		<select bind:value={sortOption} class="bg-transparent font-medium text-sm text-gray-500 text-right pr-6 focus:outline-none">
			<option value="distance">거리순</option>
			<option value="rating">별점순</option>
			<option value="review">리뷰순</option>
		</select>
	</header>

	<div class="flex flex-col p-4 gap-4">
		{#if sortedRestaurants.length > 0}
			{#each sortedRestaurants as restaurant (restaurant.id)}
				<a href="/restaurant/{restaurant.id}" class="group block bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.99] transition-all">
					<div class="flex gap-4 items-start">
						<div class="w-20 h-20 rounded-xl bg-gray-50 flex-shrink-0 flex items-center justify-center border border-gray-100">
							<img src={getCategoryIconPath(data.category)} alt={restaurant.name} class="w-10 h-10 object-contain opacity-80" />
						</div>

						<div class="flex-1 min-w-0 flex flex-col gap-1">
							<h3 class="text-lg font-bold text-gray-900 truncate font-['Noto_Sans_KR'] leading-tight">{restaurant.name}</h3>
							<p class="text-xs text-blue-500 font-medium">신정문으로부터 {restaurant.distanceInMeters ?? 0}m</p>
							<div class="flex items-center gap-2 mt-1 flex-wrap">
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
								<span class="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-[10px] text-blue-600 font-medium whitespace-nowrap">
									{k.keyword} <span class="ml-1 font-bold text-blue-400">{k.count}</span>
								</span>
							{/each}
						</div>
					{/if}
				</a>
			{/each}
		{:else}
			<div class="py-20 text-center text-gray-400"><p>식당이 없습니다.</p></div>
		{/if}
	</div>

	{#if data.pagination.totalPages > 1}
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