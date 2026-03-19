<script>
    import { getCategoryIconPath } from '$lib/data/categoryIcons.js';
    import { getTodaySchedule } from '$lib/data/busSchedule'; 
    import { onMount } from 'svelte';
    import { X, Mail, Send, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-svelte';
    import { slide, fly } from 'svelte/transition';
    import { goto } from '$app/navigation';

    let { data } = $props();
    
    let categories = $derived(data?.maincategory || []);
    let user = $derived(data?.user);
    let hasSession = $derived(Boolean(data?.hasSession));
    let canUseMeetup = $derived(data?.canUseMeetup || false); // 🔥 서버에서 받아온 이용 가능 여부

    // ▼▼▼ [토스트 알림 로직] ▼▼▼
    let toastMessage = $state('');
    let toastTimeout;

    function showToast(msg) {
        toastMessage = msg;
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastMessage = '';
        }, 2500); 
    }

    // ▼▼▼ [학식 로직] ▼▼▼
    let todayMenu = $derived(data?.todayMenu);
    let activeTab = $state('student');
    let isMenuExpanded = $state(false);

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('.');
        return `${Number(parts[1])}.${Number(parts[2])}`;
    }

    // ▼▼▼ [버스 로직] ▼▼▼
    let nextToStation = $state('운행 종료');
    let nextToSchool = $state('운행 종료');
    let isOsongToStation = $state(false); 
    let isOsongToSchool = $state(false);  
    let isBusModalOpen = $state(false);

    function timeToMinutes(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    }

    function updateBusTime() {
        const schedule = getTodaySchedule();
        
        if (!schedule) {
            nextToStation = "오늘 운행 없음";
            nextToSchool = "오늘 운행 없음";
            return;
        }

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const nextStationBus = schedule.toStation.find(t => timeToMinutes(t) > currentMinutes);
        if (nextStationBus) {
            const diff = timeToMinutes(nextStationBus) - currentMinutes;
            nextToStation = diff > 60 ? `${nextStationBus}` : `${nextStationBus} (${diff}분 전)`;
            isOsongToStation = (nextStationBus === "18:20");
        } else {
            nextToStation = "운행 종료";
            isOsongToStation = false;
        }

        const nextSchoolBus = schedule.toSchool.find(t => timeToMinutes(t) > currentMinutes);
        if (nextSchoolBus) {
            const diff = timeToMinutes(nextSchoolBus) - currentMinutes;
            nextToSchool = diff > 60 ? `${nextSchoolBus}` : `${nextSchoolBus} (${diff}분 전)`;
            isOsongToSchool = (nextSchoolBus === "08:30");
        } else {
            nextToSchool = "운행 종료";
            isOsongToSchool = false;
        }
    }

    onMount(() => {
        updateBusTime();
        const interval = setInterval(updateBusTime, 60000);
        return () => clearInterval(interval);
    });

    // ▼▼▼ [문의하기 로직] ▼▼▼
    let isContactModalOpen = $state(false);
    let contactCategory = $state('맛집 추가');
    let contactContent = $state('');
    let contactInfo = $state('');
    let isSending = $state(false);

    const contactCategories = ['맛집 추가', '정보 수정', '기능 제안', '버그 신고', '기타'];

    $effect(() => {
        if (typeof window !== 'undefined') {
            if (isContactModalOpen || isBusModalOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        }
    });

    function requireLogin() {
        showToast('로그인이 필요합니다.');
        setTimeout(() => goto('/login'), 1200);
    }

    function handleContactClick() {
        if (!hasSession) {
            requireLogin();
            return;
        }

        isContactModalOpen = true;
    }

    async function sendInquiry() {
        if (!contactContent.trim()) {
            showToast('내용을 입력해주세요! ✍️');
            return;
        }
        isSending = true;
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                body: JSON.stringify({ category: contactCategory, content: contactContent, contact: contactInfo })
            });

            if (res.status === 401 || res.status === 403) {
                showToast('로그인 후 이용할 수 있어요! 🔒');
                isContactModalOpen = false;
                return;
            }

            if (res.ok) {
                showToast('소중한 의견 감사합니다! 🙇‍♂️'); 
                isContactModalOpen = false;
                contactContent = '';
                contactInfo = '';
            } else {
                showToast('전송에 실패했습니다. 잠시 후 다시 시도해주세요. 😢'); 
            }
        } catch (e) {
            showToast('오류가 발생했습니다. 🚨'); 
        } finally {
            isSending = false;
        }
    }

    // ▼▼▼ [만나볼텨? 로직 - 로그인 및 정보 검사 추가] ▼▼▼
    function handleShopClick() {
        if (!hasSession) {
            requireLogin();
            return;
        }

        goto('/shop');
    }

    function handleMeetupClick() {
        if (typeof window !== 'undefined' && window.posthog) {
            window.posthog.capture('clicked_meetup_entry_btn'); // 🚀 버튼 클릭 이벤트 전송
        }
        
        if (!hasSession) {
            requireLogin();
            return;
        }

        if (!canUseMeetup) {
            showToast('🚨 만나볼텨?에 필요한 정보 입력 후 이용해주세요!');
            // error 파라미터를 붙여서 보내면 마이페이지에서 자동으로 수정폼이 열립니다!
            setTimeout(() => goto('/my?error=meetup_profile'), 1500);
            return;
        }

        goto('/meetup');
    }
</script>

{#snippet MenuCard(title, items, bgColor, textColor)}
    <div class={`p-4 rounded-xl border ${bgColor} border-opacity-50`}>
        <h4 class={`text-sm font-bold mb-2 ${textColor} flex items-center`}>
            {title}
        </h4>
        {#if items && items.length > 0}
            <ul class="space-y-1">
                {#each items as item}
                    <li class="text-sm text-gray-700 font-['Noto_Sans_KR'] leading-relaxed">
                        {item}
                    </li>
                {/each}
            </ul>
        {:else}
            <p class="text-xs text-gray-400">메뉴 정보 없음</p>
        {/if}
    </div>
{/snippet}

{#if toastMessage}
    <div class="fixed top-20 left-1/2 -translate-x-1/2 bg-[#9e1b34]/95 backdrop-blur-sm text-white px-5 py-3 rounded-full shadow-2xl text-sm font-bold z-[10000] flex items-center gap-2 whitespace-nowrap" 
         transition:fly={{ y: -20, duration: 300 }}>
        {toastMessage}
    </div>
{/if}

<div class="flex flex-col items-center w-full min-h-screen bg-white max-w-md mx-auto relative shadow-sm">
    
    <header class="sticky top-0 z-20 w-full bg-white/90 backdrop-blur-sm border-b border-gray-50 px-4 py-3 flex justify-between items-center">
        <!-- 🛒 상점(Shop) 진입 버튼 (왼쪽) -->
        <button 
            type="button"
            class="flex flex-col items-center justify-center p-1 text-[#8B0029] hover:bg-gray-100 transition-colors rounded-lg active:scale-95"
            aria-label="상점"
            onclick={() => {
                if (typeof window !== 'undefined' && window.posthog) window.posthog.capture('clicked_shop_entry_btn');
                handleShopClick();
            }}
        >
            <ShoppingCart size={22} class="mb-0.5" />
            <span class="text-[10px] font-bold font-['Jua']">포인트샵</span>
        </button>

        <!-- 📬 문의하기 버튼 (오른쪽) -->
        <button 
            onclick={() => {
                handleContactClick();
                if (typeof window !== 'undefined' && window.posthog) window.posthog.capture('clicked_contact_btn');
            }}
            class="flex flex-col items-center justify-center p-1 text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100 active:scale-95"
            aria-label="문의하기"
        >
            <Mail size={22} class="mb-0.5" />
            <span class="text-[10px] font-bold font-['Jua']">문의하기</span>
        </button>
    </header>

    <div class="mt-4 mb-8 text-center animate-fade-in px-4">
        <h1 class="text-5xl font-['Jua'] text-[#8B0029] mb-2">골라바유!</h1>
        <p class="text-[#6b0d0d]/50 text-sm font-medium font-['Noto_Sans_KR']">오늘 뭐 먹지? 고민될 땐 골라바유!</p>
    </div>

    {#if categories.length > 0}
        <div class="grid grid-cols-5 gap-x-1 gap-y-3 w-full px-5 animate-fade-in-up pb-5">
            {#each categories as category}
                {@const iconSrc = getCategoryIconPath(category.name)}
                <a href="/list/{category.name}" class="group flex flex-col items-center gap-1 active:scale-95 transition-transform" onclick={() => { if (typeof window !== 'undefined' && window.posthog) window.posthog.capture('clicked_category', { category_name: category.name }); }}>
                    <div class="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors overflow-hidden">
                        <img src={iconSrc} alt={category.name} class="w-10 h-10 object-contain" />
                    </div>
                    <span class="text-xs font-bold text-gray-600 group-hover:text-gray-900 font-['Noto_Sans_KR']">{category.name}</span>
                </a>
            {/each}
        </div>
    {:else}
        <div class="py-10 text-center text-gray-400 font-['Noto_Sans_KR']">
            데이터를 불러오는 중...
        </div>
    {/if}

    <div class="w-full px-4 mb-8">
        <a 
            href="https://fund.korea.ac.kr/koreaSejong/7803/subview.do"
            target="_blank"
            rel="noopener noreferrer"
            class="block w-full bg-white border border-gray-100 rounded-xl p-5 shadow-sm active:scale-[0.98] transition-transform text-left group"
            onclick={() => { if (typeof window !== 'undefined' && window.posthog) window.posthog.capture('clicked_shuttle_bus_info'); }}
        >
            <div class="flex justify-between items-center mb-4">
                <h2 class="font-bold text-lg text-gray-800 flex items-center gap-2 font-['Jua']">
                    🚌 셔틀버스 시간
                    <span class="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-sans animate-pulse">LIVE</span>
                </h2>
                <span class="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">공식 시간표 보기 ></span>
            </div>

            <div class="space-y-4 font-['Noto_Sans_KR']">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">학교 출발</span>
                    </div>
                    <div class="flex items-center gap-2">
                        {#if isOsongToStation}
                            <span class="text-[10px] font-bold text-white bg-indigo-500 px-1.5 py-0.5 rounded">오송역</span>
                        {/if}
                        <span class="text-xl font-bold text-blue-600 tabular-nums tracking-tight">{nextToStation}</span>
                    </div>
                </div>
                
                <div class="w-full h-[1px] bg-gray-50"></div>

                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        {#if isOsongToSchool}
                            <span class="text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg">오송역 출발</span>
                        {:else}
                            <span class="text-sm font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">조치원역 출발</span>
                        {/if}
                    </div>
                    <span class="text-xl font-bold text-red-500 tabular-nums tracking-tight">{nextToSchool}</span>
                </div>
            </div>
        </a>
    </div>

    <div class="w-full px-4 mb-6 animate-fade-in pb-32">
        <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-all">
            <div class="px-5 py-3 border-b border-gray-50 flex justify-between items-center">
                <h2 class="font-bold text-lg text-gray-800 flex items-center gap-2 font-['Jua']">
                    🍽️ 오늘의 학식
                    {#if todayMenu}
                        <span class="text-xs font-normal text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                            {formatDate(todayMenu.date)} ({todayMenu.day})
                        </span>
                    {/if}
                </h2>
            </div>

            {#if todayMenu}
                {#if !isMenuExpanded}
                    <button 
                        class="w-full flex flex-col items-center justify-center cursor-pointer bg-red-50/50 hover:bg-red-50 transition-colors py-3 group"
                        onclick={() => isMenuExpanded = true}
                    >
                        <div class="text-[#8B0029] transition-transform group-hover:scale-110 group-active:scale-95">
                            <ChevronDown size={24} strokeWidth={2.5} />
                        </div>
                    </button>
                {/if}

                {#if isMenuExpanded}
                    <div transition:slide={{ duration: 300 }}>
                        <div class="flex border-b border-gray-100">
                            <button 
                                class={`flex-1 py-3 text-sm font-bold transition-colors relative ${activeTab === 'student' ? 'text-gray-800' : 'text-gray-400 bg-gray-50/50'}`}
                                onclick={() => activeTab = 'student'}
                            >
                                학생식당
                                {#if activeTab === 'student'}
                                    <div class="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500"></div>
                                {/if}
                            </button>
                            <button 
                                class={`flex-1 py-3 text-sm font-bold transition-colors relative ${activeTab === 'faculty' ? 'text-gray-800' : 'text-gray-400 bg-gray-50/50'}`}
                                onclick={() => activeTab = 'faculty'}
                            >
                                교직원식당
                                {#if activeTab === 'faculty'}
                                    <div class="absolute bottom-0 left-0 w-full h-0.5 bg-green-500"></div>
                                {/if}
                            </button>
                        </div>

                        <div class="p-4 bg-white min-h-[200px]">
                            {#if activeTab === 'student'}
                                <div class="space-y-3 animate-fade-in">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded">아침 (07:30~09:00)</span>
                                    </div>
                                    {@render MenuCard('🍳 조식', todayMenu.student.breakfast, 'bg-sky-50', 'text-sky-700')}

                                     <div class="flex items-center gap-2 mt-4 mb-1">
                                        <span class="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded">점심 (11:30~13:30)</span>
                                    </div>
                                    <div class="grid grid-cols-1 gap-2">
                                        {@render MenuCard('🍚 한식', todayMenu.student.korean, 'bg-orange-50', 'text-orange-600')}
                                        {@render MenuCard('🍛 일품', todayMenu.student.special, 'bg-blue-50', 'text-blue-600')}
                                        {@render MenuCard('🍜 분식', todayMenu.student.snack, 'bg-yellow-50', 'text-yellow-600')}
                                    </div>
                                    
                                    <div class="flex items-center gap-2 mt-4 mb-1">
                                        <span class="text-xs font-bold text-purple-500 bg-purple-50 px-2 py-0.5 rounded">저녁 (17:30~18:30)</span>
                                    </div>
                                    {@render MenuCard('🍱 석식', todayMenu.student.dinner, 'bg-purple-50', 'text-purple-600')}
                                </div>
                            {:else}
                                <div class="space-y-3 animate-fade-in">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">점심 (11:30~13:30)</span>
                                    </div>
                                    {@render MenuCard('🥘 교직원 중식', todayMenu.faculty.lunch, 'bg-green-50', 'text-green-700')}
                                </div>
                            {/if}
                        </div>
                        
                        <button 
                            class="w-full py-2 bg-red-50/50 flex justify-center items-center text-[#8B0029] hover:bg-red-50 transition-all border-t border-red-100 group"
                            onclick={() => isMenuExpanded = false}
                        >
                            <ChevronUp size={24} strokeWidth={2.5} class="transition-transform group-hover:scale-110 group-active:scale-95" />
                        </button>
                    </div>
                {/if}
            {:else}
                <div class="py-8 text-center flex flex-col items-center justify-center gap-2">
                    <div class="text-4xl">😴</div>
                    <p class="text-gray-400 text-sm font-['Noto_Sans_KR']">
                        오늘은 학식 운영 정보가 없어요<br>
                        (주말 혹은 공휴일입니다)
                    </p>
                </div>
            {/if}
        </div>
    </div>

    {#if isContactModalOpen}
        <div class="fixed inset-0 bg-black/50 z-[9999] flex items-end sm:items-center justify-center sm:p-4" onclick={() => isContactModalOpen = false}>
            <div 
                class="bg-white w-full max-w-sm sm:rounded-2xl rounded-t-2xl p-6 shadow-2xl animate-fade-in-up max-h-[85dvh] overflow-y-auto flex flex-col" 
                onclick={(e) => e.stopPropagation()}
            >
                <div class="flex justify-between items-center mb-6 shrink-0">
                    <h3 class="font-bold text-xl text-gray-900 font-['Jua']">문의하기 📬</h3>
                    <button onclick={() => isContactModalOpen = false} class="text-gray-400 hover:text-black">
                        <X size={24} />
                    </button>
                </div>
                <div class="mb-4 shrink-0">
                    <label class="block text-xs font-bold text-gray-500 mb-2">어떤 내용을 보내시나요?</label>
                    <div class="flex flex-wrap gap-2">
                        {#each contactCategories as cat}
                            <button 
                                onclick={() => contactCategory = cat}
                                class="px-3 py-1.5 rounded-full text-xs font-bold transition-all border {contactCategory === cat ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}"
                            >
                                {cat}
                            </button>
                        {/each}
                    </div>
                </div>
                <div class="mb-4 shrink-0">
                    <textarea 
                        bind:value={contactContent}
                        placeholder="내용을 자유롭게 적어주세요. (맛집 제보 시 식당 이름 필수!)"
                        class="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl resize-none text-sm outline-none focus:border-black focus:bg-white transition-colors placeholder-gray-400"
                    ></textarea>
                </div>
                <div class="mb-6 shrink-0">
                    <label class="block text-xs font-bold text-gray-500 mb-2">답변 받을 연락처 (선택)</label>
                    <input 
                        type="text" 
                        bind:value={contactInfo}
                        placeholder="이메일 또는 카카오톡 ID"
                        class="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-black focus:bg-white transition-colors"
                    />
                </div>
                <button 
                    onclick={sendInquiry} 
                    disabled={isSending}
                    class="w-full py-4 bg-black text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-[0.98] transition-all disabled:bg-gray-300 disabled:cursor-not-allowed shrink-0"
                >
                    {#if isSending}
                        <span class="animate-spin">⏳</span> 전송 중...
                    {:else}
                        <Send size={20} /> 전송하기
                    {/if}
                </button>
            </div>
        </div>
    {/if}

    <button 
        onclick={handleMeetupClick}
        class="fixed bottom-24 right-4 md:right-[calc(50%-13rem)] z-40 bg-[#8B0029] text-white px-5 py-3 rounded-2xl shadow-[0_4px_14px_rgba(139,0,41,0.4)] font-bold text-lg active:scale-95 transition-transform flex items-center gap-2 font-['Jua']"
    >
        만나볼텨?
    </button>

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
