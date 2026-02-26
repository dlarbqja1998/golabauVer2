<script>
	// [수정] ChevronDown 아이콘 추가
	import { Search, MapPin, Star, ChevronLeft, ChevronDown } from 'lucide-svelte';
	import { getCategoryIconPath } from '$lib/data/categoryIcons.js';

	let { data } = $props();
	let query = $derived(data.query || ''); 

	let sortOption = $state('distance'); 

	let sortedRestaurants = $derived.by(() => {
		const list = [...(data.restaurants || [])];
		
		if (sortOption === 'rating') {
			return list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); 
		} else if (sortOption === 'review') {
			return list.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0)); 
		} else {
			return list.sort((a, b) => (a.distanceInMeters || 9999) - (b.distanceInMeters || 9999)); 
		}
	});
</script>

<div class="flex flex-col w-full min-h-screen bg-[#F8F9FA] max-w-md mx-auto pb-24">
	
	<header class="bg-white px-4 pt-6 pb-4 sticky top-0 z-10 border-b border-gray-100 shadow-[0_2px_10px_-5px_rgba(0,0,0,0.05)]">
		<div class="flex items-center gap-3 mb-3">
			<a href="/" class="text-gray-800 hover:text-gray-600 transition-colors p-1 -ml-2 rounded-full active:bg-gray-100">
				<ChevronLeft size={28} />
			</a>
			<h1 class="text-2xl font-bold font-['Jua'] text-gray-900 pt-1">검색</h1>
		</div>

		<form method="GET" action="/search" class="relative">
			<div class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
				<Search size={20} />
			</div>
			
			<input 
				type="text" 
				name="q" 
				value={query}
				placeholder="식당 이름 검색" 
				class="w-full h-12 pl-12 pr-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-sm font-medium shadow-sm"
				autocomplete="off"
			/>
		</form>
	</header>

	<div class="flex flex-col p-4 gap-4">
		{#if data.query}
			<div class="flex items-center justify-between px-1">
				<p class="text-sm text-gray-500 font-medium">
					'<span class="text-black font-bold">{data.query}</span>' 검색 결과 <span class="text-blue-500 font-bold">{data.restaurants.length}</span>건
				</p>
				
				<div class="relative flex items-center">
					<select 
						bind:value={sortOption}
						class="appearance-none bg-transparent font-medium text-sm text-gray-500 focus:ring-0 cursor-pointer text-right pr-5 focus:outline-none focus:text-gray-800 transition-colors z-10"
						aria-label="정렬 선택"
					>
						<option value="distance">거리순</option>
						<option value="rating">별점순</option>
						<option value="review">리뷰순</option>
					</select>
					<div class="absolute right-0 text-gray-400 pointer-events-none">
						<ChevronDown size={14} />
					</div>
				</div>
			</div>

			{#if sortedRestaurants.length > 0}
				{#each sortedRestaurants as restaurant (restaurant.id)}
					<a href="/restaurant/{restaurant.id}" class="group block bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.99] transition-all cursor-pointer hover:border-blue-200">
						<div class="flex gap-4 items-start">
							<div class="w-16 h-16 rounded-xl bg-gray-50 flex-shrink-0 flex items-center justify-center border border-gray-100 group-hover:bg-blue-50 transition-colors">
								<img src={getCategoryIconPath(restaurant.mainCategory)} alt={restaurant.name} class="w-8 h-8 object-contain opacity-80" />
							</div>

							<div class="flex-1 min-w-0 flex flex-col gap-1">
								<h3 class="text-lg font-bold text-gray-900 truncate font-['Noto_Sans_KR'] leading-tight group-hover:text-blue-600 transition-colors">
									{restaurant.name}
								</h3>
								<p class="text-xs text-blue-500 font-medium flex items-center gap-0.5">
									<MapPin size={10} /> 신정문 {restaurant.distanceInMeters ?? 0}m
								</p>

								<div class="flex items-center gap-2 mt-1">
									<div class="flex items-center gap-1">
										<Star size={12} class="fill-yellow-400 text-yellow-400" />
										<span class="text-xs font-bold text-gray-800">{restaurant.rating ? restaurant.rating.toFixed(1) : '0.0'}</span>
									</div>
									<div class="w-[1px] h-2 bg-gray-300"></div>
									<span class="text-xs text-gray-500">리뷰 {restaurant.reviewCount}개</span>
									<span class="text-[10px] text-gray-400 ml-auto border border-gray-100 px-1.5 py-0.5 rounded bg-gray-50">{restaurant.mainCategory}</span>
								</div>
							</div>
						</div>
					</a>
				{/each}
			{:else}
				<div class="py-20 text-center flex flex-col items-center justify-center gap-3">
					<div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-2">🤔</div>
					<p class="text-gray-500 font-medium">검색 결과가 없어요.</p>
					<p class="text-xs text-gray-400">다른 키워드로 검색해보세요!</p>
				</div>
			{/if}
		{:else}
			<div class="py-24 text-center flex flex-col items-center justify-center gap-4 opacity-40">
				<Search size={48} class="text-gray-300" />
				<p class="text-gray-400 font-medium text-sm">
					<br>식당 이름을 검색해보세요!
				</p>
			</div>
		{/if}
	</div>
</div>