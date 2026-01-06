<script>
	import { getCategoryIconPath } from '$lib/data/categoryIcons.js';

	let { data } = $props();
	let categories = $derived(data?.maincategory || []);
</script>

<div class="flex flex-col items-center w-full min-h-screen bg-white max-w-md mx-auto relative shadow-sm">
	
	<header class="mt-15 mb-8 text-center animate-fade-in px-4">
		<h1 class="text-5xl font-['Jua'] text-gray-900 mb-2">
			골라바유!
		</h1>
		<p class="text-gray-500 text-sm font-medium font-['Noto_Sans_KR']">
			오늘 뭐 먹지? 고민될 땐 골라바유!
		</p>
	</header>

	<div class="w-full px-4 mb-10">
		<div class="w-full h-24 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-center text-blue-400 font-bold">
			새로운 컨텐츠 자리 (배너/이벤트)
		</div>
	</div>

	{#if categories.length > 0}
		<div class="grid grid-cols-5 gap-x-1 gap-y-3 w-full px-5 animate-fade-in-up pb-32">
			{#each categories as category}
				{@const iconSrc = getCategoryIconPath(category.name)}

				<a 
					href="/list/{category.name}"
					class="group flex flex-col items-center gap-1 active:scale-95 transition-transform"
					aria-label={category.name}
				>
					<div class="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors overflow-hidden">
						<img 
							src={iconSrc} 
							alt={category.name} 
							class="w-10 h-10 object-contain" 
						/>
					</div>
					
					<span class="text-xs font-bold text-gray-600 group-hover:text-gray-900 font-['Noto_Sans_KR']">
						{category.name}
					</span>
				</a>
			{/each}
		</div>
	{:else}
		<div class="py-10 text-center text-gray-400 font-['Noto_Sans_KR']">
			데이터를 불러오는 중...
		</div>
	{/if}

</div>

<style>
	@keyframes fade-in-up {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}
	.animate-fade-in-up { animation: fade-in-up 0.5s ease-out; }
	
	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	.animate-fade-in { animation: fade-in 0.8s ease-out; }
</style>