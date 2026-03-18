<script lang="ts">
    import { enhance } from '$app/forms';
    import { ChevronLeft, Ticket, Zap } from 'lucide-svelte';
    import { fly, fade } from 'svelte/transition';

    let { data } = $props();
    let user = $derived(data.user);
    let myRooms = $derived(data.myRooms);

    let showModal = $state(false);
    let selectedRoomId = $state<number | null>(null);
    let isSubmitting = $state(false);
    let toastMessage = $state('');

    function showToast(msg: string) {
        toastMessage = msg;
        setTimeout(() => toastMessage = '', 2500);
    }

    function handleBump() {
        if (typeof window !== 'undefined' && window.posthog && selectedRoomId) {
            window.posthog.capture('attempt_bump_room', { roomId: selectedRoomId });
        }
        isSubmitting = true;
        return async ({ result, update }: any) => {
            isSubmitting = false;
            showModal = false;
            if (result.type === 'success') {
                if (typeof window !== 'undefined' && window.posthog) {
                    window.posthog.capture('bump_room_success', { roomId: selectedRoomId });
                }
                showToast('매칭가속티켓 사용 완료!');
                selectedRoomId = null;
                update();
            } else if (result.type === 'failure') {
                if (typeof window !== 'undefined' && window.posthog) {
                    window.posthog.capture('bump_room_fail', { reason: result.data?.message });
                }
                showToast(result.data?.message || '사용 실패했습니다.');
            }
        };
    }
</script>

<div class="flex flex-col w-full min-h-screen bg-[#F8F9FA] max-w-md mx-auto relative pb-24 overflow-x-hidden">
    <header class="bg-white sticky top-0 z-30 p-4 flex items-center justify-between border-b border-gray-100 shadow-sm">
        <a href="/" class="p-2 -ml-2 text-[#8B0029] active:scale-95">
            <ChevronLeft size={24} />
        </a>
        <h1 class="text-xl font-bold font-['Jua'] text-[#8B0029]">상점</h1>
        <div class="w-8"></div>
    </header>

    <!-- 내 지갑 영역 -->
    <div class="p-5 flex flex-col gap-4">
        <div class="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl shadow-lg relative overflow-hidden animate-fade-in">
            <div class="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            <div class="relative z-10 flex flex-col gap-2">
                <span class="text-gray-400 text-sm font-bold">{user?.nickname}님의 지갑</span>
                <div class="flex items-end gap-1 text-white">
                    <span class="text-3xl font-bold font-['Jua'] tracking-wide">{user?.points?.toLocaleString() || 0}</span>
                    <span class="text-rose-400 font-bold mb-1">P</span>
                </div>
            </div>
        </div>

        <h2 class="text-lg font-bold text-gray-800 mt-2 font-['Jua']">아이템 목록</h2>

        <!-- 아이템 (티켓 디자인, 크림슨 톤) -->
        <button 
            type="button"
            onclick={() => {
                if (typeof window !== 'undefined' && window.posthog) window.posthog.capture('click_bump_ticket_modal_open');
                showModal = true;
            }}
            class="relative bg-gradient-to-r from-[#8B0029] via-[#b30036] to-[#6b0d0d] rounded-xl p-5 shadow-[0_4px_15px_rgba(139,0,41,0.3)] active:scale-95 transition-transform text-left overflow-hidden flex items-center justify-between animate-fade-in"
        >
            <!-- 티켓 양쪽 펀치 구멍 -->
            <div class="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 bg-[#F8F9FA] rounded-full shadow-inner border-r border-[#6b0d0d]/30"></div>
            <div class="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 bg-[#F8F9FA] rounded-full shadow-inner border-l border-[#6b0d0d]/30"></div>

            <div class="flex flex-col z-10 pl-2">
                <div class="flex items-center gap-2 mb-1">
                    <Ticket size={24} class="text-white" />
                    <h3 class="text-xl font-bold text-white font-['Jua']">매칭가속티켓</h3>
                </div>
                <p class="text-[11px] font-bold text-white/80 leading-tight break-keep">내 방을 리스트 최상단으로 끌어올려<br>단숨에 매칭 확률을 200% 올려줍니다!</p>
            </div>
            
            <div class="z-10 bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-lg flex flex-col items-center shadow-sm">
                <span class="text-[10px] text-white font-black">가격</span>
                <span class="text-lg font-black text-white">50<span class="text-sm">P</span></span>
            </div>
        </button>
    </div>
</div>

<!-- 구매 모달 -->
{#if showModal}
    <div class="fixed inset-0 bg-black/60 z-[9999] flex items-end justify-center sm:items-center sm:p-4 backdrop-blur-sm" transition:fade={{ duration: 200 }}>
        <div class="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full max-w-sm flex flex-col items-center" transition:fly={{ y: 200, duration: 300 }}>
            <div class="w-12 h-1 bg-gray-200 rounded-full mb-6 sm:hidden"></div>
            
            <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-[#8B0029] shadow-inner">
                <Zap size={32} />
            </div>
            
            <h3 class="text-xl font-bold text-gray-900 mb-2 font-['Jua']">어떤 방을 가속할까요?</h3>
            
            <p class="text-sm rounded border border-gray-100 bg-gray-50 text-gray-500 p-2 text-center font-bold mb-4 w-full">
                보유 포인트: {user?.points?.toLocaleString()}P 
                <span class="text-xs ml-1 text-red-500">(50P 차감)</span>
            </p>

            {#if myRooms.length === 0}
                <div class="py-8 w-full text-center flex flex-col items-center gap-2 bg-gray-50 rounded-xl mb-4">
                    <span class="text-3xl grayscale">😢</span>
                    <span class="text-sm font-bold text-gray-400 mt-1">현재 모집 중인 내 방이 없어유!</span>
                </div>
                <button type="button" onclick={() => showModal = false} class="w-full py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold active:scale-95">닫기</button>
            {:else}
                <form method="POST" action="?/bump" use:enhance={handleBump} class="w-full flex flex-col gap-3 max-h-60 overflow-y-auto mb-4 pr-1 snap-y">
                    {#each myRooms as r}
                        <label class="relative flex flex-col p-3 border rounded-xl cursor-pointer transition-all snap-center {selectedRoomId === r.id ? 'border-[#8B0029] bg-red-50/30 ring-1 ring-[#8B0029] shadow-sm' : 'border-gray-200 hover:bg-gray-50'}">
                            <input type="radio" name="roomId" value={r.id} bind:group={selectedRoomId} class="hidden" onclick={() => { if (typeof window !== 'undefined' && window.posthog) window.posthog.capture('select_bump_room', { roomId: r.id }) }} />
                            <span class="text-sm font-bold text-gray-800 line-clamp-1 mb-1">{r.title}</span>
                            <div class="flex items-center justify-between">
                                <span class="text-xs text-white font-bold bg-[#8B0029]/80 flex items-center px-1.5 py-0.5 rounded leading-none w-max">#{r.id}</span>
                                <span class="text-[10px] text-gray-400">{new Date(r.appointmentTime).toLocaleDateString()} {new Date(r.appointmentTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </label>
                    {/each}

                    <div class="grid grid-cols-2 gap-2 w-full mt-2">
                        <button type="button" onclick={() => showModal = false} class="py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold active:scale-95">취소</button>
                        <button type="submit" disabled={!selectedRoomId || isSubmitting || user?.points < 50} class="py-3.5 bg-gradient-to-r from-[#8B0029] to-[#b30036] text-white rounded-xl font-bold shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmitting ? '가속 중...' : '50P로 가속!'}
                        </button>
                    </div>
                </form>
            {/if}
        </div>
    </div>
{/if}

{#if toastMessage}
    <div class="fixed top-20 left-1/2 -translate-x-1/2 bg-[#9e1b34]/95 backdrop-blur-sm text-white px-5 py-3 rounded-full shadow-2xl text-sm font-bold z-[10000] flex items-center gap-2 whitespace-nowrap" transition:fly={{ y: -20, duration: 300 }}>
        {toastMessage}
    </div>
{/if}

<style>
    @keyframes fade-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fade-in 0.3s ease-out; }
</style>
