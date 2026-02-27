<script>
    import { Star, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from 'lucide-svelte';
    import { getCategoryIconPath } from '$lib/data/categoryIcons.js';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { fade, fly } from 'svelte/transition'; // 드롭다운 애니메이션

    let { data } = $props();
    
    let sortOption = $state(data.sort || 'rating'); 
    
    // 🔥 커스텀 드롭다운 상태
    let isSortOpen = $state(false);
    const sortLabels = { distance: '거리순', rating: '별점순', review: '리뷰순' };

    const zones = ['전체', '욱일', '고대앞', '홍대사이', '조치원역', '기타'];

    // 🔥 정렬 변경 함수
    function handleSortChange(val) {
        sortOption = val;
        isSortOpen = false; // 선택하면 메뉴 닫기
        const url = new URL($page.url);
        url.searchParams.set('sort', sortOption);
        url.searchParams.set('page', '1');
        goto(url.toString(), { invalidateAll: true }); 
    }

    function handleZoneChange(newZone) {
        const url = new URL($page.url);
        url.searchParams.set('zone', newZone);
        url.searchParams.set('page', '1'); 
        goto(url.toString(), { invalidateAll: true });
    }

    let displayRestaurants = $derived(data.restaurants || []);

    function getPageLink(pageNum) {
        const url = new URL($page.url);
        url.searchParams.set('page', pageNum);
        url.searchParams.set('sort', sortOption);
        url.searchParams.set('zone', data.currentZone); 
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

<div class="flex flex-col w-full min-h-screen bg-[#F8F9FA] max-w-md mx-auto pb-24" onclick={() => isSortOpen = false}>
    
    <header class="bg-white sticky top-0 z-20 border-b border-gray-100 shadow-sm">
        <div class="px-4 pt-6 pb-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <a href="/" class="text-gray-800 p-1 -ml-2 rounded-full active:bg-gray-100"><ChevronLeft size={28} /></a>
                <img src={getCategoryIconPath(data.category)} alt={data.category} class="w-10 h-10 object-contain pb-1" />
                <h1 class="text-2xl font-bold font-['Jua'] text-gray-900 pt-1">{data.category}</h1>
            </div>
            
            <div class="relative">
                <button onclick={(e) => { e.stopPropagation(); isSortOpen = !isSortOpen; }} 
                        class="flex items-center gap-1.5 text-sm font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 transition-colors">
                    {sortLabels[sortOption]}
                    <ChevronDown size={14} class="text-gray-400 transition-transform duration-200 {isSortOpen ? 'rotate-180' : ''}" />
                </button>
                
                {#if isSortOpen}
                    <div class="absolute right-0 top-full mt-2 w-28 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-50 flex flex-col" 
                         transition:fly={{ y: -10, duration: 200 }}>
                        {#each Object.entries(sortLabels) as [val, label]}
                            <button onclick={() => handleSortChange(val)} 
                                    class="w-full text-left px-4 py-2.5 text-sm transition-colors {sortOption === val ? 'text-[#8B0029] font-bold bg-red-50' : 'text-gray-700 hover:bg-gray-50 font-medium'}">
                                {label}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
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
                                <span class="text-xs text-gray-500">리뷰 {restaurant.postCount}개</span>
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
            <a href={getPageLink(1)} class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 {data.pagination.page === 1 ? 'pointer-events-none opacity-30' : ''}">
                <ChevronsLeft size={18}/>
            </a>
            <a href={getPageLink(Math.max(1, data.pagination.page - 1))} class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 {data.pagination.page === 1 ? 'pointer-events-none opacity-30' : ''}">
                <ChevronLeft size={18}/>
            </a>
            {#each visiblePages as p}
                <a href={getPageLink(p)} class="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-colors {data.pagination.page === p ? 'bg-black text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100'}">
                    {p}
                </a>
            {/each}
            <a href={getPageLink(Math.min(data.pagination.totalPages, data.pagination.page + 1))} class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 {data.pagination.page === data.pagination.totalPages ? 'pointer-events-none opacity-30' : ''}">
                <ChevronRight size={18}/>
            </a>
            <a href={getPageLink(data.pagination.totalPages)} class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 {data.pagination.page === data.pagination.totalPages ? 'pointer-events-none opacity-30' : ''}">
                <ChevronsRight size={18}/>
            </a>
        </div>
    {/if}
</div>

<style> .no-scrollbar::-webkit-scrollbar { display: none; } </style>