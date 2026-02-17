<script>
    import { enhance } from '$app/forms';
    import { Settings, Save, Camera } from 'lucide-svelte';
    import { universityData } from '$lib/data/majors';

    let { data } = $props();
    let user = $derived(data.user);
    let myPosts = $derived(data.myPosts);

    // 상태 관리
    let isEditing = $state(false);
    let loading = $state(false);

    // 수정 모드용 선택 값
    let editCollege = $state('');
    
    // 선택된 단과대에 따라 학과 목록 자동 갱신
    let deptList = $derived(editCollege ? universityData[editCollege] : []);

    function startEditing() {
        editCollege = user.college || ''; 
        isEditing = true;
    }

    const submitProfile = () => {
        return async ({ update, result }) => {
            loading = true;
            await update();
            loading = false;
            if (result.type === 'success') {
                isEditing = false;
                alert('프로필이 수정되었습니다! 🎉');
            }
        };
    };
</script>

<div class="min-h-screen bg-gray-50 pb-24 max-w-md mx-auto">
    
    <div class="bg-white p-6 mb-4 shadow-sm rounded-b-3xl relative">
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-2xl font-bold font-['Jua']">마이페이지</h1>
            
            {#if !isEditing}
                <button onclick={startEditing} class="text-gray-400 hover:text-black transition-colors p-2 bg-gray-50 rounded-full">
                    <Settings size={20} />
                </button>
            {/if}
        </div>
        
        <div class="flex flex-col items-center text-center">
            <div class="relative w-20 h-20 mb-3">
                {#if user.profileImg}
                    <img src={user.profileImg} alt="프로필" class="w-full h-full rounded-full border-2 border-white shadow-md object-cover" />
                {:else}
                    <div class="w-full h-full rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 flex items-center justify-center border-2 border-white shadow-md">
                        <span class="text-3xl">🐶</span>
                    </div>
                {/if}
                {#if isEditing}
                    <div class="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white backdrop-blur-[1px]">
                        <Camera size={24} />
                    </div>
                {/if}
            </div>
            
            {#if isEditing}
                <form 
                    method="POST" 
                    action="?/updateProfile" 
                    use:enhance={submitProfile}
                    class="w-full flex flex-col gap-3 mt-2"
                >
                    <div>
                        <label class="text-xs text-gray-400 font-bold block text-left mb-1 ml-1">닉네임</label>
                        <input type="text" name="nickname" value={user.nickname} class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold focus:outline-none focus:border-black" />
                    </div>
                    
                    <div>
                        <label class="text-xs text-gray-400 font-bold block text-left mb-1 ml-1">학년</label>
                        <select name="grade" value={user.grade} class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-center font-medium focus:outline-none focus:border-black">
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
                            <label class="text-xs text-gray-400 font-bold block text-left mb-1 ml-1">단과대</label>
                            <select 
                                name="college" 
                                bind:value={editCollege} 
                                class="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-center font-medium focus:outline-none focus:border-black"
                            >
                                <option value="" disabled>선택</option>
                                {#each Object.keys(universityData) as collegeName}
                                    <option value={collegeName}>{collegeName}</option>
                                {/each}
                            </select>
                        </div>
                        <div class="flex-1">
                            <label class="text-xs text-gray-400 font-bold block text-left mb-1 ml-1">학과</label>
                            <select 
                                name="department" 
                                value={user.department} 
                                class="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-center font-medium focus:outline-none focus:border-black"
                            >
                                <option value="" disabled>선택</option>
                                {#each deptList as dept}
                                    <option value={dept}>{dept}</option>
                                {/each}
                            </select>
                        </div>
                    </div>

                    <div class="flex gap-2 mt-2 w-full">
                        <button type="button" onclick={() => isEditing = false} class="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm">취소</button>
                        <button type="submit" class="flex-1 py-3 bg-black text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                            <Save size={16} /> 저장
                        </button>
                    </div>
                </form>
            {:else}
                <div class="flex items-center gap-2 mb-1">
                    <h2 class="text-xl font-bold text-gray-900">{user.nickname}</h2>
                    <span class="px-2 py-0.5 bg-red-50 text-red-500 text-[10px] font-bold rounded-md border border-red-100">
                        {user.badge || '신입생'}
                    </span>
                </div>
                <p class="text-sm text-gray-400 mb-6">{user.college || '단과대 미입력'} | {user.department || '학과 미입력'}</p>

                <div class="grid grid-cols-2 gap-3 w-full">
                    <div class="bg-gray-50 p-4 rounded-2xl text-center">
                        <span class="block text-gray-400 text-xs mb-1">활동 포인트</span>
                        <span class="block text-xl font-bold text-red-500">{user.points || 0} P</span>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-2xl text-center">
                        <span class="block text-gray-400 text-xs mb-1">작성한 글</span>
                        <span class="block text-xl font-bold text-gray-800">{myPosts.length} 개</span>
                    </div>
                </div>
            {/if}
        </div>
    </div>

    <div class="px-5">
        <h2 class="text-lg font-bold mb-4 ml-1">내가 쓴 글</h2>
        
        {#if myPosts.length === 0}
            <div class="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100 border-dashed">
                <p>아직 작성한 글이 없어요 🥲</p>
                <a href="/golabassyu/write" class="inline-block mt-3 text-sm text-blue-500 font-bold underline">첫 글 쓰러 가기</a>
            </div>
        {:else}
            <div class="space-y-3">
                {#each myPosts as post}
                    <a href="/golabassyu?tab=my" class="block bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2 hover:border-gray-300 transition-colors active:scale-[0.98]">
                        <div class="flex justify-between items-start">
                            <span class="px-2 py-1 bg-gray-100 text-gray-500 text-[10px] rounded-md font-bold">
                                {post.area}
                            </span>
                            <span class="text-[10px] text-gray-300">
                                {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <h3 class="font-bold text-gray-800">{post.title}</h3>
                        <p class="text-sm text-gray-500 line-clamp-1">{post.content}</p>
                        <div class="mt-1 text-red-500 text-xs font-bold flex items-center gap-1">
                            ♥ {post.likes || 0}
                        </div>
                    </a>
                {/each}
            </div>
        {/if}
    </div>

    <div class="text-center mt-8 mb-4">
        <form action="?/logout" method="POST" use:enhance>
            <button type="submit" class="text-xs text-gray-300 underline hover:text-red-500 transition-colors">
                로그아웃
            </button>
        </form>
    </div>
</div>