<script>
    import { enhance } from '$app/forms';
    let { data } = $props();
    const { user, myPosts } = data;
</script>

<div class="min-h-screen bg-gray-50 pb-24">
    <div class="bg-white p-6 mb-4 shadow-sm rounded-b-3xl">
        <h1 class="text-2xl font-bold mb-6">마이페이지</h1>
        
        <div class="flex items-center gap-4">
            {#if user.profileImg}
                <img src={user.profileImg} alt="프로필" class="w-16 h-16 rounded-full border border-gray-100 object-cover" />
            {:else}
                <div class="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <span class="text-2xl text-gray-400">?</span>
                </div>
            {/if}
            
            <div>
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-xl font-bold text-gray-900">{user.nickname}</span>
                    <span class="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                        {user.badge}
                    </span>
                </div>
                <p class="text-sm text-gray-500">카카오 로그인 중</p>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mt-6">
            <div class="bg-gray-50 p-4 rounded-2xl text-center">
                <span class="block text-gray-400 text-xs mb-1">활동 포인트</span>
                <span class="block text-xl font-bold text-red-500">{user.points} P</span>
            </div>
            <div class="bg-gray-50 p-4 rounded-2xl text-center">
                <span class="block text-gray-400 text-xs mb-1">작성한 글</span>
                <span class="block text-xl font-bold text-gray-800">{myPosts.length} 개</span>
            </div>
        </div>

        <div class="flex justify-end mt-4 mr-1">
            <form action="?/logout" method="POST" use:enhance>
                <button type="submit" class="text-xs text-gray-400 underline hover:text-red-500 transition-colors">
                    로그아웃
                </button>
            </form>
        </div>
    </div>

    <div class="px-5">
        <h2 class="text-lg font-bold mb-4 ml-1">내가 쓴 글</h2>
        
        {#if myPosts.length === 0}
            <div class="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <p>아직 작성한 글이 없어요 🥲</p>
                <a href="/golabassyu" class="inline-block mt-3 text-sm text-red-500 font-bold">글 쓰러 가기 &rarr;</a>
            </div>
        {:else}
            <div class="space-y-3">
                {#each myPosts as post}
                    <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div class="flex justify-between items-start mb-2">
                            <span class="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md font-medium">
                                {post.area}
                            </span>
                            <span class="text-xs text-gray-400">
                                {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <h3 class="font-bold text-gray-800 mb-1">{post.title}</h3>
                        <p class="text-sm text-gray-500 line-clamp-1">{post.content}</p>
                        <div class="mt-3 text-red-500 text-xs font-medium">
                            ❤️ {post.likes}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>