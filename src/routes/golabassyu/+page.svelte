<script>
    import { ChevronLeft, Heart, MessageCircle, PenTool, MapPin, Star, X, ArrowUp, Loader2 } from 'lucide-svelte';
    import { fade, fly } from 'svelte/transition';

    // 서버 데이터
    let { data } = $props();

    // 로컬 상태
    let localPosts = $state(data.posts || []);

    // 탭 & 정렬
    const tabs = ['전체', '신정문앞', '욱일', '조치원역'];
    let activeTab = $state('전체'); 
    let activeSort = $state('latest'); 

    // 더보기 펼침 상태
    let expandedPosts = $state(new Set());
    function toggleExpand(id) {
        const newSet = new Set(expandedPosts);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        expandedPosts = newSet;
    }

    // [기능 1] 좋아요 토글
    async function toggleLike(post) {
        const originalLiked = post.isLiked;
        const originalCount = post.likes;

        post.isLiked = !post.isLiked;
        post.likes = post.isLiked ? (post.likes || 0) + 1 : (post.likes || 0) - 1;

        try {
            const res = await fetch('/api/like', {
                method: 'POST',
                body: JSON.stringify({ postId: post.id, isLiked: originalLiked })
            });
            if (!res.ok) throw new Error();
        } catch (e) {
            post.isLiked = originalLiked;
            post.likes = originalCount;
            alert('오류가 발생했습니다.');
        }
    }

    // [기능 2] 댓글 기능
    let isCommentOpen = $state(false);
    let currentPostId = $state(null);
    let comments = $state([]); 
    let commentInput = $state(''); 
    let isCommentsLoading = $state(false);

    // 댓글창 열기
    async function openComments(postId) {
        currentPostId = postId;
        isCommentOpen = true;
        isCommentsLoading = true;
        comments = []; 

        try {
            const res = await fetch(`/api/comment?postId=${postId}`);
            comments = await res.json();
        } catch (e) {
            alert('댓글 로딩 실패');
        } finally {
            isCommentsLoading = false;
        }
    }

    function closeComments() {
        isCommentOpen = false;
        currentPostId = null;
    }

    // 댓글 쓰기
    async function submitComment() {
        if (!commentInput.trim()) return;

        const tempContent = commentInput;
        commentInput = '';

        try {
            const res = await fetch('/api/comment', {
                method: 'POST',
                body: JSON.stringify({ postId: currentPostId, content: tempContent })
            });
            
            if (res.ok) {
                await openComments(currentPostId);
                const targetPost = localPosts.find(p => p.id === currentPostId);
                if (targetPost) {
                    targetPost.commentCount = (targetPost.commentCount || 0) + 1;
                }
            }
        } catch (e) {
            alert('댓글 등록 실패');
            commentInput = tempContent;
        }
    }

    // 필터링
    let filteredPosts = $derived.by(() => {
        let result = localPosts;
        if (activeTab !== '전체') result = result.filter(p => p.area === activeTab);
        
        if (activeSort === 'likes') return [...result].sort((a, b) => (b.likes || 0) - (a.likes || 0));
        return [...result].sort((a, b) => b.id - a.id);
    });

    function timeAgo(date) {
        if (!date) return '';
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return '방금 전';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}분 전`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}시간 전`;
        return `${Math.floor(hours / 24)}일 전`;
    }

    // [추가] 이미지 문자열을 배열로 변환하는 함수
    function getImages(imgString) {
        if (!imgString) return [];
        return imgString.split(',').map(s => s.trim()).filter(Boolean);
    }
</script>

<div class="flex flex-col w-full min-h-screen bg-gray-50 max-w-md mx-auto relative pb-24 overflow-x-hidden">
    
    <header class="bg-white sticky top-0 z-30 border-b border-gray-100">
        <div class="flex items-center justify-between p-4">
            <div class="flex items-center gap-1">
                <a href="/" class="p-2 -ml-2 text-gray-800"><ChevronLeft size={24} /></a>
                <h1 class="text-xl font-bold font-['Jua']">골라바쓔</h1>
            </div>
            <div class="flex gap-2 text-xs font-bold text-gray-400">
                <button onclick={() => activeSort = 'latest'} class={activeSort === 'latest' ? 'text-gray-900' : 'hover:text-gray-600'}>최신순</button>
                <span>·</span>
                <button onclick={() => activeSort = 'likes'} class={activeSort === 'likes' ? 'text-gray-900' : 'hover:text-gray-600'}>인기순</button>
            </div>
        </div>
        <div class="flex px-4 gap-4 overflow-x-auto no-scrollbar pb-3">
            {#each tabs as tab}
                <button onclick={() => activeTab = tab} class="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all {activeTab === tab ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-100 text-gray-500'}">{tab}</button>
            {/each}
        </div>
    </header>

    <main class="flex flex-col gap-4 py-4">
        {#if filteredPosts.length === 0}
            <div class="py-20 text-center text-gray-400 text-sm">
                <p>아직 올라온 맛집 후기가 없어요 😢</p>
            </div>
        {:else}
            {#each filteredPosts as post (post.id)}
                {@const images = getImages(post.imageUrl)}
                
                <article class="bg-white flex flex-col shadow-sm border-y border-gray-100 md:border md:rounded-2xl md:mx-4" transition:fade>
                    
                    <div class="flex items-center justify-between p-3">
                        <div class="flex items-center gap-2">
                            <div class="flex flex-col">
                                <div class="flex items-center gap-1.5">
                                    <span class="text-sm font-bold text-gray-900">{post.writerName || '익명'}</span>
                                    <span class="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-bold">{post.writerBadge || '신입생'}</span>
                                </div>
                                <span class="text-[10px] text-gray-400">{timeAgo(post.createdAt)}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1 text-gray-700 bg-gray-50 px-2 py-1 rounded-lg">
                            <MapPin size={12} />
                            <span class="text-xs font-bold">{post.restaurant}</span>
                        </div>
                    </div>

                    {#if images.length > 0}
                        <div class="w-full aspect-square bg-gray-100 relative group">
                            <div class="flex overflow-x-auto w-full h-full snap-x snap-mandatory no-scrollbar">
                                {#each images as img, i}
                                    <div class="w-full h-full shrink-0 snap-center relative">
                                        <img src={img} alt="food" class="w-full h-full object-cover" />
                                        
                                        {#if images.length > 1}
                                            <div class="absolute top-3 right-3 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                                {i + 1} / {images.length}
                                            </div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {:else}
                        <div class="w-full aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-6 text-center">
                            <span class="text-gray-300 font-['Jua'] text-lg mb-2">사진 없는 찐후기</span>
                        </div>
                    {/if}

                    <div class="p-3 pb-2 flex items-center relative">
                        <div class="flex gap-0.5 absolute left-3">
                            {#each [1, 2, 3, 4, 5] as star}
                                <Star size={18} fill={star <= (post.rating || 0) ? "#FFD700" : "none"} color={star <= (post.rating || 0) ? "#FFD700" : "#E5E7EB"} />
                            {/each}
                        </div>
                        
                        <div class="flex items-center gap-6 mx-auto">
                            <button onclick={() => toggleLike(post)} class="flex items-center gap-1.5 transition-colors {post.isLiked ? 'text-red-500' : 'text-gray-700 hover:text-red-500'}">
                                <Heart size={26} fill={post.isLiked ? "currentColor" : "none"} />
                                <span class="text-sm font-bold mt-0.5">{post.likes || 0}</span>
                            </button>

                            <button onclick={() => openComments(post.id)} class="flex items-center gap-1.5 text-gray-700 hover:text-blue-500 transition-colors">
                                <MessageCircle size={26} />
                                <span class="text-sm font-bold mt-0.5">{post.commentCount || 0}</span>
                            </button>
                        </div>
                    </div>

                    <div class="px-3 pb-4">
                        {#if expandedPosts.has(post.id)}
                            <button onclick={() => toggleExpand(post.id)} class="text-sm text-gray-800 leading-relaxed text-left w-full whitespace-pre-wrap">
                                {post.content}
                                <span class="text-xs text-gray-300 font-bold ml-1 cursor-pointer">(접기)</span>
                            </button>
                        {:else}
                            <div class="flex items-center w-full cursor-pointer" onclick={() => toggleExpand(post.id)}>
                                <p class="text-sm text-gray-800 leading-relaxed truncate flex-1">
                                    {post.content}
                                </p>
                                {#if post.content.length > 1}
                                    <button onclick={(e) => { e.stopPropagation(); toggleExpand(post.id); }} class="text-xs text-gray-400 font-bold ml-1 shrink-0 hover:text-gray-600">
                                        ... 더보기
                                    </button>
                                {/if}
                            </div>
                        {/if}
                    </div>

                </article>
            {/each}
        {/if}
    </main>

    <a href="/golabassyu/write" 
       class="fixed bottom-24 right-5 w-14 h-14 bg-[#DC143C] rounded-full shadow-xl flex items-center justify-center text-white hover:bg-[#C01134] transition-colors z-40 active:scale-95">
        <PenTool size={24} />
    </a>

    {#if isCommentOpen}
        <div class="fixed inset-0 bg-black/50 transition-opacity" 
             style="z-index: 9990;" 
             onclick={closeComments} 
             transition:fade>
        </div>

        <div class="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col"
             style="z-index: 9999;"
             transition:fly={{ x: -300, duration: 300 }}>
            
            <div class="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
                <h2 class="font-bold font-['Jua'] text-lg">댓글</h2>
                <button onclick={closeComments} class="p-1 hover:bg-gray-100 rounded-full">
                    <X size={24} />
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {#if isCommentsLoading}
                    <div class="flex justify-center py-10"><Loader2 class="animate-spin text-gray-300" /></div>
                {:else if comments.length === 0}
                    <div class="flex flex-col items-center justify-center py-10 text-gray-400">
                        <MessageCircle size={48} class="mb-2 opacity-20" />
                        <p class="text-sm">아직 댓글이 없어요.</p>
                    </div>
                {:else}
                    {#each comments as comment}
                        <div class="flex gap-3">
                            <div class="w-8 h-8 rounded-full bg-gray-100 shrink-0"></div>
                            <div class="flex flex-col">
                                <div class="flex items-center gap-1.5 mb-0.5">
                                    <span class="text-sm font-bold text-gray-900">{comment.writerName || '익명'}</span>
                                    <span class="text-[10px] text-gray-400">{timeAgo(comment.createdAt)}</span>
                                </div>
                                <p class="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>

            <div class="p-3 border-t border-gray-100 bg-white flex gap-2 shrink-0 pb-6">
                <input 
                    type="text" 
                    bind:value={commentInput}
                    onkeydown={(e) => e.key === 'Enter' && submitComment()}
                    placeholder="댓글 달기..." 
                    class="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors" 
                />
                <button 
                    onclick={submitComment}
                    class="bg-[#DC143C] text-white hover:bg-[#C01134] rounded-full w-10 h-10 flex items-center justify-center shrink-0 active:scale-90 transition-transform shadow-sm">
                    <ArrowUp size={20} strokeWidth={2.5} />
                </button>
            </div>
        </div>
    {/if}

</div>

<style>
    .no-scrollbar::-webkit-scrollbar { display: none; }
</style>