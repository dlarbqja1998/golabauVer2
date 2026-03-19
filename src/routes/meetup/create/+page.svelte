<script lang="ts">
    import { enhance } from '$app/forms';
    import { ChevronLeft, Info, Send, Search, MapPin, ListFilter } from 'lucide-svelte';

    let { data } = $props();
    let user = $derived(data?.user);
    // 서버(KV)에서 한방에 가져온 전체 식당 리스트 (비용 0원 필터링용!)
    let allRestaurants = $derived(data?.restaurants || []);

    let isSubmitting = $state(false);

    // 1. 인원수 & 기본 폼 데이터
    let headcountCondition = $state('1:1'); 
    let meetingType = $derived(headcountCondition === '1:1' ? 'BABYAK' : 'GWATING'); 
    let genderCondition = $state('ALL'); 
    let contactType = $state('KAKAO');  
    let contactId = $state(contactType === 'KAKAO' ? (user?.kakaoId || '') : (user?.instaId || ''));

    $effect(() => {
        contactId = contactType === 'KAKAO' ? (user?.kakaoId || '') : (user?.instaId || '');
    });

    // ▼▼▼ 2. 2주치(14일) 날짜 생성기 복구 + 현재 시간 필터링 ▼▼▼
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) { // 🔥 다시 14일치(2주)로 넉넉하게 변경!
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const month = d.getMonth() + 1;
        const date = d.getDate();
        const dayStr = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
        
        let label = `${month}월 ${date}일 (${dayStr})`;
        if (i === 0) label += ' - 오늘';
        if (i === 1) label += ' - 내일';

        dates.push({ label, value: `${d.getFullYear()}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}` });
    }

    let selectedDate = $state(dates[0].value);
    let selectedTime = $state('');

    let availableTimes = $derived.by(() => {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const isToday = selectedDate === dates[0].value; 

        const times = [];
        for (let h = 0; h < 24; h++) {
            for (let m of ['00', '30']) {
                if (isToday) {
                    if (h > currentHour || (h === currentHour && Number(m) > currentMinute)) {
                        times.push(`${String(h).padStart(2, '0')}:${m}`);
                    }
                } else {
                    times.push(`${String(h).padStart(2, '0')}:${m}`);
                }
            }
        }
        return times;
    });

    $effect(() => {
        if (availableTimes.length > 0 && !availableTimes.includes(selectedTime)) {
            selectedTime = availableTimes[0];
        }
    });

    let appointmentTime = $derived(`${selectedDate}T${selectedTime}:00+09:00`);


    // ▼▼▼ 3. 식당 [이름 검색] vs [조건 검색] 로직 ▼▼▼
    let restSearchMode = $state('NAME'); // 'NAME' | 'CATEGORY'
    let selectedRestaurant = $state({ name: '', id: 0 });

    // 이름 검색용
    let searchTerm = $state('');
    let searchResults = $state([]);
    let hasSearched = $state(false);

    // 카테고리 조건 검색용
    let filterZone = $state('전체');
    let filterCategory = $state('전체');
    const zones = ['전체', '고대앞', '욱일', '조치원역', '홍대사이', '기타'];
    const categories = ['전체', '한식', '중식', '양식', '일식', '아시안', '분식', '치킨', '피자', '고기', '패스트푸드', '술집', '기타'];

    // 클라이언트단 0초 필터링 연산 (Compute 비용 완전 무료!)
    let filteredByCategory = $derived(
        allRestaurants.filter(r => 
            (filterZone === '전체' || r.zone === filterZone) &&
            (filterCategory === '전체' || r.category === filterCategory)
        )
    );

    async function executeSearch() {
        if (searchTerm.length < 1) return alert('식당 이름을 입력해주세요!');
        
        if (typeof window !== 'undefined' && window.posthog) {
            window.posthog.capture('search_restaurant_by_name', { keyword: searchTerm });
        }
        try {
            const res = await fetch(`/api/search-restaurant?q=${searchTerm}`);
            if (res.ok) { searchResults = await res.json(); hasSearched = true; }
        } catch (e) { console.error(e); }
    }

    function selectRestaurant(item) {
        const rName = item.placeName || item.name;
        selectedRestaurant = { name: rName, id: item.id };
        // PostHog 최종 선택 트래킹
        if (typeof window !== 'undefined' && window.posthog) {
            window.posthog.capture('selected_meetup_restaurant', { method: restSearchMode, rName: rName });
        }
        searchTerm = ''; searchResults = []; hasSearched = false;
    }

    // ▼▼▼ 4. 폼 전송 액션 ▼▼▼
    function handleEnhance({ formData, cancel }) {
        if (!selectedRestaurant.id) {
            alert('어디서 먹을지 식당을 꼭 선택해주세요!');
            cancel();
            return;
        }

        const title = formData.get('title');
        if (!title || !contactId) { alert('필수 항목을 모두 입력해주세요!'); cancel(); return; }

        const selectedDateTime = new Date(appointmentTime);
        if (selectedDateTime <= new Date()) { alert('현재 시간 이후로만 약속을 만들 수 있습니다!'); cancel(); return; }

        if (typeof window !== 'undefined' && window.posthog) {
            window.posthog.capture('attempt_create_meetup_room', { meetingType, headcountCondition });
        }

        isSubmitting = true; 

        return async ({ result, update }) => {
            isSubmitting = false; 
            if (result.type === 'success' || result.type === 'redirect') {
                if (typeof window !== 'undefined' && window.posthog) {
                    window.posthog.capture('created_meetup_room_success', { meetingType });
                }
            } else if (result.type === 'failure') {
                if (typeof window !== 'undefined' && window.posthog) {
                    window.posthog.capture('create_meetup_room_fail', {
                        meetingType,
                        headcountCondition,
                        reason: result.data?.message || 'unknown',
                        selected_restaurant: selectedRestaurant.name || null
                    });
                }
                alert(result.data?.message || '방 생성에 실패했습니다.');
            }
            update();
        };
    }
</script>

<div class="flex flex-col w-full min-h-screen bg-[#F8F9FA] max-w-md mx-auto relative pb-24 overflow-x-hidden">
    
    <header class="bg-white sticky top-0 z-30 p-4 flex items-center justify-between border-b border-gray-100 shadow-sm">
        <a href="/meetup" class="p-2 -ml-2 text-gray-800 active:scale-95">
            <ChevronLeft size={24} />
        </a>
        <h1 class="text-xl font-bold font-['Jua'] text-[#8B0029]">방 만들기</h1>
        <div class="w-8"></div>
    </header>

    <form method="POST" action="?/create" use:enhance={handleEnhance} class="flex flex-col gap-4 p-5">
        
        <input type="hidden" name="meetingType" value={meetingType} />
        <input type="hidden" name="appointmentTime" value={appointmentTime} />

        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-5">
            <div>
                <label class="block text-sm font-bold text-gray-800 mb-2 font-['Jua']">몇 명이서 만날까요?</label>
                <div class="flex gap-2">
                    {#each ['1:1', '2:2', '3:3', 'N:N'] as h}
                        <label class="flex-1">
                            <input type="radio" name="headcountCondition" value={h} bind:group={headcountCondition} class="hidden peer" />
                            <div class="text-center py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-400 peer-checked:bg-red-50 peer-checked:text-[#8B0029] peer-checked:border-[#8B0029] transition-all cursor-pointer shadow-sm">
                                {h}
                            </div>
                        </label>
                    {/each}
                </div>
            </div>

            <div>
                <label class="block text-sm font-bold text-gray-800 mb-2 font-['Jua']">원하는 성별</label>
                <div class="flex gap-2">
                    {#each [{val:'ALL', label:'성별무관'}, {val:'MALE', label:'남자만'}, {val:'FEMALE', label:'여자만'}] as g}
                        <label class="flex-1">
                            <input type="radio" name="genderCondition" value={g.val} bind:group={genderCondition} class="hidden peer" />
                            <div class="text-center py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-400 peer-checked:bg-[#8B0029] peer-checked:text-white peer-checked:border-[#8B0029] transition-all cursor-pointer shadow-sm">
                                {g.label}
                            </div>
                        </label>
                    {/each}
                </div>
            </div>
        </div>

        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-6">
            
            <div>
                <label class="block text-sm font-bold text-gray-800 mb-2 font-['Jua']">방 제목 <span class="text-red-500">*</span></label>
                <input type="text" name="title" placeholder="예) 훠궈 같이 부수러 가실 분 구함!" maxlength="30" required class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B0029] focus:bg-white transition-colors" />
            </div>

            <div>
                <label class="block text-sm font-bold text-gray-800 mb-2 font-['Jua']">언제 만날까요? <span class="text-red-500">*</span></label>
                <div class="flex gap-2">
                    <div class="relative flex-[2]">
                        <select bind:value={selectedDate} class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-[#8B0029] appearance-none">
                            {#each dates as d}
                                <option value={d.value}>{d.label}</option>
                            {/each}
                        </select>
                        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">▼</div>
                    </div>
                    <div class="relative flex-1">
                        <select bind:value={selectedTime} class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-[#8B0029] appearance-none">
                            {#if availableTimes.length === 0}
                                <option value="" disabled>마감됨</option>
                            {:else}
                                {#each availableTimes as t}
                                    <option value={t}>{t}</option>
                                {/each}
                            {/if}
                        </select>
                        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">▼</div>
                    </div>
                </div>
            </div>

            <div>
                <label class="block text-sm font-bold text-gray-800 mb-2 font-['Jua']">어디서 먹을까요? <span class="text-red-500">*</span></label>
                
                <input type="hidden" name="restaurantName" value={selectedRestaurant.name} />
                <input type="hidden" name="restaurantId" value={selectedRestaurant.id} />

                {#if selectedRestaurant.name}
                    <div class="flex items-center justify-between p-3 bg-[#8B0029]/10 rounded-xl border border-[#8B0029]/20">
                        <div class="flex items-center gap-2">
                            <MapPin size={16} class="text-[#8B0029]" />
                            <span class="text-sm font-bold text-[#8B0029]">{selectedRestaurant.name}</span>
                        </div>
                        <button type="button" onclick={() => selectedRestaurant = {name:'', id:0}} class="text-xs text-gray-400 underline">다시 찾기</button>
                    </div>
                {:else}
                    <div class="flex gap-2 mb-3 bg-gray-50 p-1 rounded-xl border border-gray-100">
                        <button type="button" onclick={() => {restSearchMode = 'NAME'; hasSearched = false;}} class="flex-1 py-2 rounded-lg text-sm font-bold transition-all {restSearchMode === 'NAME' ? 'bg-white text-gray-800 shadow-sm border border-gray-200' : 'text-gray-400'}">이름 검색</button>
                        <button type="button" onclick={() => restSearchMode = 'CATEGORY'} class="flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 {restSearchMode === 'CATEGORY' ? 'bg-white text-gray-800 shadow-sm border border-gray-200' : 'text-gray-400'}"><ListFilter size={16}/> 조건 찾기</button>
                    </div>

                    {#if restSearchMode === 'NAME'}
                        <div class="flex gap-2 relative animate-fade-in">
                            <input type="text" bind:value={searchTerm} placeholder="골라바유 식당 검색..." class="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B0029]" onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); executeSearch(); } }} />
                            <button type="button" onclick={executeSearch} class="p-3 bg-gray-800 text-white rounded-xl active:scale-95"><Search size={18} /></button>
                        </div>
                        {#if hasSearched && searchResults.length > 0}
                            <div class="mt-2 bg-white border border-gray-100 rounded-lg shadow-sm max-h-40 overflow-y-auto animate-fade-in">
                                {#each searchResults as result}
                                    <button type="button" onclick={() => selectRestaurant(result)} class="w-full text-left p-3 hover:bg-gray-50 text-sm flex items-center justify-between border-b border-gray-50">
                                        <span class="font-bold text-gray-800">{result.placeName || result.name}</span>
                                        <span class="text-xs text-gray-400">{result.mainCategory || result.category}</span>
                                    </button>
                                {/each}
                            </div>
                        {:else if hasSearched}
                            <div class="mt-2 text-center text-xs text-red-500">검색된 식당이 없습니다.</div>
                        {/if}
                    {:else}
                        <div class="flex flex-col gap-2 animate-fade-in">
                            <div class="flex gap-2">
                                <select bind:value={filterZone} class="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-[#8B0029]">
                                    <option value="" disabled>구역 선택</option>
                                    {#each zones as z}<option value={z}>{z}</option>{/each}
                                </select>
                                <select bind:value={filterCategory} class="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-[#8B0029]">
                                    <option value="" disabled>카테고리</option>
                                    {#each categories as c}<option value={c}>{c}</option>{/each}
                                </select>
                            </div>
                            
                            <div class="bg-white border border-gray-100 rounded-lg shadow-sm max-h-48 overflow-y-auto mt-1">
                                {#if filteredByCategory.length === 0}
                                    <div class="p-4 text-center text-xs text-gray-400">조건에 맞는 식당이 없어유 😢</div>
                                {:else}
                                    {#each filteredByCategory as r}
                                        <button type="button" onclick={() => selectRestaurant(r)} class="w-full text-left p-3 hover:bg-gray-50 text-sm flex flex-col border-b border-gray-50 active:bg-gray-100 transition-colors">
                                            <span class="font-bold text-gray-800">{r.name}</span>
                                            <div class="flex gap-1 mt-1">
                                                <span class="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{r.zone}</span>
                                                <span class="text-[10px] bg-red-50 text-[#8B0029] px-1.5 py-0.5 rounded">{r.category}</span>
                                            </div>
                                        </button>
                                    {/each}
                                {/if}
                            </div>
                        </div>
                    {/if}
                {/if}
            </div>
        </div>

        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div class="flex items-center gap-2 mb-3">
                <label class="block text-sm font-bold text-gray-800 font-['Jua']">연락처 제공 <span class="text-red-500">*</span></label>
                <span class="text-[10px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-bold">성사 시에만 노출!</span>
            </div>
            
            <div class="flex gap-2 mb-3">
                <label class="flex-1">
                    <input type="radio" name="contactType" value="KAKAO" bind:group={contactType} class="hidden peer" />
                    <div class="text-center py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-400 peer-checked:bg-[#FEE500] peer-checked:text-[#371D1E] peer-checked:border-[#FEE500] transition-all cursor-pointer">카카오톡 ID</div>
                </label>
                <label class="flex-1">
                    <input type="radio" name="contactType" value="INSTA" bind:group={contactType} class="hidden peer" />
                    <div class="text-center py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-400 peer-checked:bg-gradient-to-r peer-checked:from-[#833AB4] peer-checked:via-[#FD1D1D] peer-checked:to-[#F56040] peer-checked:text-white peer-checked:border-transparent transition-all cursor-pointer">인스타그램 ID</div>
                </label>
            </div>

            <input type="text" name="contactId" bind:value={contactId} placeholder="{contactType === 'KAKAO' ? '카톡 ID 입력' : '인스타 ID 입력'}" required class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B0029] focus:bg-white transition-colors" />
            
        </div>

        <button type="submit" disabled={isSubmitting} class="w-full mt-4 py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all active:scale-[0.98] {isSubmitting ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#8B0029] text-white shadow-[0_4px_15px_rgba(139,0,41,0.3)] hover:bg-[#6b0020]'}">
            {#if isSubmitting}
                <span class="animate-spin">⏳</span> 방 파는 중...
            {:else}
                <Send size={20} /> 방 만들기 완료!
            {/if}
        </button>

    </form>
</div>

<style>
    @keyframes fade-in {
        from { opacity: 0; transform: translateY(-5px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fade-in 0.2s ease-out; }
</style>
