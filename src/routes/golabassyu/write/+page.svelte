<script>
    import { ChevronLeft, Search, MapPin, Image as ImageIcon, Star, X, Loader2 } from 'lucide-svelte';
    import { page } from '$app/stores'; 
    import { onMount } from 'svelte';
    import { enhance } from '$app/forms'; 
    import { fly } from 'svelte/transition';

    let { form } = $props(); 

    let toastMessage = $state('');
    let toastTimeout;

    function showToast(msg) {
        toastMessage = msg;
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastMessage = '';
        }, 2500); 
    }

    let searchTerm = $state('');
    let searchResults = $state([]);
    let hasSearched = $state(false);
    
    let selectedRestaurant = $state({ name: '', id: 0, category: '' });
    let rating = $state(0);
    
    let uploadedUrls = $state([]); 
    let isUploading = $state(false);

    let isLocked = $state(false);
    let returnToUrl = $state('');

    let content = $state(form?.content || '');

    $effect(() => {
        if (form?.message) {
            showToast(form.message);
        }
    });

    onMount(() => {
        const token = $page.url.searchParams.get('token');

        if (token) {
            try {
                const decoded = JSON.parse(decodeURIComponent(atob(token)));
                selectedRestaurant = { name: decoded.name, id: Number(decoded.id), category: '' };
                isLocked = true; 
                returnToUrl = decoded.returnTo;
            } catch (e) {
                console.error("토큰 해독 실패:", e);
                showToast('⚠️ 비정상적인 접근입니다.');
            }
        } else {
            const paramId = $page.url.searchParams.get('restaurantId');
            const paramName = $page.url.searchParams.get('restaurantName');
            const paramReturn = $page.url.searchParams.get('returnTo');

            if (paramId && paramName) {
                selectedRestaurant = { name: paramName, id: Number(paramId), category: '' };
                isLocked = true; 
            }
            if (paramReturn) {
                returnToUrl = paramReturn;
            }
        }
    });

    async function executeSearch() {
        if (searchTerm.length < 1) return showToast('식당 이름을 입력해주세요!');
        
        //posthog
        if (typeof window !== 'undefined' && window.posthog) {
			window.posthog.capture('search_restaurant', {
				keyword: searchTerm,
				location: 'write_feed' // 검색 위치가 다름을 명시!
			});
		}
        
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
        const inputElement = e.target;
        const files = inputElement.files;
        
        if (!files || files.length === 0) return;
        isUploading = true;

        try {
            for (let i = 0; i < files.length; i++) {
                let currentFile = files[i]; 
                
                // 🔥 [방어 1] 갤러리 앱이 파일 타입(MIME)을 누락시킨 경우 심폐소생술!
                if (!currentFile.type || currentFile.type === '') {
                    const ext = currentFile.name.split('.').pop().toLowerCase();
                    let fallbackType = 'image/jpeg'; 
                    
                    if (ext === 'png') fallbackType = 'image/png';
                    else if (ext === 'webp') fallbackType = 'image/webp';
                    else if (ext === 'gif') fallbackType = 'image/gif';
                    
                    currentFile = new File([currentFile], currentFile.name || 'image.jpg', { type: fallbackType });
                }

                const formData = new FormData();
                formData.append('image', currentFile); 
                
                try {
                    const res = await fetch('/api/upload', { method: 'POST', body: formData });
                    
                    if (res.status === 413) {
                        showToast('⚠️ 폰 사진 용량이 너무 큽니다! (15MB 이하만 가능)');
                        continue; 
                    }

                    const data = await res.json().catch(() => null); 
                    
                    if (!res.ok || !data) {
                        showToast(`⚠️ 업로드 실패: ${data?.error || '알 수 없는 에러'}`);
                        continue; 
                    }
                    
                    if (data.url) {
                        uploadedUrls.push(data.url);
                    }
                } catch (err) {
                    console.error(err);
                    showToast('🚨 통신 에러: 인터넷이 끊겼거나 서버가 응답하지 않습니다.');
                }
            }
        } finally {
            // 🔥 [방어 2] 화면 굳는 거 무조건 막아줌
            isUploading = false;
            if (inputElement) {
                inputElement.value = ''; 
            }
        }
    }

    function removeImage(index) {
        uploadedUrls = uploadedUrls.filter((_, i) => i !== index);
    }
</script>

<div class="flex flex-col w-full min-h-screen bg-white max-w-md mx-auto relative pb-24">
    
    <header class="flex items-center justify-between p-4 bg-white sticky top-0 z-20">
        <a href={returnToUrl || "/golabassyu"} class="p-2 -ml-2 text-gray-800">
            <ChevronLeft size={24} />
        </a>
        <h1 class="text-lg font-bold font-['Jua']">새 게시물</h1>
        
        <button type="submit" form="instaForm" class="text-blue-500 font-bold text-sm px-2 hover:bg-blue-50 rounded-lg transition-colors">
            공유
        </button>
    </header>

    <div class="w-full bg-gray-50 border-b border-gray-100 relative group overflow-hidden">
        {#if uploadedUrls.length > 0}
            <div class="flex overflow-x-auto p-4 gap-3 no-scrollbar snap-x">
                {#each uploadedUrls as url, i}
                    <div class="relative min-w-[200px] h-[200px] snap-center shrink-0 bg-gray-100 rounded-lg">
                        <img src={url} alt="preview" class="w-full h-full object-contain rounded-lg shadow-sm" />
                        <button type="button" onclick={() => removeImage(i)} class="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-500">
                            <X size={16} />
                        </button>
                    </div>
                {/each}
                <label class="flex flex-col items-center justify-center min-w-[100px] h-[200px] bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 shrink-0 border-2 border-dashed border-gray-300">
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

    <form 
        id="instaForm" 
        method="POST" 
        action="?/createPost" 
        class="flex flex-col flex-1"
        use:enhance={({ cancel }) => {
            if (!selectedRestaurant.id) {
                showToast('⚠️ 어떤 식당인지 알려주세요!\n(위치 추가를 눌러 식당을 선택해주세요)');
                cancel(); 
                return;
            }
            if (rating === 0) {
                showToast('⚠️ 이 식당의 별점을 1점 이상 선택해주세요!');
                cancel();
                return;
            }
            return async ({ update, result }) => {
				if (result.type === 'redirect' || result.type === 'success') {
					if (typeof window !== 'undefined' && window.posthog) {
						window.posthog.capture('write_review', {
							restaurant_id: selectedRestaurant.id,
							restaurant_name: selectedRestaurant.name,
							rating: rating,
							has_content: content.length > 0 // 리뷰 내용을 썼는지 안 썼는지
						});
					}
				}
				await update({ reset: false }); 
			};
        }}
    >
        
        <input type="hidden" name="restaurantName" value={selectedRestaurant.name} />
        <input type="hidden" name="restaurantId" value={selectedRestaurant.id} />
        <input type="hidden" name="rating" value={rating} />
        <input type="hidden" name="imageUrl" value={uploadedUrls.join(',')} />
        <input type="hidden" name="title" value={selectedRestaurant.name ? selectedRestaurant.name + " 후기" : "맛집 후기"} />
        <input type="hidden" name="returnTo" value={returnToUrl} />

        <div class="p-4 flex flex-col gap-6">
            <div class="flex flex-col gap-2 items-center">
                <span class="text-xs font-bold text-gray-400">이 식당, 어땠나요?</span>
                <div class="flex gap-2">
                    {#each [1, 2, 3, 4, 5] as star}
                        <button type="button" onclick={() => setRating(star)} class="transition-transform active:scale-110">
                            <Star size={32} fill={star <= rating ? "#FFD700" : "none"} color={star <= rating ? "#FFD700" : "#E5E7EB"} strokeWidth={2} />
                        </button>
                    {/each}
                </div>
            </div>

            <textarea name="content" bind:value={content} placeholder="문구 입력..." rows="3" class="w-full text-sm outline-none resize-none placeholder-gray-400 font-['Noto_Sans_KR']" required></textarea>

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
                        {#if !isLocked}
                            <button type="button" onclick={() => selectedRestaurant = {name:'', id:0, category:''}} class="text-xs text-gray-400 underline">변경</button>
                        {:else}
                            <span class="text-[10px] font-bold text-blue-400 bg-white px-2 py-0.5 rounded border border-blue-100">고정됨</span>
                        {/if}
                    </div>
                {:else}
                    <div class="flex gap-2">
                        <input type="text" bind:value={searchTerm} placeholder="식당 검색하기" class="flex-1 p-2 bg-gray-50 rounded-lg text-sm outline-none" onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); executeSearch(); } }} />
                        <button type="button" onclick={executeSearch} class="p-2 bg-gray-800 text-white rounded-lg"><Search size={16} /></button>
                    </div>
                {/if}

                {#if hasSearched && searchResults.length > 0}
                    <div class="bg-white border border-gray-100 rounded-lg shadow-sm max-h-40 overflow-y-auto">
                        {#each searchResults as result}
                            <button type="button" onclick={() => selectRestaurant(result)} class="w-full text-left p-3 hover:bg-gray-50 text-sm flex items-center justify-between border-b border-gray-50">
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

{#if toastMessage}
    <div class="fixed top-20 left-1/2 -translate-x-1/2 bg-[#9e1b34]/95 backdrop-blur-sm text-white px-5 py-3 rounded-full shadow-2xl text-sm font-bold z-[10000] flex items-center gap-2 whitespace-nowrap" 
         transition:fly={{ y: -20, duration: 300 }}>
        {toastMessage}
    </div>
{/if}

<style>
    .no-scrollbar::-webkit-scrollbar { display: none; }
</style>