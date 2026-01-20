<script>
    import { ChevronLeft, Search, MapPin } from 'lucide-svelte';
    
    // 상태 변수
    let searchTerm = $state('');      // 검색어
    let searchResults = $state([]);   // 검색 결과
    let hasSearched = $state(false);  // 검색 버튼을 눌렀는지 여부

    // ★ 검색 버튼 누르면 실행되는 함수
    async function executeSearch() {
        if (searchTerm.length < 1) {
            alert('검색어를 입력해주세요!');
            return;
        }

        // API 호출
        const response = await fetch(`/api/search-restaurant?q=${searchTerm}`);
        if (response.ok) {
            searchResults = await response.json();
            hasSearched = true; // "나 검색 해봤음" 표시
        }
    }

    // ★ 리스트에서 식당 선택 시
    function selectRestaurant(name) {
        searchTerm = name;       // 입력칸에 이름 채우기
        searchResults = [];      // 리스트 닫기
        hasSearched = false;     // 초기화
    }
</script>

<div class="flex flex-col w-full min-h-screen bg-white max-w-md mx-auto relative">
    
    <header class="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <a href="/golabassyu" class="p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-full">
            <ChevronLeft size={24} />
        </a>
        <h1 class="text-lg font-bold font-['Jua']">글쓰기</h1>
        <button type="submit" form="writeForm" class="text-red-500 font-bold text-sm px-2">
            완료
        </button>
    </header>

    <form id="writeForm" method="POST" action="?/createPost" class="p-5 flex flex-col gap-6">
        
        <div class="flex flex-col gap-2">
            <label class="text-xs font-bold text-gray-500">어디에 있는 맛집인가요?</label>
            <select name="area" class="w-full p-3 rounded-xl bg-gray-50 border-none text-sm font-bold focus:ring-2 focus:ring-red-100">
                <option value="전체">지역 선택 안함</option>
                <option value="신정문앞">신정문 앞</option>
                <option value="욱일">욱일</option>
                <option value="조치원역">조치원역</option>
                <option value="기타">기타</option>
            </select>
        </div>

        <div class="flex flex-col gap-2">
            <label class="text-xs font-bold text-gray-500">식당 이름</label>
            
            <div class="flex gap-2">
                <div class="relative flex-1">
                    <input 
                        type="text" 
                        name="restaurant" 
                        placeholder="예: 김밥" 
                        required
                        autocomplete="off"
                        class="w-full p-3 rounded-xl bg-gray-50 border-none text-sm placeholder-gray-400 focus:ring-2 focus:ring-red-100"
                        bind:value={searchTerm}
                    />
                </div>
                <button 
                    type="button"
                    onclick={executeSearch}
                    class="bg-gray-800 text-white rounded-xl px-4 py-3 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                >
                    <Search size={18} />
                </button>
            </div>

            {#if hasSearched}
                {#if searchResults.length > 0}
                    <div class="mt-1 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                        {#each searchResults as result}
                            <button 
                                type="button" 
                                onclick={() => selectRestaurant(result.name)}
                                class="w-full text-left px-4 py-3 hover:bg-red-50 text-sm flex items-center gap-2 border-b border-gray-50 last:border-none"
                            >
                                <MapPin size={14} class="text-gray-400" />
                                <span class="text-gray-700 font-bold">{result.name}</span>
                                <span class="text-xs text-gray-400 ml-auto">{result.mainCategory || '식당'}</span>
                            </button>
                        {/each}
                    </div>
                {:else}
                    <div class="mt-1 p-3 bg-gray-50 rounded-xl text-center">
                        <p class="text-xs text-gray-500">검색 결과가 없어요 😢<br>직접 입력해서 글을 써주세요!</p>
                    </div>
                {/if}
            {/if}
        </div>

        <div class="flex flex-col gap-2">
            <label class="text-xs font-bold text-gray-500">제목</label>
            <input 
                type="text" name="title" placeholder="제목을 입력해주세요" required
                class="w-full p-3 rounded-xl bg-gray-50 border-none text-sm placeholder-gray-400 focus:ring-2 focus:ring-red-100"
            />
        </div>

        <div class="flex flex-col gap-2">
            <label class="text-xs font-bold text-gray-500">내용</label>
            <textarea 
                name="content" rows="8" placeholder="맛집 후기를 자유롭게 남겨주세요!" required
                class="w-full p-3 rounded-xl bg-gray-50 border-none text-sm placeholder-gray-400 focus:ring-2 focus:ring-red-100 resize-none"
            ></textarea>
        </div>

        <div class="flex flex-col gap-2">
            <label class="text-xs font-bold text-gray-500">이미지 주소 (선택)</label>
            <input 
                type="text" name="imageUrl" placeholder="https://..."
                class="w-full p-3 rounded-xl bg-gray-50 border-none text-sm placeholder-gray-400 focus:ring-2 focus:ring-red-100"
            />
        </div>

    </form>
</div>