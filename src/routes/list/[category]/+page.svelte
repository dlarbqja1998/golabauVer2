<script>
    import { ChevronLeft } from 'lucide-svelte'; // 뒤로가기 아이콘
    let { data } = $props();
    
    // 서버에서 받은 데이터 꺼내기
    let { categoryName, restaurantList } = data;
</script>

<div class="flex flex-col w-full min-h-screen bg-white max-w-md mx-auto relative shadow-sm">
    
    <header class="flex items-center p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <a href="/" class="p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-full">
            <ChevronLeft size={24} />
        </a>
        <h1 class="text-2xl font-bold font-['Jua'] ml-2 text-gray-800">
            {categoryName} 
        </h1>
    </header>

    <main class="p-4 pb-24 flex flex-col gap-3">
        {#if restaurantList.length > 0}
            {#each restaurantList as store}
                <div class="p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-1 hover:border-blue-200 transition-colors bg-white">
                    <h2 class="text-lg font-bold font-['Gowun_Dodum'] text-gray-900">
                        {store.name}
                    </h2>
                    <p class="text-sm text-gray-500 font-['Noto_Sans_KR']">
                        {store.main_category} 전문점
                    </p>
                </div>
            {/each}
        {:else}
            <div class="py-20 text-center text-gray-400 font-['Noto_Sans_KR']">
                아직 등록된 {categoryName} 맛집이 없어요 😭
            </div>
        {/if}
    </main>

</div>