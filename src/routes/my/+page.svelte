<script>
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { Camera, Save, Settings, TriangleAlert } from 'lucide-svelte';
    import { fly } from 'svelte/transition';
    import { universityData } from '$lib/data/majors';

    let { data, form } = $props();

    let user = $derived(data.user);
    let myPosts = $derived(data.myPosts);
    let deleteConfirmationText = $derived(data.deleteConfirmationText);

    let isEditing = $state(false);
    let isDeleteOpen = $state(false);
    let loading = $state(false);
    let deleteLoading = $state(false);
    let showAdminInput = $state(false);

    let editCollege = $state('');
    let deletePhrase = $state('');
    let deletionReason = $state('');
    let deptList = $derived(editCollege ? universityData[editCollege] : []);

    let toastMessage = $state('');
    let toastTimeout;

    function showToast(msg) {
        toastMessage = msg;
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastMessage = '';
        }, 3000);
    }

    $effect(() => {
        if ($page.url.searchParams.get('error') === 'meetup_profile') {
            if (typeof window !== 'undefined' && window.posthog) {
                window.posthog.capture('blocked_meetup_by_incomplete_profile', {
                    missing_kakao: !user.kakaoId,
                    missing_insta: !user.instaId,
                    missing_gender: !user.gender,
                    missing_grade: !user.grade,
                    missing_department: !user.department,
                    missing_college: !user.college
                });
            }

            showToast('모임 기능을 사용하려면 학과와 연락처 정보를 먼저 입력해 주세요.');
            editCollege = user.college || '';
            isEditing = true;
            window.history.replaceState({}, '', '/my');
        } else if (form?.deleteError) {
            showToast(form.deleteError);
        } else if (form?.message) {
            showToast(form.message);
        }
    });

    function startEditing() {
        editCollege = user.college || '';
        isEditing = true;
    }

    const submitProfile = () => {
        if (typeof window !== 'undefined' && window.posthog) {
            window.posthog.capture('attempt_update_profile');
        }

        return async ({ update, result }) => {
            loading = true;
            await update({ reset: false });
            loading = false;

            if (result.type === 'success') {
                isEditing = false;
                showToast('프로필이 수정되었습니다.');
                if (typeof window !== 'undefined' && window.posthog) {
                    window.posthog.capture('updated_profile_success');
                }
            } else if (result.type !== 'failure') {
                showToast('프로필 수정 중 오류가 발생했습니다.');
            }
        };
    };

    const submitAdmin = () => {
        return async ({ update, result }) => {
            await update();

            if (result.type === 'success') {
                showToast(result.data?.message || '관리자 권한이 활성화되었습니다.');
                showAdminInput = false;
                setTimeout(() => window.location.reload(), 1200);
                return;
            }

            showToast(result.data?.message || '관리자 인증에 실패했습니다.');
        };
    };

    const submitDelete = () => {
        if (typeof window !== 'undefined' && window.posthog) {
            window.posthog.capture('submit_delete_account', {
                deletion_reason: deletionReason || null
            });
        }

        return async ({ update, result }) => {
            deleteLoading = true;
            await update({ reset: false });
            deleteLoading = false;

            if (result.type === 'success') {
                if (typeof window !== 'undefined' && window.posthog) {
                    window.posthog.capture('complete_delete_account');
                    window.posthog.reset?.();
                }
                showToast(result.data?.message || '회원 탈퇴가 완료되었습니다.');
                setTimeout(() => {
                    goto('/');
                }, 800);
                return;
            }

            showToast(result.data?.deleteError || '탈퇴 처리 중 오류가 발생했습니다.');
        };
    };
</script>

<div class="relative mx-auto min-h-screen max-w-md bg-gray-50 pb-24">
    <div class="relative z-10 mb-4 rounded-b-3xl bg-white p-6 shadow-sm">
        <div class="mb-6 flex items-center justify-between">
            <h1 class="font-['Jua'] text-2xl font-bold">마이페이지</h1>
            {#if !isEditing}
                <button
                    onclick={startEditing}
                    class="rounded-full bg-gray-50 p-2 text-gray-400 transition-colors hover:text-black"
                >
                    <Settings size={20} />
                </button>
            {/if}
        </div>

        <div class="flex flex-col items-center text-center">
            <div class="relative mb-3 h-20 w-20">
                {#if user.profileImg}
                    <img
                        src={user.profileImg}
                        alt="프로필 이미지"
                        class="h-full w-full rounded-full border-2 border-white object-cover shadow-md"
                    />
                {:else}
                    <div class="flex h-full w-full items-center justify-center rounded-full border-2 border-white bg-gradient-to-tr from-gray-100 to-gray-200 shadow-md">
                        <span class="text-3xl">🙂</span>
                    </div>
                {/if}

                {#if isEditing}
                    <div class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-[1px]">
                        <Camera size={24} />
                    </div>
                {/if}
            </div>

            {#if isEditing}
                <form method="POST" action="?/updateProfile" use:enhance={submitProfile} class="mt-2 flex w-full flex-col gap-3">
                    <div>
                        <label class="ml-1 mb-1 block text-left text-xs font-bold text-gray-400">닉네임</label>
                        <input
                            type="text"
                            name="nickname"
                            value={user.nickname}
                            class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-center font-bold focus:border-black focus:outline-none"
                        />
                    </div>

                    <div>
                        <label class="ml-1 mb-1 block text-left text-xs font-bold text-gray-400">학년</label>
                        <select
                            name="grade"
                            value={user.grade}
                            class="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-center text-sm font-medium focus:border-black focus:outline-none"
                        >
                            <option value="1학년">1학년</option>
                            <option value="2학년">2학년</option>
                            <option value="3학년">3학년</option>
                            <option value="4학년">4학년</option>
                            <option value="5학년 이상">5학년 이상</option>
                            <option value="휴학/졸업">휴학/졸업</option>
                        </select>
                    </div>

                    <div class="flex gap-2">
                        <div class="flex-1">
                            <label class="ml-1 mb-1 block text-left text-xs font-bold text-gray-400">단과대</label>
                            <select
                                name="college"
                                bind:value={editCollege}
                                class="w-full rounded-xl border border-gray-200 bg-gray-50 px-2 py-2 text-center text-xs font-medium focus:border-black focus:outline-none"
                            >
                                <option value="" disabled>선택</option>
                                {#each Object.keys(universityData) as collegeName}
                                    <option value={collegeName}>{collegeName}</option>
                                {/each}
                            </select>
                        </div>

                        <div class="flex-1">
                            <label class="ml-1 mb-1 block text-left text-xs font-bold text-gray-400">학과</label>
                            <select
                                name="department"
                                value={user.department}
                                class="w-full rounded-xl border border-gray-200 bg-gray-50 px-2 py-2 text-center text-xs font-medium focus:border-black focus:outline-none"
                            >
                                <option value="" disabled>선택</option>
                                {#each deptList as dept}
                                    <option value={dept}>{dept}</option>
                                {/each}
                            </select>
                        </div>
                    </div>

                    <div class="mt-2 rounded-xl border border-red-100 bg-red-50/60 p-3">
                        <p class="mb-2 text-[11px] font-bold text-[#8B0029]">모임 기능용 연락처 정보</p>
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center gap-2">
                                <span class="w-14 text-left text-xs font-bold text-gray-600">카카오</span>
                                <input
                                    type="text"
                                    name="kakaoId"
                                    value={user.kakaoId || ''}
                                    placeholder="카카오톡 ID"
                                    class="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold outline-none focus:border-[#8B0029]"
                                />
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="w-14 text-left text-xs font-bold text-gray-600">인스타</span>
                                <input
                                    type="text"
                                    name="instaId"
                                    value={user.instaId || ''}
                                    placeholder="인스타그램 ID"
                                    class="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold outline-none focus:border-[#8B0029]"
                                />
                            </div>
                        </div>
                    </div>

                    <div class="mt-2 flex w-full gap-2">
                        <button
                            type="button"
                            onclick={() => (isEditing = false)}
                            class="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-bold text-gray-600"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-black py-3 text-sm font-bold text-white"
                        >
                            {#if loading}
                                저장 중...
                            {:else}
                                <Save size={16} /> 저장
                            {/if}
                        </button>
                    </div>
                </form>
            {:else}
                <div class="mb-1 flex items-center gap-2">
                    <h2 class="text-xl font-bold text-gray-900">{user.nickname}</h2>
                </div>
                <p class="mb-6 text-sm text-gray-400">
                    {user.college || '단과대 미입력'} | {user.department || '학과 미입력'}
                </p>

                <div class="grid w-full grid-cols-2 gap-3">
                    <div class="rounded-2xl bg-gray-50 p-4 text-center">
                        <span class="mb-1 block text-xs text-gray-400">보유 포인트</span>
                        <span class="block text-xl font-bold text-red-500">{user.points || 0} P</span>
                    </div>
                    <div class="rounded-2xl bg-gray-50 p-4 text-center">
                        <span class="mb-1 block text-xs text-gray-400">작성한 글</span>
                        <span class="block text-xl font-bold text-gray-800">{myPosts.length}개</span>
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <div class="px-5">
        <h2 class="ml-1 mb-4 text-lg font-bold">내가 쓴 글</h2>

        {#if myPosts.length === 0}
            <div class="rounded-2xl border border-dashed border-gray-100 bg-white py-10 text-center text-gray-400">
                <p>아직 작성한 글이 없어요.</p>
                <a href="/golabassyu/write" class="mt-3 inline-block text-sm font-bold text-blue-500 underline">
                    첫 글 쓰러 가기
                </a>
            </div>
        {:else}
            <div class="space-y-3">
                {#each myPosts as post}
                    <a
                        href="/golabassyu?tab=my"
                        class="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-colors hover:border-gray-300 active:scale-[0.98]"
                    >
                        <div class="flex items-start justify-between">
                            <span class="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500">
                                {post.area}
                            </span>
                            <span class="text-[10px] text-gray-300">
                                {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <h3 class="font-bold text-gray-800">{post.title}</h3>
                        <p class="line-clamp-1 text-sm text-gray-500">{post.content}</p>
                        <div class="mt-1 text-xs font-bold text-red-500">좋아요 {post.likes || 0}</div>
                    </a>
                {/each}
            </div>
        {/if}
    </div>

    <div class="mx-5 mt-6 rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
        <button
            type="button"
            onclick={() => (isDeleteOpen = !isDeleteOpen)}
            class="flex w-full items-center justify-between text-left"
        >
            <div>
                <p class="text-sm font-bold text-red-700">회원 탈퇴</p>
                <p class="mt-1 text-xs text-gray-500">회원 탈퇴 시 프로필 정보는 복구할 수 없습니다.</p>
            </div>
            <TriangleAlert class="text-red-400" size={18} />
        </button>

        {#if isDeleteOpen}
            <form
                method="POST"
                action="?/deleteAccount"
                use:enhance={submitDelete}
                class="mt-4 space-y-3 border-t border-red-100 pt-4"
                transition:fly={{ y: 8 }}
            >
                <div class="rounded-2xl bg-red-50 p-4 text-xs leading-5 text-red-900">
                    <p class="font-bold">탈퇴 전에 꼭 확인해 주세요.</p>
                    <p class="mt-2">프로필, 연락처, 학과 정보는 삭제되며 복구할 수 없습니다.</p>
                    <p>작성한 게시글과 댓글은 서비스 기록 보호를 위해 익명 상태로 남을 수 있습니다.</p>
                    <p>진행 중인 모임이나 신청 내역이 있으면 탈퇴가 제한됩니다.</p>
                </div>

                <div>
                    <label class="mb-1 block text-xs font-bold text-gray-500">탈퇴 사유</label>
                    <select
                        name="deletionReason"
                        bind:value={deletionReason}
                        class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none focus:border-red-300"
                    >
                        <option value="">선택 안 함</option>
                        <option value="서비스를 더 이상 사용하지 않음">서비스를 더 이상 사용하지 않음</option>
                        <option value="개인정보 정리">개인정보 정리</option>
                        <option value="기능 불만족">기능 불만족</option>
                        <option value="기타">기타</option>
                    </select>
                </div>

                <div>
                    <label class="mb-1 block text-xs font-bold text-gray-500">
                        확인 문구 입력: <span class="text-red-600">{deleteConfirmationText}</span>
                    </label>
                    <input
                        type="text"
                        name="confirmationText"
                        bind:value={deletePhrase}
                        placeholder={deleteConfirmationText}
                        class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none focus:border-red-300"
                    />
                </div>

                <button
                    type="submit"
                    disabled={deleteLoading || deletePhrase !== deleteConfirmationText}
                    class="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-red-300"
                >
                    {#if deleteLoading}
                        탈퇴 처리 중...
                    {:else}
                        회원 탈퇴 진행
                    {/if}
                </button>
            </form>
        {/if}
    </div>

    <div class="mb-4 mt-8 flex flex-col items-center gap-2 text-center">
        <div class="flex items-center gap-4">
            <form action="?/logout" method="POST" use:enhance>
                <button type="submit" class="text-xs text-gray-300 underline transition-colors hover:text-red-500">
                    로그아웃
                </button>
            </form>

            {#if user.role !== 'admin'}
                <button
                    onclick={() => (showAdminInput = !showAdminInput)}
                    class="cursor-default text-xs text-transparent transition-colors hover:text-gray-200"
                >
                    ?
                </button>
            {/if}
        </div>

        {#if showAdminInput}
            <form
                action="?/becomeAdmin"
                method="POST"
                use:enhance={submitAdmin}
                class="mt-2 flex gap-2"
                transition:fly={{ y: 10 }}
            >
                <input
                    type="password"
                    name="secretCode"
                    placeholder="Admin Code"
                    class="rounded-md bg-gray-100 px-3 py-1 text-xs outline-none"
                />
                <button type="submit" class="rounded-md bg-black px-3 py-1 text-xs font-bold text-white">
                    인증
                </button>
            </form>
        {/if}
    </div>

    {#if user.role === 'admin'}
        <div class="mb-8 mt-2 text-center">
            <span class="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600 shadow-sm">
                관리자 모드 활성화됨
            </span>
        </div>
    {/if}

    {#if toastMessage}
        <div
            class="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[#9e1b34]/95 px-5 py-3 text-sm font-bold text-white shadow-2xl backdrop-blur-sm"
            transition:fly={{ y: 20, duration: 300 }}
        >
            {toastMessage}
        </div>
    {/if}
</div>
