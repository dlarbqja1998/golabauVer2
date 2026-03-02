<script>
    import { ChevronLeft, Heart, MessageCircle, PenTool, MapPin, Star, X, ArrowUp, Loader2, MoreVertical, Trash2, Edit2 } from 'lucide-svelte';
    import { fade, fly } from 'svelte/transition';
    import { enhance } from '$app/forms';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';

    // 서버 데이터
    let { data } = $props();

    // 로컬 상태
    let localPosts = $state(data.posts || []);
    let currentUser = $derived(data.user);

    // 탭 & 정렬
    const tabs = ['전체', '내 글', '욱일', '고대앞', '홍대사이', '조치원역', '기타']; 
    let activeTab = $state('전체'); 
    let activeSort = $state('latest'); 

    // 토스트 알림 상태 관리
    let toastMessage = $state('');
    let toastTimeout;
    
    function showToast(msg) {
        toastMessage = msg;
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastMessage = '';
        }, 2500);
    }

    onMount(() => {
        const tabParam = $page.url.searchParams.get('tab');
        if (tabParam === 'my') {
            activeTab = '내 글';
        }
    });

    let expandedPosts = $state(new Set());
    function toggleExpand(id) {
        const newSet = new Set(expandedPosts);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        expandedPosts = newSet;
    }

    async function toggleLike(post) {
        if (!currentUser) {
            showToast('로그인이 필요합니다 🔒');
            return;
        }

        const originalLiked = post.isLiked;
        const originalCount = post.likes;

        post.isLiked = !post.isLiked;
        post.likes = post.isLiked ? (post.likes || 0) + 1 : (post.likes || 0) - 1;

        try {
            const res = await fetch('/api/like', {
                method: 'POST',
                body: JSON.stringify({ postId: post.id, isLiked: originalLiked })
            });
            
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error); 
            }

            //posthog
            if (typeof window !== 'undefined' && window.posthog) {
                window.posthog.capture(post.isLiked ? 'like_review' : 'unlike_review', {
                    review_id: post.id,
                    restaurant_name: post.restaurant
                });
            }
        } catch (e) {
            post.isLiked = originalLiked;
            post.likes = originalCount;
            showToast(e.message || '좋아요 처리 중 오류가 발생했습니다 🥲');
        }
    }

    let isCommentOpen = $state(false);
    let currentPostId = $state(null);
    let comments = $state([]); 
    let commentInput = $state(''); 
    let isCommentsLoading = $state(false);

    async function openComments(postId) {
        currentPostId = postId;
        isCommentOpen = true;
        isCommentsLoading = true;
        comments = []; 

        try {
            const res = await fetch(`/api/comment?postId=${postId}`);
            comments = await res.json();
        } catch (e) {
            showToast('댓글을 불러오지 못했습니다 🥲');
        } finally {
            isCommentsLoading = false;
        }
    }

    function closeComments() {
        isCommentOpen = false;
        currentPostId = null;
    }

    async function submitComment() {
        if (!currentUser) {
            showToast('로그인이 필요합니다 🔒');
            return;
        }

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
                showToast('댓글이 등록되었습니다! 💬');

                //posthog
                if (typeof window !== 'undefined' && window.posthog) {
                    window.posthog.capture('write_comment', {
                        review_id: currentPostId,
                        has_content: true
                    });
                }
            }
        } catch (e) {
            showToast('댓글 등록에 실패했습니다 🥲');
            commentInput = tempContent;
        }
    }

    let activeMenuId = $state(null);
    function toggleMenu(id) {
        if (activeMenuId === id) activeMenuId = null;
        else activeMenuId = id;
    }

    let isEditModalOpen = $state(false);
    let editPostId = $state(null);
    let editContent = $state('');
    let editRating = $state(0);

    function openEditModal(post) {
        editPostId = post.id;
        editContent = post.content;
        editRating = post.rating || 0; 
        isEditModalOpen = true;
        activeMenuId = null; 
    }

    let filteredPosts = $derived.by(() => {
        let result = localPosts;
        
        if (activeTab === '내 글') {
            if (!currentUser) result = [];
            else result = result.filter(p => p.isMine);
        } else if (activeTab !== '전체') {
            result = result.filter(p => p.area === activeTab);
        }
        
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

    function getImages(imgString) {
        if (!imgString) return [];
        return imgString.split(',').map(s => s.trim()).filter(Boolean);
    }
</script>

<div class="flex flex-col w-full min-h-screen bg-gray-50 max-w-md mx-auto relative pb-24 overflow-x-hidden">
    
    <header class="bg-white sticky top-0 z-30 border-b border-gray-100 shadow-sm">
        <div class="flex items-center justify-between p-4 pb-2">
            <div class="flex items-center gap-1">
                <a href="/" class="p-2 -ml-2 text-gray-800"><ChevronLeft size={24} /></a>
                <h1 class="text-xl font-bold font-['Jua']">골라밧슈</h1>
            </div>
            <div class="flex gap-2 text-xs font-bold text-gray-400">
                <button onclick={() => activeSort = 'latest'} class={activeSort === 'latest' ? 'text-gray-900' : 'hover:text-gray-600'}>최신순</button>
                <span>·</span>
                <button onclick={() => activeSort = 'likes'} class={activeSort === 'likes' ? 'text-gray-900' : 'hover:text-gray-600'}>인기순</button>
            </div>
        </div>
        
        <div class="flex px-4 gap-3 overflow-x-auto no-scrollbar pb-3">
            {#each tabs as tab}
                <button onclick={() => activeTab = tab} class="shrink-0 px-3 py-1.5 rounded-full text-[13px] font-bold transition-all border {activeTab === tab ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}">
                    {#if tab === '내 글'}
                        🔒 {tab}
                    {:else}
                        {tab}
                    {/if}
                </button>
            {/each}
        </div>
    </header>

    <main class="flex flex-col gap-4 py-4" onclick={() => activeMenuId = null}>
        {#if filteredPosts.length === 0}
            <div class="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
                <span class="text-4xl">🥲</span>
                {#if activeTab === '내 글' && !currentUser}
                    <p class="font-medium text-sm">로그인이 필요합니다!</p>
                {:else}
                    <p class="font-medium text-sm">해당 구역에는 게시글이 없어요!</p>
                {/if}
            </div>
        {:else}
            {#each filteredPosts as post (post.id)}
                {@const images = getImages(post.imageUrl)}
                
                <article class="bg-white flex flex-col shadow-sm border-y border-gray-100 md:border md:rounded-2xl md:mx-4 relative" transition:fade>
                    
                    <div class="flex items-center justify-between p-3">
                        <div class="flex items-center gap-2">
                            <div class="flex flex-col">
                                <div class="flex items-center gap-1.5 mb-1">
                                    <span class="text-sm font-bold text-gray-900">{post.writerName || '익명'}</span>
                                    
                                    {#if post.isMine}
                                        <span class="text-[9px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded font-bold">ME</span>
                                    {/if}
                                </div>
                                <span class="text-[10px] text-gray-400 font-medium">{timeAgo(post.createdAt)}</span>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-2">
                            {#if post.area && post.area !== '전체'}
                                <span class="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold border border-purple-100 shrink-0">
                                    {post.area}
                                </span>
                            {/if}

                            {#if post.restaurantId}
                                <a href="/restaurant/{post.restaurantId}" class="flex items-center gap-1 text-gray-700 bg-gray-50 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors active:scale-95 group max-w-[120px]">
                                    <MapPin size={12} class="text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
                                    <span class="text-xs font-bold text-gray-700 group-hover:text-blue-600 group-hover:underline decoration-blue-200 underline-offset-2 transition-colors truncate">{post.restaurant}</span>
                                </a>
                            {:else}
                                <div class="flex items-center gap-1 text-gray-700 bg-gray-50 px-2 py-1 rounded-lg max-w-[120px]">
                                    <MapPin size={12} class="text-gray-400 shrink-0" />
                                    <span class="text-xs font-bold truncate">{post.restaurant}</span>
                                </div>
                            {/if}

                            {#if post.isMine || currentUser?.role === 'admin'}
                                <div class="relative">
                                    <button onclick={(e) => { e.stopPropagation(); toggleMenu(post.id); }} class="p-1 text-gray-400 hover:text-black transition-colors rounded-full hover:bg-gray-100">
                                        <MoreVertical size={16} />
                                    </button>
                                    
                                    {#if activeMenuId === post.id}
                                        <div class="absolute right-0 top-8 bg-white shadow-xl border border-gray-100 rounded-lg overflow-hidden w-28 z-20 flex flex-col" transition:fade={{duration: 100}}>
                                            
                                            {#if post.isMine}
                                                <button onclick={() => openEditModal(post)} class="px-3 py-2.5 text-xs text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                                                    <Edit2 size={14} /> 수정하기
                                                </button>
                                            {/if}
                                            
                                            <form action="?/deletePost" method="POST" use:enhance={() => {
                                                return async ({ result }) => {
                                                    if (result.type === 'success') {
                                                        activeMenuId = null; 
                                                        localPosts = localPosts.filter(p => p.id !== post.id);
                                                        showToast('게시글이 삭제되었습니다 🗑️');
                                                    } else {
                                                        showToast('삭제에 실패했습니다 🥲');
                                                    }
                                                };
                                            }}>
                                                <input type="hidden" name="postId" value={post.id}>
                                                <button class="w-full px-3 py-2.5 text-xs text-left text-red-500 hover:bg-red-50 flex items-center gap-2">
                                                    <Trash2 size={14} /> 삭제하기
                                                </button>
                                            </form>
                                        </div>
                                    {/if}
                                </div>
                            {/if}
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
                            <button onclick={() => toggleExpand(post.id)} class="text-sm text-gray-800 leading-relaxed text-left w-full whitespace-pre-wrap break-words">
                                {post.content}
                                <span class="text-xs text-gray-300 font-bold ml-1 cursor-pointer">(접기)</span>
                            </button>
                        {:else}
                            <div class="flex items-end w-full cursor-pointer" onclick={() => toggleExpand(post.id)}>
                                <p class="text-sm text-gray-800 leading-relaxed line-clamp-2 whitespace-pre-wrap break-words flex-1">
                                    {post.content}
                                </p>
                                {#if post.content.length > 10 || post.content.includes('\n')}
                                    <button onclick={(e) => { e.stopPropagation(); toggleExpand(post.id); }} class="text-xs text-gray-400 font-bold ml-1 shrink-0 hover:text-gray-600 mb-0.5">
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

    {#if isEditModalOpen}
        <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl" transition:fly={{ y: 20 }}>
                <h3 class="font-bold text-lg mb-4 text-gray-900">게시글 수정</h3>
                
                <form action="?/updatePost" method="POST" use:enhance={() => {
                    return async ({ result }) => {
                        if (result.type === 'success') {
                            isEditModalOpen = false;
                            const p = localPosts.find(x => x.id === editPostId);
                            if(p) {
                                p.content = editContent;
                                p.rating = editRating; 
                            }
                            showToast('게시글이 수정되었습니다! ✨');
                        } else {
                            showToast('수정에 실패했습니다 🥲');
                        }
                    };
                }}>
                    <input type="hidden" name="postId" value={editPostId}>
                    
                    <div class="flex flex-col gap-2 mb-4">
                        <label class="text-xs font-bold text-gray-500 ml-1">별점 수정</label>
                        <div class="flex gap-1">
                            {#each [1, 2, 3, 4, 5] as star}
                                <button 
                                    type="button" 
                                    onclick={() => editRating = star}
                                    class="p-1 transition-transform active:scale-90"
                                >
                                    <Star 
                                        size={28} 
                                        fill={star <= editRating ? "#FFD700" : "none"} 
                                        color={star <= editRating ? "#FFD700" : "#E5E7EB"} 
                                        strokeWidth={2}
                                    />
                                </button>
                            {/each}
                        </div>
                        <input type="hidden" name="rating" value={editRating}>
                    </div>

                    <textarea 
                        name="content" 
                        bind:value={editContent}
                        class="w-full h-32 p-3 bg-gray-50 border border-gray-200 rounded-xl resize-none text-sm outline-none focus:border-black mb-4 focus:bg-white transition-colors"
                        placeholder="수정할 내용을 입력하세요..."
                    ></textarea>
                    
                    <div class="flex gap-2">
                        <button type="button" onclick={() => isEditModalOpen = false} class="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-200">취소</button>
                        <button class="flex-1 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800">수정 완료</button>
                    </div>
                </form>
            </div>
        </div>
    {/if}

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

            <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {#if isCommentsLoading}
                    <div class="flex justify-center py-10"><Loader2 class="animate-spin text-gray-300" /></div>
                {:else if comments.length === 0}
                    <div class="flex flex-col items-center justify-center py-10 text-gray-400">
                        <MessageCircle size={48} class="mb-2 opacity-20" />
                        <p class="text-sm">아직 댓글이 없어요.</p>
                    </div>
                {:else}
                    {#each comments as comment}
                        <div class="flex flex-col gap-1 mb-2 p-2.5 bg-gray-50 rounded-lg relative">
                            <div class="flex justify-between items-start gap-2">
                                <div class="flex flex-col flex-1">
                                    <span class="text-[10px] text-gray-400 font-bold mb-0.5">{comment.writerName || '익명'}</span>
                                    <p class="text-sm text-gray-800 leading-snug break-all">{comment.content}</p>
                                </div>
                                
                                {#if currentUser && (currentUser.id === comment.userId || currentUser.role === 'admin')}
                                    <form method="POST" action="?/deleteComment" use:enhance={() => {
                                        return async ({ result }) => {
                                            if (result.type === 'success') {
                                                showToast('댓글이 삭제되었습니다 🗑️');
                                                await openComments(currentPostId);
                                                const targetPost = localPosts.find(p => p.id === currentPostId);
                                                if (targetPost) targetPost.commentCount = Math.max(0, targetPost.commentCount - 1);
                                            } else {
                                                showToast('삭제 권한이 없습니다 🥲');
                                            }
                                        };
                                    }}>
                                        <input type="hidden" name="commentId" value={comment.id} />
                                        <button type="submit" class="text-[11px] text-red-400 font-bold hover:text-red-600 transition-colors shrink-0 mt-1">
                                            삭제
                                        </button>
                                    </form>
                                {/if}
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>

            <div class="p-3 border-t border-gray-100 bg-white flex gap-2 shrink-0 pb-6">
                {#if currentUser}
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
                {:else}
                    <div 
                        class="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-3 text-sm text-gray-400 text-center cursor-pointer"
                        onclick={() => showToast('로그인이 필요합니다 🔒')}
                    >
                        로그인 후 댓글을 남겨보세요.
                    </div>
                {/if}
            </div>
        </div>
    {/if}

    {#if toastMessage}
        <div class="fixed top-20 left-1/2 -translate-x-1/2 bg-[#9e1b34]/95 backdrop-blur-sm text-white px-5 py-3 rounded-full shadow-2xl text-sm font-bold z-[10000] flex items-center gap-2 whitespace-nowrap" 
             transition:fly={{ y: 20, duration: 300 }}>
            {toastMessage}
        </div>
    {/if}

</div>

<style>
    .no-scrollbar::-webkit-scrollbar { display: none; }
</style>