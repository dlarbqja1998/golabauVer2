<script>
    import { ChevronLeft, Search, MapPin, Image as ImageIcon, Star, X, Loader2 } from 'lucide-svelte';
    
    let searchTerm = $state('');
    let searchResults = $state([]);
    let hasSearched = $state(false);
    
    let selectedRestaurant = $state({ name: '', id: 0, category: '' });
    let rating = $state(0);
    
    let uploadedUrls = $state([]); 
    let isUploading = $state(false);
    let formElement; 

    async function executeSearch() {
        if (searchTerm.length < 1) return alert('식당 이름을 입력해주세요!');
        
        try {
            const res = await fetch(`/api/search-restaurant?q=${searchTerm}`);
            if (res.ok) {
                searchResults = await res.json();
                hasSearched = true;
            } else {
                console.error("검색 실패:", res.status);
            }
        } catch (e) {
            console.error("에러:", e);
        }
    }

    function selectRestaurant(item) {
        const rName = item.placeName || item.name;
        selectedRestaurant = { name: rName, id: item.id, category: item.mainCategory || item.category };
        
        searchTerm = rName;
        searchResults = [];
        hasSearched = false;
    }

    function setRating(score) {
        rating = score;
    }

    async function handleImageUpload(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        isUploading = true;

        for (let i = 0; i < files.length; i++) {
            const formData = new FormData();
            formData.append('image', files[i]);

            try {
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                const data = await res.json();
                
                if (data.url) {
                    uploadedUrls.push(data.url);
                } else {
                    console.error('업로드 실패:', data);
                }
            } catch (err) {
                console.error('에러 발생:', err);
                alert('이미지 업로드 중 오류가 발생했습니다.');
            }
        }
        
        isUploading = false;
    }

    function removeImage(index) {
        uploadedUrls = uploadedUrls.filter((_, i) => i !== index);
    }

    function validateAndSubmit() {
        if (!selectedRestaurant.id) {
            alert('⚠️ 어떤 식당인지 알려주세요!\n(위치 추가를 눌러 식당을 선택해주세요)');
            return; 
        }
        formElement.submit();
    }
</script>

<div class="flex flex-col w-full min-h-screen bg-white max-w-md mx-auto relative pb-24">
    
    <header class="flex items-center justify-between p-4 bg-white sticky top-0 z-20">
        <a href="/golabassyu" class="p-2 -ml-2 text-gray-800">
            <ChevronLeft size={24} />
        </a>
        <h1 class="text-lg font-bold font-['Jua']">새 게시물</h1>
        
        <button 
            type="button" 
            onclick={validateAndSubmit}
            class="text-blue-500 font-bold text-sm px-2 hover:bg-blue-50 rounded-lg transition-colors"
        >
            공유
        </button>
    </header>

    <form 
        bind:this={formElement}
        id="instaForm" 
        method="POST" 
        action="?/createPost" 
        class="flex flex-col flex-1"
    >
        
        <input type="hidden" name="restaurantName" value={selectedRestaurant.name} />
        <input type="hidden" name="restaurantId" value={selectedRestaurant.id} />
        <input type="hidden" name="rating" value={rating} />
        <input type="hidden" name="imageUrl" value={uploadedUrls.join(',')} />
        <input type="hidden" name="title" value={selectedRestaurant.name ? selectedRestaurant.name + " 후기" : "맛집 후기"} />

        <div class="w-full bg-gray-50 border-b border-gray-100 relative group overflow-hidden">
            {#if uploadedUrls.length > 0}
                <div class="flex overflow-x-auto p-4 gap-3 no-scrollbar snap-x">
                    {#each uploadedUrls as url, i}
                        <div class="relative min-w-[200px] h-[200px] snap-center shrink-0">
                            <img src={url} alt="preview" class="w-full h-full object-cover rounded-lg shadow-sm" />
                            <button 
                                type="button" 
                                onclick={() => removeImage(i)} 
                                class="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    {/each}

                    <label class="flex flex-col items-center justify-center min-w-[100px] h-[200px] bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors shrink-0 border-2 border-dashed border-gray-300">
                        {#if isUploading}
                            <Loader2 class="animate-spin text-gray-400" size={24} />
                        {:else}
                            <ImageIcon size={32} class="text-gray-400 mb-1" />
                            <span class="text-xs text-gray-500 font-bold">추가</span>
                        {/if}
                        <input type="file" accept="image/*" multiple class="hidden" onchange={handleImageUpload} />
                    </label>
                </div>
            {:else}
                <label class="flex flex-col items-center justify-center w-full aspect-square cursor-pointer hover:bg-gray-100 transition-colors">
                    {#if isUploading}
                        <Loader2 class="animate-spin text-gray-400" size={32} />
                    {:else}
                        <ImageIcon size={48} class="text-gray-300 mb-2" />
                        <span class="text-sm text-gray-400 font-bold">사진을 올려주세요 (여러 장 가능)</span>
                    {/if}
                    <input type="file" accept="image/*" multiple class="hidden" onchange={handleImageUpload} />
                </label>
            {/if}
        </div>

        <div class="p-4 flex flex-col gap-6">
            <div class="flex flex-col gap-2 items-center">
                <span class="text-xs font-bold text-gray-400">이 식당, 어땠나요?</span>
                <div class="flex gap-2">
                    {#each [1, 2, 3, 4, 5] as star}
                        <button type="button" onclick={() => setRating(star)} class="transition-transform active:scale-110">
                            <Star 
                                size={32} 
                                fill={star <= rating ? "#FFD700" : "none"} 
                                color={star <= rating ? "#FFD700" : "#E5E7EB"} 
                                strokeWidth={2}
                            />
                        </button>
                    {/each}
                </div>
            </div>

            <textarea 
                name="content" 
                placeholder="문구 입력..." 
                rows="3"
                class="w-full text-sm outline-none resize-none placeholder-gray-400 font-['Noto_Sans_KR']"
                required
            ></textarea>

            <div class="h-px w-full bg-gray-100"></div>

            <div class="flex flex-col gap-3">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-bold text-gray-800">
                        위치 추가 <span class="text-red-500 text-xs">(필수)</span>
                    </span>
                    <MapPin size={18} class="text-gray-400" />
                </div>
                
                {#if selectedRestaurant.name}
                    <div class="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <div class="flex items-center gap-2">
                            <MapPin size={16} class="text-blue-500" />
                            <span class="text-sm font-bold text-blue-600">{selectedRestaurant.name}</span>
                        </div>
                        <button type="button" onclick={() => selectedRestaurant = {name:'', id:0, category:''}} class="text-xs text-gray-400 underline">변경</button>
                    </div>
                {:else}
                    <div class="flex gap-2">
                        <input 
                            type="text" 
                            bind:value={searchTerm}
                            placeholder="식당 검색하기" 
                            class="flex-1 p-2 bg-gray-50 rounded-lg text-sm outline-none"
                            onkeydown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault(); 
                                    executeSearch();
                                }
                            }}
                        />
                        <button type="button" onclick={executeSearch} class="p-2 bg-gray-800 text-white rounded-lg">
                            <Search size={16} />
                        </button>
                    </div>
                {/if}

                {#if hasSearched && searchResults.length > 0}
                    <div class="bg-white border border-gray-100 rounded-lg shadow-sm max-h-40 overflow-y-auto">
                        {#each searchResults as result}
                            <button 
                                type="button" 
                                onclick={() => selectRestaurant(result)}
                                class="w-full text-left p-3 hover:bg-gray-50 text-sm flex items-center justify-between border-b border-gray-50"
                            >
                                <span class="font-bold">{result.placeName || result.name}</span>
                                <span class="text-xs text-gray-400">{result.mainCategory || result.category}</span>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>

        </div>
    </form>
</div>

<style>
    .no-scrollbar::-webkit-scrollbar { display: none; }
</style>