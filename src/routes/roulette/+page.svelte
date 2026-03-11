<script>
    import { onMount } from 'svelte';
    import { ChevronLeft, Plus, X, Utensils, Users, RefreshCw, MapPin } from 'lucide-svelte';
    import { slide, fade, scale } from 'svelte/transition';

    let { data } = $props();
    let allRestaurants = $derived(data.restaurants || []);

    let activeTab = $state('restaurant');

    // =====================================
    // 🍽️ 탭 1: 음식점 추천
    // =====================================
    let selectedZone = $state('전체');
    let selectedCategory = $state('전체');
    let selectedFilter = $state('전체');

    const zones = ['전체', '고대앞', '욱일', '조치원역', '홍대사이', '기타'];
    const categories = ['전체', '한식', '중식', '양식', '일식', '아시안', '분식', '치킨', '피자', '고기', '패스트푸드', '술집'];
    const filters = ['전체', '별점 상위 8개', '별점 하위 8개'];

    // =====================================
    // 💸 탭 2: 밥값 내기
    // =====================================
    let betItems = $state([]);
    let newBetName = $state('');

    onMount(() => {
        const saved = localStorage.getItem('golabau_bet_items');
        if (saved) {
            try {
                betItems = JSON.parse(saved);
            } catch (e) {}
        }
    });

    function sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    function addBetItem() {
        if (!newBetName.trim()) return;

        if (betItems.length >= 8) {
            alert('돌림판 항목은 최대 8개까지만 가능해요!');
            return;
        }

        const safeName = sanitizeHTML(newBetName.trim());
        betItems = [...betItems, safeName];
        newBetName = '';
        localStorage.setItem('golabau_bet_items', JSON.stringify(betItems));
    }

    function removeBetItem(index) {
        betItems = betItems.filter((_, i) => i !== index);
        localStorage.setItem('golabau_bet_items', JSON.stringify(betItems));
    }

    // =====================================
    // 🎡 돌림판 로직
    // =====================================
    let isSpinning = $state(false);
    let rotation = $state(0);
    let wheelItems = $state([]);
    let winner = $state(null);
    let showResultModal = $state(false);

    const colors = ['#8B0029', '#E51937', '#FF4D6D', '#FF8FA3', '#FFB3C1', '#F9A8A8', '#FFD166', '#F4A261'];

    // 🔥 오류 수정: 배경색이 에러나서 원판이 사라지는 문제 해결
    let wheelBackground = $derived.by(() => {
        if (wheelItems.length === 0) return '#E5E7EB'; // 데이터 없으면 단색 회색

        const sliceAngle = 360 / wheelItems.length;
        const stops = wheelItems
            .map((_, i) => `${colors[i % colors.length]} ${i * sliceAngle}deg ${(i + 1) * sliceAngle}deg`)
            .join(', ');
        return `conic-gradient(${stops})`;
    });

    function changeTab(tab) {
        if (isSpinning) return;

        activeTab = tab;
        winner = null;
        wheelItems = [];
        showResultModal = false;
        rotation = 0;

        if (typeof window !== 'undefined' && window.posthog) {
            window.posthog.capture('roulette_tab_changed', { tab_name: tab });
        }
    }

    function shuffleArray(array) {
        let curId = array.length;
        while (curId !== 0) {
            const randId = Math.floor(Math.random() * curId);
            curId -= 1;
            const tmp = array[curId];
            array[curId] = array[randId];
            array[randId] = tmp;
        }
        return array;
    }

    function buildWheelItems() {
        if (activeTab === 'restaurant') {
            let filtered = allRestaurants.filter((r) =>
                (selectedZone === '전체' || r.zone === selectedZone) &&
                (selectedCategory === '전체' || r.category === selectedCategory)
            );

            if (selectedFilter === '별점 상위 8개') {
                filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                filtered = filtered.slice(0, 8);
            } else if (selectedFilter === '별점 하위 8개') {
                filtered.sort((a, b) => (a.rating || 0) - (b.rating || 0));
                filtered = filtered.slice(0, 8);
            }

            if (filtered.length < 2) {
                alert('조건에 맞는 식당이 너무 적어요! (최소 2개 필요)\n조건을 조금 넓혀주세요.');
                return null;
            }

            const shuffled = shuffleArray([...filtered]);
            return shuffled
                .slice(0, Math.min(8, shuffled.length))
                .map((r) => ({ type: 'restaurant', name: r.name, id: r.id }));
        }

        if (betItems.length < 2) {
            alert('내기를 하려면 이름을 2명 이상 입력해주세요!');
            return null;
        }

        return betItems.map((name) => ({ type: 'bet', name }));
    }

    function startSpin() {
        if (isSpinning) return;

        winner = null;
        showResultModal = false;

        const nextItems = buildWheelItems();
        if (!nextItems) return;

        wheelItems = nextItems;

        // 1. PostHog 기록
        if (typeof window !== 'undefined' && window.posthog) {
            window.posthog.capture('roulette_spin_started', {
                mode: activeTab,
                filter: selectedFilter,
                item_count: nextItems.length
            });
        }

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
        }

        isSpinning = true;

        // 2. 12시에 정확히 멈추게 하는 수학 로직 (완벽 수정)
        const itemCount = nextItems.length;
        const sliceAngle = 360 / itemCount;

        const winningIndex = Math.floor(Math.random() * itemCount);
        
        // 당첨될 조각의 정중앙 각도
        const targetCenterAngle = (winningIndex * sliceAngle) + (sliceAngle / 2);
        
        // 원판이 시계방향으로 돌 때, 해당 조각을 12시(0도)로 가져오기 위한 목표 회전각
        const baseTargetRotation = 360 - targetCenterAngle; 

        // 기존 회전값에 추가로 몇 바퀴(6바퀴) 돌릴지 계산
        const currentMod = rotation % 360;
        let delta = baseTargetRotation - currentMod;
        if (delta < 0) delta += 360; // 항상 앞으로(시계방향으로)만 돌도록 보정

        const extraTurns = 360 * 6; 
        rotation = rotation + extraTurns + delta;

        // 3. 4초 뒤 결과 모달
        setTimeout(() => {
            isSpinning = false;
            winner = nextItems[winningIndex];
            showResultModal = true;

            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
        }, 4000);
    }
</script>

<div class="flex flex-col w-full min-h-screen bg-[#F8F9FA] max-w-md mx-auto relative pb-24 overflow-x-hidden">
    <header class="bg-white sticky top-0 z-30 p-4 flex items-center justify-between border-b border-gray-100 shadow-sm">
        <a href="/" class="p-2 -ml-2 text-gray-800 active:scale-95">
            <ChevronLeft size={24} />
        </a>
        <h1 class="text-xl font-bold font-['Jua'] text-[#8B0029]">운명의 돌림판</h1>
        <div class="w-8"></div>
    </header>

    <div class="flex bg-white border-b border-gray-100 relative z-20 shadow-sm">
        <button
            onclick={() => changeTab('restaurant')}
            class="flex-1 py-4 flex justify-center items-center gap-2 font-bold text-sm transition-colors relative {activeTab === 'restaurant' ? 'text-[#8B0029]' : 'text-gray-400 hover:bg-gray-50'}"
        >
            <Utensils size={18} /> 음식점 추천
            {#if activeTab === 'restaurant'}
                <div class="absolute bottom-0 left-0 w-full h-0.5 bg-[#8B0029]" transition:fade={{ duration: 150 }}></div>
            {/if}
        </button>

        <button
            onclick={() => changeTab('bet')}
            class="flex-1 py-4 flex justify-center items-center gap-2 font-bold text-sm transition-colors relative {activeTab === 'bet' ? 'text-[#8B0029]' : 'text-gray-400 hover:bg-gray-50'}"
        >
            <Users size={18} /> 밥값 내기
            {#if activeTab === 'bet'}
                <div class="absolute bottom-0 left-0 w-full h-0.5 bg-[#8B0029]" transition:fade={{ duration: 150 }}></div>
            {/if}
        </button>
    </div>

    <div class="flex flex-col items-center w-full px-6 py-6">
        
        <div class="z-20 -mb-3 drop-shadow-md">
            <div style="width: 0; height: 0; border-left: 12px solid transparent; border-right: 12px solid transparent; border-top: 18px solid #8B0029;"></div>
        </div>

        <div class="w-full max-w-[320px] aspect-square relative z-10 flex items-center justify-center">
            
            <div
                class="w-full h-full rounded-full shadow-lg border-8 border-white relative overflow-hidden"
                style="background: {wheelBackground}; transform: rotate({rotation}deg); transition: transform 4s cubic-bezier(0.12, 0.8, 0.2, 1);"
            >
                {#if wheelItems.length === 0}
                    <div class="absolute inset-0 flex items-center justify-center">
                        <span class="text-gray-400 font-bold font-['Jua'] text-lg text-center">
                            조건을 설정하고<br /><br />돌려바유!
                        </span>
                    </div>
                {:else}
                    {#each wheelItems as item, i}
                        {#if item.type === 'bet'}
                            <div
                                class="absolute top-0 left-0 w-full h-full"
                                style="transform: rotate({(360 / wheelItems.length) * i + (360 / wheelItems.length) / 2}deg);"
                            >
                                <div class="flex flex-col items-center pt-6 h-1/2">
                                    <span 
                                        class="text-white font-bold font-['Jua'] text-lg drop-shadow-md" 
                                        style="writing-mode: vertical-rl; text-orientation: upright;"
                                    >
                                        {item.name}
                                    </span>
                                </div>
                            </div>
                        {:else if item.type === 'restaurant'}
                            <div
                                class="absolute top-0 left-0 w-full h-full"
                                style="transform: rotate({(360 / wheelItems.length) * i + (360 / wheelItems.length) / 2}deg);"
                            >
                                <div class="flex flex-col items-center pt-5 h-1/2">
                                    <span class="text-white font-bold font-['Jua'] text-3xl drop-shadow-md">
                                        {['돌', '', '아', '', '가', '', '유', ''][i]}
                                    </span>
                                </div>
                            </div>    
                        {/if}
                    {/each}
                {/if}
            </div>

            <div class="absolute w-6 h-6 bg-white rounded-full shadow-inner border-[3px] border-gray-100 z-30"></div>
        </div>

    </div>

    <div class="px-5 mt-2">
        {#if activeTab === 'restaurant'}
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4" transition:slide>
                <div class="flex gap-3">
                    <div class="flex-1">
                        <label class="block text-xs font-bold text-gray-500 mb-2">어디서?</label>
                        <select bind:value={selectedZone} disabled={isSpinning} class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-[#8B0029] disabled:opacity-50">
                            {#each zones as zone}
                                <option value={zone}>{zone}</option>
                            {/each}
                        </select>
                    </div>

                    <div class="flex-1">
                        <label class="block text-xs font-bold text-gray-500 mb-2">어떤 종류?</label>
                        <select bind:value={selectedCategory} disabled={isSpinning} class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-[#8B0029] disabled:opacity-50">
                            {#each categories as cat}
                                <option value={cat}>{cat}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-2">어떻게 추천해줄까?</label>
                    <select bind:value={selectedFilter} disabled={isSpinning} class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-[#8B0029] disabled:opacity-50">
                        {#each filters as f}
                            <option value={f}>{f}</option>
                        {/each}
                    </select>
                </div>
            </div>
        {:else}
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4" transition:slide>
                <div>
                    <label class="block text-xs font-bold text-gray-500 mb-2">참가자 명단 ({betItems.length}/8)</label>

                    <div class="flex gap-2 mb-3">
                        <input
                            type="text" bind:value={newBetName} onkeydown={(e) => e.key === 'Enter' && addBetItem()} disabled={isSpinning} placeholder="이름 입력 (예: 김고대)" maxlength="8" class="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#8B0029] disabled:opacity-50"
                        />
                        <button onclick={addBetItem} disabled={isSpinning} class="bg-gray-800 text-white w-12 rounded-xl flex items-center justify-center hover:bg-black active:scale-95 transition-transform disabled:opacity-50">
                            <Plus size={20} />
                        </button>
                    </div>

                    <div class="flex flex-wrap gap-2">
                        {#each betItems as item, i}
                            <div class="flex items-center gap-1 bg-red-50 text-[#8B0029] px-3 py-1.5 rounded-full text-sm font-bold border border-red-100 animate-fade-in">
                                {item}
                                <button onclick={() => removeBetItem(i)} disabled={isSpinning} class="p-0.5 hover:bg-red-200 rounded-full transition-colors disabled:opacity-50">
                                    <X size={14} />
                                </button>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}

        <button onclick={startSpin} disabled={isSpinning} class="w-full mt-6 py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all active:scale-[0.98] {isSpinning ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-[#8B0029] text-white shadow-[0_4px_15px_rgba(139,0,41,0.3)] hover:bg-[#6b0020]'}">
            {#if isSpinning}
                <RefreshCw size={20} class="animate-spin" /> 운명 선택 중...
            {:else}
                돌림판 돌리기! GO!
            {/if}
        </button>
    </div>

    {#if showResultModal && winner}
        <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" transition:fade>
            <div class="bg-white rounded-3xl w-full max-w-sm p-6 flex flex-col items-center shadow-2xl relative" transition:scale={{ start: 0.9, opacity: 0 }}>
                <button class="absolute top-4 right-4 text-gray-400 hover:text-gray-800" onclick={() => (showResultModal = false)}>
                    <X size={24} />
                </button>

                <div class="text-4xl mb-2 mt-4">🎉</div>
                <h2 class="text-sm font-bold text-gray-500 mb-1">{activeTab === 'restaurant' ? '오늘의 메뉴는 바로 여기!' : '축하합니다! 당첨자는'}</h2>
                <div class="text-3xl font-['Jua'] text-[#8B0029] my-4 text-center leading-tight">{winner.name}</div>

                {#if winner.type === 'restaurant'}
                    <a href="/restaurant/{winner.id}" class="w-full bg-[#8B0029] text-white py-3.5 rounded-xl font-bold text-center mt-2 flex justify-center items-center gap-2 hover:bg-[#6b0020] active:scale-95 transition-transform shadow-md">
                        <MapPin size={18} /> 식당 정보 보러가기
                    </a>
                {/if}

                <button onclick={() => (showResultModal = false)} class="w-full bg-gray-100 text-gray-600 py-3.5 rounded-xl font-bold mt-3 hover:bg-gray-200 transition-colors">
                    닫기
                </button>
            </div>
        </div>
    {/if}
</div>

<style>
    @keyframes fade-in {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
    }
    .animate-fade-in { animation: fade-in 0.2s ease-out; }
</style>