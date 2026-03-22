<script lang="ts">
	import { enhance } from '$app/forms';
	import { ChevronLeft, MapPin, Clock, Bell, ShieldAlert, Copy } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { fly } from 'svelte/transition';
	import { page } from '$app/stores';

	let { data } = $props();
	let user = $derived(data.user);
	let room = $derived(data.room);

	let isCreator = $derived(data.isCreator);
	let appliedReq = $derived(data.appliedReq);

	let isAdmin = $derived(user?.role === 'admin');
	let isTestMode = $derived($page.url.searchParams.get('test') === 'participant');

	let isHostReady = $derived(appliedReq?.status === 'HOST_READY' || appliedReq?.status === 'MATCHED');
	let isApplicantReady = $derived(appliedReq?.status === 'APPLICANT_READY' || appliedReq?.status === 'MATCHED');
	let isMatchComplete = $derived(room.status === 'MATCHED' || appliedReq?.status === 'MATCHED');

	let isProcessing = $state(false);
	let isDeleting = $state(false);
	let showConfirmDelete = $state(false);
	let toastMessage = $state('');
	let toastTimeout: ReturnType<typeof setTimeout> | null = null;

	function showToast(msg: string) {
		toastMessage = msg;
		if (toastTimeout) clearTimeout(toastTimeout);
		toastTimeout = setTimeout(() => {
			toastMessage = '';
		}, 2500);
	}

	function formatTime(isoString: string) {
		return new Date(isoString).toLocaleString('ko-KR', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatMatchedTime(isoString: string | null) {
		if (!isoString) return null;
		return new Date(isoString).toLocaleTimeString('ko-KR', {
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function handleDelete() {
		if (typeof window !== 'undefined' && window.posthog) {
			window.posthog.capture('attempt_delete_meetup_room', { roomId: room.id });
		}
		showConfirmDelete = false;
		isDeleting = true;
		return async ({ result }: any) => {
			isDeleting = false;
			if (result.type === 'redirect') {
				if (typeof window !== 'undefined' && window.posthog) {
					window.posthog.capture('delete_meetup_room_success', { roomId: room.id });
				}
				showToast('방이 삭제되었습니다.');
				setTimeout(() => {
					goto(result.location);
				}, 1500);
			} else if (result.type === 'failure') {
				if (typeof window !== 'undefined' && window.posthog) {
					window.posthog.capture('delete_meetup_room_fail', {
						roomId: room.id,
						reason: result.data?.message
					});
				}
				showToast(result.data?.message || '방 삭제에 실패했습니다.');
			}
		};
	}

	function handleAction({ action }: any) {
		const actionName = action.search ? action.search.replace('?/', '') : 'unknown';
		if (typeof window !== 'undefined' && window.posthog) {
			window.posthog.capture(`attempt_${actionName}_meetup_room`, { roomId: room.id });
		}
		isProcessing = true;
		return async ({ result, update }: any) => {
			isProcessing = false;
			if (result.type === 'success') {
				if (typeof window !== 'undefined' && window.posthog) {
					window.posthog.capture(`${actionName}_meetup_room_success`, { roomId: room.id });
				}
				showToast(result.data?.message || '완료되었습니다.');
				update();
			} else if (result.type === 'failure') {
				if (typeof window !== 'undefined' && window.posthog) {
					window.posthog.capture(`${actionName}_meetup_room_fail`, {
						roomId: room.id,
						reason: result.data?.message
					});
				}
				showToast(result.data?.message || '실패했습니다.');
			}
		};
	}

	function getGenderText(gender: string | null) {
		if (gender === 'male' || gender === 'MALE') return '남';
		if (gender === 'female' || gender === 'FEMALE') return '여';
		return '비공개';
	}

	function getConditionText(genderCondition: string) {
		if (genderCondition === 'MALE') return '남자만';
		if (genderCondition === 'FEMALE') return '여자만';
		return '성별무관';
	}

	function getContactTypeText(contactType: string | null) {
		if (contactType === 'KAKAO') return 'KAKAO';
		if (contactType === 'INSTA') return 'INSTA';
		return '연락처';
	}

	async function copyContactId() {
		if (!room.contactId) return;
		await navigator.clipboard.writeText(room.contactId);
		if (typeof window !== 'undefined' && window.posthog) {
			window.posthog.capture('copy_contact_id', { roomId: room.id, type: room.contactType });
		}
		showToast('연락처를 복사했습니다.');
	}
</script>

<div class="flex flex-col w-full min-h-screen bg-[#F8F9FA] max-w-md mx-auto relative pb-32 overflow-x-hidden">
	{#if isAdmin}
		{#if !isTestMode}
			<div class="bg-gray-800 text-yellow-300 text-xs font-bold text-center py-2 flex justify-center items-center gap-2 shadow-sm">
				<span>관리자 모드:</span><a href="?test=participant" class="underline hover:text-white transition-colors">참여자 시점으로 보기</a>
			</div>
		{:else}
			<div class="bg-yellow-300 text-gray-800 text-xs font-bold text-center py-2 flex justify-center items-center gap-2 shadow-sm">
				<span>현재 참여자 시점으로 보고 있습니다.</span><a href="/meetup/{room.id}" class="underline hover:text-black transition-colors">방장 시점으로 돌아가기</a>
			</div>
		{/if}
	{/if}

	<header class="bg-white sticky top-0 z-30 p-4 flex items-center justify-between border-b border-red-50 shadow-sm">
		<button onclick={() => goto('/meetup')} class="p-2 -ml-2 text-[#8B0029] active:scale-95"><ChevronLeft size={24} /></button>
		<h1 class="text-xl font-bold font-['Jua'] text-[#8B0029]">진짜 만날겨?</h1>
		<div class="w-10 flex justify-end">
			{#if isCreator}
				<div class="relative p-1">
					<Bell size={24} class="text-[#8B0029]" />
					{#if appliedReq && !isHostReady}
						<div class="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
					{/if}
				</div>
			{/if}
		</div>
	</header>

	<div class="p-5 flex flex-col gap-4">
		<div class="bg-white p-5 rounded-2xl shadow-sm border border-red-50 flex flex-col gap-3">
			<div class="flex justify-between items-start">
				<span class="text-xs font-bold px-3 py-1 bg-[#8B0029] text-white rounded-md">{room.headcountCondition === '1:1' ? '밥약' : '과팅'} {room.headcountCondition}</span>
				<span class="text-xs font-bold px-2 py-1 bg-red-50 text-[#8B0029] rounded-md">{getConditionText(room.genderCondition)}</span>
			</div>
			<h2 class="text-xl font-bold text-[#4a0715] leading-snug">{room.title}</h2>
			<div class="w-full h-px bg-red-50 my-1"></div>
			<div class="flex items-center gap-2 text-sm text-[#6b0d0d] font-bold">
				<MapPin size={16} class="text-[#8B0029]" />
				{#if room.restaurantId}
					<a href="/restaurant/{room.restaurantId}" class="hover:underline hover:text-[#8B0029] cursor-pointer transition-colors active:scale-95 flex items-center gap-1">
						{room.restaurantName}
						<span class="text-[10px] bg-red-50 text-[#8B0029] px-1.5 py-0.5 rounded-md font-bold ml-1">상세보기</span>
					</a>
				{:else}
					{room.restaurantName}
				{/if}
			</div>
			<div class="flex items-center gap-2 text-sm text-[#6b0d0d] font-bold">
				<Clock size={16} class="text-[#8B0029]" />
				{formatTime(room.appointmentTime)}
			</div>
		</div>

		{#if isMatchComplete}
			<div class="p-6 bg-[#8B0029] rounded-2xl text-white flex flex-col items-center gap-3 shadow-lg animate-fade-in">
				<span class="text-4xl">🎉</span>
				<h3 class="text-2xl font-bold font-['Jua']">매칭 성사 완료!</h3>
				<p class="text-sm text-red-100 text-center font-bold">이제 서로 연락해서 약속을 잡아보세요.</p>
				{#if formatMatchedTime(room.matchedAt)}
					<div class="w-full bg-white/10 border border-red-400/20 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-sm font-bold text-red-50">
						<Clock size={16} class="text-red-100" />
						<span>성사 시각 {formatMatchedTime(room.matchedAt)}</span>
					</div>
				{/if}
				<p class="text-xs text-yellow-300 text-center font-bold mt-1 bg-black/20 px-3 py-1.5 rounded-full inline-block animate-pulse">1시간이 지나면 방이 사라지니 빨리 연락해 주세요.</p>
				<div class="bg-white/10 w-full p-4 rounded-xl flex flex-col gap-2 mt-2 border border-red-400/30 text-center relative">
					<span class="text-xs font-bold text-red-200">방장 연락처 ({getContactTypeText(room.contactType)})</span>
					<div class="flex items-center justify-center gap-2">
						<span class="text-2xl font-bold tracking-wide select-all">{room.contactId}</span>
						<button type="button" onclick={copyContactId} class="text-red-200 hover:text-white active:scale-95 transition-all p-2 bg-white/10 rounded-lg shadow-sm" aria-label="연락처 복사" title="연락처 복사">
							<Copy size={20} />
						</button>
					</div>
				</div>
			</div>
		{:else}
			<div class="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden flex flex-col">
				<div class="bg-[#8B0029] text-white text-center py-2 text-sm font-bold font-['Jua']">현황</div>

				<div class="flex w-full divide-x divide-red-50 h-[190px]">
					<div class="flex-1 flex flex-col justify-center p-4 bg-red-50/50 relative">
						<div class="absolute top-2 left-2 text-[10px] font-bold bg-[#8B0029] text-white px-1.5 py-0.5 rounded">방장</div>

						<div class="flex-1 flex flex-col justify-center items-center w-full mt-4 gap-1.5">
							<span class="text-lg font-bold text-[#4a0715] text-center line-clamp-1">
								{isCreator && isTestMode ? 'test' : room.creatorNickname}
							</span>
							<span class="text-[11px] font-bold bg-red-100/50 text-[#8B0029] px-2 py-1.5 rounded-md text-center leading-tight break-keep shadow-sm">
								{isCreator && isTestMode ? '23학번' : (room.creatorGrade || '학년미상')} /
								{getGenderText(isCreator && isTestMode ? 'male' : room.creatorGender)} /
								{isCreator && isTestMode ? 'test학과' : (room.creatorDepartment || '학과미상')} /
								{getContactTypeText(room.contactType)}
							</span>
						</div>

						<div class="mt-auto w-full pt-2">
							{#if isHostReady}
								<form method="POST" action="?/cancelReady" use:enhance={handleAction}>
									<button type="submit" disabled={!isCreator} class="w-full py-2.5 rounded-lg text-sm font-bold shadow-sm bg-gray-500 text-white active:scale-95 transition-all">
										확인 취소
									</button>
								</form>
							{:else}
								<form method="POST" action="?/confirm" use:enhance={handleAction}>
									<button type="submit" disabled={!appliedReq || !isCreator} class="w-full py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all {!appliedReq ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : isCreator ? 'bg-[#8B0029] text-white active:scale-95' : 'bg-gray-200 text-gray-400'}">
										확인
									</button>
								</form>
							{/if}
						</div>
					</div>

					<div class="flex-1 flex flex-col justify-center p-4 relative">
						<div class="absolute top-2 right-2 text-[10px] font-bold bg-gray-400 text-white px-1.5 py-0.5 rounded">참여자</div>

						{#if !appliedReq}
							<div class="flex-1 flex items-center justify-center w-full mt-4">
								{#if isCreator}
									<span class="text-sm font-bold text-gray-400">대기 중...</span>
								{:else}
									<form method="POST" action="?/apply" use:enhance={handleAction} class="w-full">
										<button type="submit" disabled={isProcessing} class="w-full py-3 bg-[#8B0029] text-white font-bold rounded-lg shadow-sm active:scale-95 transition-all text-sm">
											{isProcessing ? '처리 중...' : '참가'}
										</button>
									</form>
								{/if}
							</div>
							<div class="mt-auto w-full pt-2">
								<button disabled class="w-full py-2.5 bg-gray-100 text-gray-400 rounded-lg text-sm font-bold shadow-sm">확인</button>
							</div>
						{:else}
							<div class="flex-1 flex flex-col items-center justify-center w-full mt-4 gap-1.5 relative">
								<span class="text-lg font-bold text-gray-800 break-all text-center">
									{isTestMode ? 'test' : appliedReq.nickname}
								</span>
								<span class="text-[11px] font-bold bg-gray-100 text-gray-600 px-2 py-1.5 rounded-md text-center leading-tight break-keep shadow-sm">
									{isTestMode ? '23학번' : (appliedReq.grade || '학년미상')} /
									{getGenderText(isTestMode ? 'male' : appliedReq.gender)} /
									{isTestMode ? 'test학과' : (appliedReq.department || '학과미상')} /
									{getContactTypeText(appliedReq.contactType)}
								</span>
								{#if isApplicantReady}
									<span class="absolute -top-4 text-[10px] text-white font-bold bg-[#8B0029] px-2 py-0.5 rounded-full shadow-md">준비 완료!</span>
								{/if}
							</div>
							<div class="mt-auto w-full pt-2 flex gap-2">
								{#if isApplicantReady}
									<form method="POST" action="?/cancelReady" use:enhance={handleAction} class="w-full">
										<button type="submit" disabled={isCreator && !isTestMode} class="w-full py-2.5 rounded-lg text-sm font-bold shadow-sm bg-gray-500 text-white active:scale-95 transition-all">
											확인 취소
										</button>
									</form>
								{:else}
									{#if (!isCreator || isTestMode)}
										<form method="POST" action="?/cancelApply" use:enhance={handleAction} class="w-1/2">
											<button type="submit" disabled={isProcessing} class="w-full py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold shadow-sm hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all">
												참가 취소
											</button>
										</form>
									{/if}
									<form method="POST" action="?/confirm" use:enhance={handleAction} class={(!isCreator || isTestMode) ? 'w-1/2' : 'w-full'}>
										<button type="submit" disabled={isCreator && !isTestMode} class="w-full py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all {(!isCreator || isTestMode) ? 'bg-[#8B0029] text-white active:scale-95' : 'bg-gray-200 text-gray-400'}">
											확인
										</button>
									</form>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<div class="bg-[#8B0029]/5 p-4 rounded-xl border border-[#8B0029]/10 flex gap-3 items-start">
			<ShieldAlert size={20} class="text-[#8B0029] shrink-0 mt-0.5" />
			<p class="text-xs text-[#6b0d0d] leading-relaxed font-bold">연락처는 매칭 성사 시에만 공개됩니다.</p>
		</div>
	</div>

	<div class="fixed left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-sm border-t border-red-50 p-4 z-40" style="bottom: calc(64px + env(safe-area-inset-bottom));">
		{#if isCreator && !isMatchComplete}
			<button type="button" onclick={() => { showConfirmDelete = true; }} disabled={isDeleting} class="w-full py-3 bg-red-50 text-red-500 font-bold rounded-xl text-sm shadow-sm active:scale-95">방 폭파 버튼</button>
		{:else}
			<button onclick={() => goto('/meetup')} class="w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-xl text-sm shadow-sm active:scale-95">리스트로 돌아가기</button>
		{/if}
	</div>
</div>

{#if showConfirmDelete}
	<div class="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm" transition:fly={{ y: 20, duration: 200 }}>
		<div class="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col items-center">
			<div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4"><span class="text-3xl">💥</span></div>
			<p class="text-xl font-bold text-[#8B0029] mb-2 font-['Jua']">정말로 방을 폭파하시겠어요?</p>
			<p class="text-sm text-[#6b0d0d]/70 mb-6 text-center font-bold">폭파한 방은 다시 복구할 수 없습니다.<br />기다리던 알림도 함께 사라집니다.</p>
			<div class="flex gap-3 w-full">
				<button onclick={() => showConfirmDelete = false} class="flex-1 py-3.5 bg-gray-100 rounded-xl font-bold text-gray-600 active:scale-95">조금 더 보기</button>
				<form method="POST" action="?/deleteRoom" use:enhance={handleDelete} class="flex-1">
					<button type="submit" class="w-full py-3.5 bg-[#8B0029] text-white rounded-xl font-bold active:scale-95 shadow-md">바로 폭파할래요</button>
				</form>
			</div>
		</div>
	</div>
{/if}

{#if toastMessage}
	<div class="fixed top-20 left-1/2 -translate-x-1/2 bg-[#9e1b34]/95 backdrop-blur-sm text-white px-5 py-3 rounded-full shadow-2xl text-sm font-bold z-[10000]" transition:fly={{ y: -20, duration: 300 }}>
		{toastMessage}
	</div>
{/if}

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.animate-fade-in {
		animation: fade-in 0.4s ease-out;
	}
</style>
