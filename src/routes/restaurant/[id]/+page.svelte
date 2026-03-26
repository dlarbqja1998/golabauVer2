<script>
	import { ChevronLeft, Star, MapPin, Phone, Lock, MessageCircle, ChevronDown, Heart, X, Loader2, ArrowUp } from 'lucide-svelte';
	import { getCategoryIconPath } from '$lib/data/categoryIcons.js';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { fly, fade } from 'svelte/transition'; 

	let { data } = $props();
	let restaurant = $derived(data.restaurant);
	let topKeywords = $derived(data.topKeywords || []);
	let user = $derived(data.user);
	
	// 🔥 좋아요, 댓글 수가 즉각적으로 변하도록 로컬 상태로 복사
	let localReviews = $state(data.reviews || []);

	let ratingScore = $state(data.myRating || 0);
	let selectedKeywords = $state(data.myKeywords || []);

	let visibleCount = $state(3);
	let visibleReviews = $derived(localReviews.slice(0, visibleCount));

	let toastMessage = $state('');
	let toastTimeout;
	
	function showToast(msg) {
		toastMessage = msg;
		if (toastTimeout) clearTimeout(toastTimeout);
		toastTimeout = setTimeout(() => {
			toastMessage = '';
		}, 2500); 
	}

	const keywordsList = [
		'음식이 맛있어요 😋', '가성비가 좋아요 💸', '양이 많아요 🥘', '친절해요 😊', '매장이 청결해요 ✨',
		'혼밥하기 좋아요! 🍱', '다신 안갈래요 😡' ,'혼술하기 좋아요!', '단체모임하기 좋아요'
	];

	function toggleKeyword(k) {
		if (selectedKeywords.includes(k)) {
			selectedKeywords = selectedKeywords.filter(item => item !== k);
		} else {
			selectedKeywords = [...selectedKeywords, k];
		}
	}

	function handleCall() {
		if (restaurant?.phone) window.location.href = `tel:${restaurant.phone}`;
	}

	onMount(() => {
		if (restaurant && window.kakao && window.kakao.maps) {
			const container = document.getElementById('map');
			if (container) {
				const options = {
					center: new window.kakao.maps.LatLng(restaurant.y, restaurant.x),
					level: 3 
				};
				const map = new window.kakao.maps.Map(container, options);
				
				const markerPosition = new window.kakao.maps.LatLng(restaurant.y, restaurant.x);
				const marker = new window.kakao.maps.Marker({ position: markerPosition });
				marker.setMap(map);

				if (restaurant.pathCoordinates && restaurant.pathCoordinates.length > 0) {
					const linePath = restaurant.pathCoordinates.map(
						(coord) => new window.kakao.maps.LatLng(coord[0], coord[1])
					);

					const polyline = new window.kakao.maps.Polyline({
						path: linePath,
						strokeWeight: 5,        
						strokeColor: '#FF3B30', 
						strokeOpacity: 0.8,     
						strokeStyle: 'solid'    
					});
					polyline.setMap(map); 

					const bounds = new window.kakao.maps.LatLngBounds();
					linePath.forEach(point => bounds.extend(point));
					
					setTimeout(() => {
						map.setBounds(bounds, 30, 30, 30, 30); 
						if (map.getLevel() < 4) {
							map.setLevel(4);
						}
					}, 150);
				}
			}
		}
	});

	function setRating(score) {
		ratingScore = score;
	}

	function getFirstImage(imgString) {
		if (!imgString) return null;
		const urls = imgString.split(',').map(s => s.trim()).filter(Boolean);
		return urls.length > 0 ? urls[0] : null;
	}

	function getWriteUrl() {
		if (!restaurant) return '#';
		const payload = JSON.stringify({
			id: restaurant.id,
			name: restaurant.placeName,
			returnTo: `/restaurant/${restaurant.id}`
		});
		const token = btoa(encodeURIComponent(payload));
		return `/golabassyu/write?token=${token}`;
	}

	// ==========================================
	// 🔥 새로 추가된 로직 (모달, 좋아요, 댓글, CCTV 트래킹)
	// ==========================================
	let selectedReview = $state(null);
	let isReviewModalOpen = $state(false);

	let isCommentOpen = $state(false);
	let comments = $state([]); 
	let commentInput = $state(''); 
	let isCommentsLoading = $state(false);

	function openReviewModal(review) {
		selectedReview = review;
		isReviewModalOpen = true;

		// 🔥 [CCTV 추가] 유저가 상세페이지에서 특정 리뷰를 눌러봤을 때 (CTR 측정용)
		if (typeof window !== 'undefined' && window.posthog) {
			window.posthog.capture('open_review_modal', {
				review_id: review.id,
				restaurant_id: restaurant.id,
				restaurant_name: restaurant.placeName,
				source: 'restaurant_detail'
			});
		}
	}

	function closeReviewModal() {
		isReviewModalOpen = false;
		selectedReview = null;
	}

	async function toggleLike(review) {
		if (!user) return showToast('로그인이 필요합니다 🔒');

		const originalLiked = review.isLiked;
		const originalCount = review.likes;

		review.isLiked = !review.isLiked;
		review.likes = review.isLiked ? (review.likes || 0) + 1 : (review.likes || 0) - 1;

		try {
			const res = await fetch('/api/like', {
				method: 'POST',
				body: JSON.stringify({ postId: review.id, isLiked: originalLiked })
			});
			if (!res.ok) throw new Error('서버 에러');

			// 🔥 [CCTV 추가] 모달에서 좋아요/취소 눌렀을 때
			if (typeof window !== 'undefined' && window.posthog) {
				window.posthog.capture(review.isLiked ? 'like_review' : 'unlike_review', {
					review_id: review.id,
					restaurant_name: restaurant.placeName,
					source: 'restaurant_detail'
				});
			}
		} catch (e) {
			review.isLiked = originalLiked;
			review.likes = originalCount;
			showToast('좋아요 처리 중 오류가 발생했습니다 🥲');
		}
	}

	async function openComments(postId) {
		if (typeof window !== 'undefined' && window.posthog) {
			window.posthog.capture('view_review_section', {
				restaurantId: restaurant.id,
				restaurantName: restaurant.placeName,
				source: 'restaurant_detail'
			});
		}
		isCommentOpen = true;
		isCommentsLoading = true;
		comments = []; 
		try {
			const res = await fetch(`/api/comment?postId=${postId}`);
			if (!res.ok) throw new Error('failed_to_load_comments');
			comments = await res.json();
		} catch (e) {
			showToast('댓글을 불러오지 못했습니다 🥲');
		} finally {
			isCommentsLoading = false;
		}
	}

	function closeComments() {
		isCommentOpen = false;
	}

	async function submitComment() {
		if (!user) return showToast('로그인이 필요합니다 🔒');
		if (!commentInput.trim()) return;

		const tempContent = commentInput;
		commentInput = '';

		try {
			const res = await fetch('/api/comment', {
				method: 'POST',
				body: JSON.stringify({ postId: selectedReview.id, content: tempContent })
			});
			
			if (res.ok) {
				const { comment } = await res.json();
				comments = [comment, ...comments];
				if (selectedReview) {
					selectedReview.commentCount = (selectedReview.commentCount || 0) + 1;
				}
				showToast('댓글이 등록되었습니다! 💬');

				// 🔥 [CCTV 추가] 모달에서 댓글을 작성했을 때
				if (typeof window !== 'undefined' && window.posthog) {
					window.posthog.capture('write_comment', {
						review_id: selectedReview.id,
						has_content: true,
						source: 'restaurant_detail'
					});
				}
			} else {
				throw new Error('failed_to_create_comment');
			}
		} catch (e) {
			showToast('댓글 등록에 실패했습니다 🥲');
			commentInput = tempContent;
		}
	}

	function getImages(imgString) {
		if (!imgString) return [];
		return imgString.split(',').map(s => s.trim()).filter(Boolean);
	}

</script>

<div class="flex flex-col w-full min-h-screen bg-white max-w-md mx-auto relative pb-32">
	{#if restaurant}
		<header class="absolute top-0 left-0 right-0 z-10 p-4 flex items-center">
			<a href="/list/{restaurant.mainCategory}" data-sveltekit-reload class="bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-sm text-gray-800 active:scale-90 transition-transform hover:bg-white">
				<ChevronLeft size={24} />
			</a>
		</header>

		<div class="w-full h-64 bg-red-50 flex items-center justify-center relative overflow-hidden group">
			<img src={getCategoryIconPath(restaurant.mainCategory)} alt={restaurant.placeName} class="w-40 h-40 object-contain opacity-50 blur-sm scale-150 transition-transform duration-700 group-hover:scale-125" />
			<div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
			
			<div class="absolute bottom-8 left-6 right-6 text-white">
				<div class="inline-block px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-bold mb-2 border border-white/30 shadow-sm">
					{restaurant.mainCategory}
				</div>
				<h1 class="text-3xl font-bold font-['Jua'] leading-tight drop-shadow-lg">
					{restaurant.placeName}
				</h1>
			</div>
		</div>

		<div class="px-6 -mt-6 bg-white rounded-t-3xl relative z-0 pt-8 flex flex-col gap-8 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
			
			<div class="flex flex-col gap-6">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Star class="fill-yellow-400 text-yellow-400" size={28} />
						<span class="text-3xl font-bold text-gray-900">{restaurant.rating ? Number(restaurant.rating).toFixed(1) : '0.0'}</span>
						<span class="text-gray-300 text-lg font-medium">/ 5.0</span>
					</div>
					<div class="text-right flex flex-col items-end gap-1">
						<div class="flex gap-1.5">
							<span class="text-[11px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold border border-purple-100">{restaurant.zone}</span>
							<span class="text-[11px] bg-red-50 text-[#8B0029] px-1.5 py-0.5 rounded font-bold border border-red-100">
								🚶‍♂️ 도보 약 {restaurant.walkTimeInMinutes ?? '?'}분
							</span>
						</div>
						<span class="text-[10px] text-gray-400 font-medium pr-1">신정문 기준 {restaurant.distanceInMeters ?? 0}m</span>
					</div>
				</div>

				<div class="flex flex-col gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm">
					<div class="flex items-start gap-3 text-gray-600">
						<MapPin size={20} class="mt-0.5 text-[#8B0029] flex-shrink-0" />
						<p class="font-medium text-sm text-gray-800 leading-relaxed">{restaurant.roadAddressName || '주소 정보 없음'}</p>
					</div>
					{#if restaurant.phone}
						<div class="w-full h-[1px] bg-gray-200/80"></div>
						<button onclick={handleCall} class="flex items-center gap-3 text-gray-600 w-full text-left active:opacity-70 transition-opacity group">
							<Phone size={20} class="text-green-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
							<span class="font-medium text-sm text-gray-800 group-hover:text-black">{restaurant.phone}</span>
						</button>
					{/if}
				</div>

				<div id="map" class="w-full h-48 rounded-2xl border border-gray-200 bg-gray-100 relative overflow-hidden shadow-inner">
					<div class="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">지도를 불러오는 중...</div>
				</div>

				<div class="flex gap-3">
					<a href="https://map.naver.com/v5/search/{encodeURIComponent(restaurant.placeName)}" target="_blank" class="flex-1 py-3.5 rounded-xl bg-[#03C75A] text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md shadow-green-100 hover:shadow-lg"><span class="text-sm">N 네이버 지도</span></a>
					<a href={restaurant.placeUrl || `https://map.kakao.com/link/map/${restaurant.placeName},${restaurant.y},${restaurant.x}`} target="_blank" class="flex-1 py-3.5 rounded-xl bg-[#FEE500] text-[#191919] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md shadow-yellow-100 hover:shadow-lg"><span class="text-sm">K 카카오 맵</span></a>
				</div>
			</div>

			<div class="h-2 bg-gray-50 -mx-6 border-t border-b border-gray-100"></div>

			<div>
				<h3 class="text-xl font-bold text-gray-900 mb-4 font-['Jua'] flex items-center gap-2">
					<span class="text-[#8B0029]">BEST</span> 매력 포인트
				</h3>
				{#if topKeywords.length > 0}
					<div class="flex flex-col gap-2.5">
						{#each topKeywords as k, i}
							<div class="flex items-center justify-between p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm">
								<div class="flex items-center gap-3">
									<span class="w-6 h-6 flex items-center justify-center {i < 3 ? 'bg-[#8B0029] text-white shadow-red-200' : 'bg-gray-200 text-gray-500'} rounded-full text-xs font-bold shadow-sm">{i+1}</span>
									<span class="text-gray-700 font-medium">{k.keyword}</span>
								</div>
								<span class="text-xs font-bold text-[#8B0029] bg-red-50 px-2 py-1 rounded-md border border-red-100">{k.count}명</span>
							</div>
						{/each}
					</div>
				{:else}
					<div class="py-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center gap-2">
						<span class="text-2xl">🧐</span>
						<p class="text-gray-500 text-sm font-medium">아직 등록된 키워드가 없어요</p>
					</div>
				{/if}
			</div>

			<div class="h-2 bg-gray-50 -mx-6 border-t border-b border-gray-100"></div>

			<div class="flex flex-col gap-8">
				<div>
					<h3 class="text-lg font-bold text-gray-900 mb-4 font-['Jua']">
						{data.myRating ? '내 별점 수정하기' : '이 식당 평가하기'}
					</h3>
					<form method="POST" action="?/submitRating" use:enhance={({ cancel }) => {
							if (ratingScore === 0) {
								showToast('⚠️ 별점을 1점 이상 선택해주세요!');
								cancel(); 
								return;
							}

							return async ({ update, result }) => { 
								await update({ reset: false }); 
								if (result.type === 'success') {
									showToast('별점이 반영되었습니다! ⭐'); 
								} else if (result.type === 'failure') {
									showToast(result.data?.message || '별점 등록에 실패했습니다 🥲');
								} else {
									showToast('별점 등록에 실패했습니다 🥲');
								}
							};
						}} class="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-center shadow-sm">
						
						<div class="flex justify-center gap-3 mb-6">
							{#each [1, 2, 3, 4, 5] as star}
								<button type="button" onclick={() => setRating(star)} class="transition-transform active:scale-75 hover:scale-110 focus:outline-none p-1">
									<Star size={36} class="{ratingScore >= star ? 'fill-yellow-400 text-yellow-400 drop-shadow-md' : 'text-gray-300'} transition-all duration-200" strokeWidth={ratingScore >= star ? 0 : 1.5} />
								</button>
							{/each}
						</div>
						<input type="hidden" name="rating" value={ratingScore} />

						{#if user}
							<button disabled={ratingScore === 0} class="w-full py-3.5 bg-red-50 text-[#8B0029] border border-red-100 rounded-xl font-bold disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all active:scale-[0.98] hover:bg-red-100 disabled:border-transparent">
								{data.myRating ? '별점 수정하기' : '별점 등록하기'}
							</button>
						{:else}
							<a href="/login" class="block w-full py-3.5 bg-black text-white rounded-xl font-bold text-center hover:bg-gray-800 transition-colors shadow-lg">🔒 로그인하고 별점 남기기</a>
						{/if}
					</form>
				</div>

				<div>
					<h3 class="text-lg font-bold text-gray-900 mb-4 font-['Jua']">
						 {data.myKeywords.length > 0 ? '내 키워드 수정하기' : '어떤 점이 좋았나요?'}
					</h3>
					<form method="POST" action="?/submitKeyword" use:enhance={() => {
							return async ({ update, result }) => { 
								await update(); 
								if (result.type === 'success') showToast('키워드 리뷰가 저장되었습니다! 👍'); 
								else showToast('리뷰 등록에 실패했습니다 🥲');
							};
						}}>
						<div class="flex flex-wrap gap-2 mb-6">
							{#each keywordsList as keyword}
								<button type="button" onclick={() => toggleKeyword(keyword)} class="px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 active:scale-95 leading-none {selectedKeywords.includes(keyword) ? 'bg-[#8B0029] text-white border-[#8B0029] shadow-md shadow-red-200 transform -translate-y-0.5' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}">
									{keyword}
								</button>
							{/each}
						</div>
						{#each selectedKeywords as k}
							<input type="hidden" name="keywords" value={k} />
						{/each}

						{#if user}
							<button class="w-full py-3.5 bg-red-50 text-[#8B0029] rounded-xl font-bold disabled:bg-gray-100 disabled:text-gray-400 transition-all active:scale-[0.98] border border-red-100 hover:bg-red-100 disabled:border-transparent">
								{data.myKeywords.length > 0 ? '수정 완료' : `키워드 리뷰 남기기 (${selectedKeywords.length}개)`}
							</button>
						{:else}
							<a href="/login" class="block w-full py-3.5 bg-red-50 text-[#8B0029] border border-red-100 rounded-xl font-bold text-center hover:bg-red-100 transition-colors">🔒 로그인하고 키워드 남기기</a>
						{/if}
					</form>
				</div>
			</div>

			<div class="h-2 bg-gray-50 -mx-6 border-t border-b border-gray-100"></div>

			<div class="pb-8">
				<div class="flex items-center justify-between mb-4">
					<h3 class="text-xl font-bold text-gray-900 font-['Jua'] flex items-center gap-2">
						💬 다녀왔슈 <span class="text-[#8B0029] text-sm font-sans">{localReviews.length}</span>
					</h3>
					
					{#if user}
						<a href={getWriteUrl()}
						class="text-xs font-bold text-white bg-[#8B0029] hover:bg-[#4a0909] transition-colors px-3 py-2 rounded-lg shadow-sm flex items-center gap-1 active:scale-95">
							✍️ 리뷰 쓰러가기
						</a>
					{:else}
						<a href="/login" 
						class="text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors px-3 py-2 rounded-lg shadow-sm flex items-center gap-1 active:scale-95">
							🔒 로그인 후 리뷰 쓰기
						</a>
					{/if}
				</div>

				{#if localReviews.length > 0}
					<div class="flex flex-col gap-3">
						{#each visibleReviews as review}
							{@const thumbnail = getFirstImage(review.imageUrl)}
							<button type="button" onclick={() => openReviewModal(review)} class="w-full text-left bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex gap-3 hover:shadow-md transition-shadow cursor-pointer">
								
								{#if thumbnail}
									<img src={thumbnail} alt="리뷰 썸네일" class="w-20 h-20 rounded-lg object-contain bg-gray-100 shrink-0 border border-gray-50" />
								{:else}
									<div class="w-20 h-20 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
										<MessageCircle size={24} class="text-gray-300" />
									</div>
								{/if}

								<div class="flex flex-col flex-1 overflow-hidden py-1">
									<div class="flex items-center gap-1 mb-1">
										<div class="flex">
											{#each [1, 2, 3, 4, 5] as star}
												<Star size={12} fill={star <= (review.rating || 0) ? "#FFD700" : "none"} color={star <= (review.rating || 0) ? "#FFD700" : "#E5E7EB"} />
											{/each}
										</div>
									</div>
									<p class="text-sm text-gray-800 font-medium leading-snug line-clamp-2 mt-0.5 whitespace-pre-wrap">
										{review.content}
									</p>
									<div class="flex items-center gap-3 mt-auto pt-2 text-xs text-gray-400 font-bold">
										<span class="flex items-center gap-1"><Heart size={12} fill={review.isLiked ? "currentColor" : "none"} class={review.isLiked ? "text-red-500" : "text-gray-400"} /> {review.likes || 0}</span>
										<span class="flex items-center gap-1"><MessageCircle size={12} class="text-gray-400" /> {review.commentCount || 0}</span>
									</div>
								</div>
							</button>
						{/each}
					</div>

					{#if visibleCount < localReviews.length}
						<button 
							onclick={() => visibleCount += 3} 
							class="w-full mt-4 py-3 flex items-center justify-center gap-1 bg-gray-50 text-gray-600 font-bold text-sm rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors active:scale-[0.98]"
						>
							더보기 ({visibleCount}/{localReviews.length}) <ChevronDown size={16} />
						</button>
					{/if}

				{:else}
					<div class="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center gap-2">
						<span class="text-3xl opacity-50">📝</span>
						<p class="text-gray-500 text-sm font-medium">아직 작성된 리뷰가 없어요.<br>첫 번째 리뷰어가 되어주세요!</p>
					</div>
				{/if}
			</div>

		</div>
	{/if}

	{#if isReviewModalOpen && selectedReview}
		{@const images = getImages(selectedReview.imageUrl)}
		
		<div class="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" transition:fade onclick={closeReviewModal}>
			<div class="bg-white w-full max-w-md max-h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl relative" 
				 onclick={(e) => e.stopPropagation()} 
				 transition:fly={{ y: 50, duration: 300 }}>
				 
				<button onclick={closeReviewModal} class="absolute top-3 right-3 p-2 bg-black/50 text-white rounded-full z-10 hover:bg-black/70 transition">
					<X size={20} />
				</button>

				<div class="overflow-y-auto w-full flex-1 no-scrollbar">
					{#if images.length > 0}
						<div class="w-full aspect-square bg-gray-100 relative snap-x snap-mandatory overflow-x-auto flex no-scrollbar">
							{#each images as img, i}
								<div class="w-full h-full shrink-0 snap-center relative">
									<img src={img} alt="food" class="w-full h-full object-contain" />
									{#if images.length > 1}
										<div class="absolute top-4 right-14 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-bold z-10">
											{i + 1} / {images.length}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					<div class="p-5 flex flex-col gap-3">
						<div class="flex justify-between items-center">
							<div class="flex gap-1">
								{#each [1, 2, 3, 4, 5] as star}
									<Star size={20} fill={star <= (selectedReview.rating || 0) ? "#FFD700" : "none"} color={star <= (selectedReview.rating || 0) ? "#FFD700" : "#E5E7EB"} />
								{/each}
							</div>
							
							{#if selectedReview.isMine || user?.role === 'admin'}
								<form method="POST" action="?/deletePost" use:enhance={() => {
									return async ({ result }) => {
										if (result.type === 'success') {
											const deletedId = selectedReview.id;
											closeReviewModal(); // 1. 모달 닫기
											localReviews = localReviews.filter(r => r.id !== deletedId); // 2. 화면에서 리뷰 즉시 날리기
											showToast('리뷰가 삭제되었습니다 🗑️'); // 3. 알림
										} else {
											showToast('삭제에 실패했습니다 🥲');
										}
									};
								}}>
									<input type="hidden" name="postId" value={selectedReview.id} />
									<button type="submit" class="text-xs text-red-500 font-bold hover:text-red-700 bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors active:scale-95">
										삭제
									</button>
								</form>
							{/if}
						</div>
						
						<p class="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words mt-1">
							{selectedReview.content}
						</p>
					</div>
				</div>

				<div class="p-4 border-t border-gray-100 flex items-center gap-6 bg-white shrink-0">
					<button onclick={() => toggleLike(selectedReview)} class="flex items-center gap-1.5 transition-colors {selectedReview.isLiked ? 'text-red-500' : 'text-gray-700 hover:text-red-500'}">
						<Heart size={26} fill={selectedReview.isLiked ? "currentColor" : "none"} class={selectedReview.isLiked ? 'text-red-500' : 'text-gray-400'} />
						<span class="text-sm font-bold mt-0.5">{selectedReview.likes || 0}</span>
					</button>

					<button onclick={() => openComments(selectedReview.id)} class="flex items-center gap-1.5 text-gray-700 hover:text-blue-500 transition-colors">
						<MessageCircle size={26} class="text-gray-400" />
						<span class="text-sm font-bold mt-0.5">{selectedReview.commentCount || 0}</span>
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if isCommentOpen}
		<div class="fixed inset-0 bg-black/50 transition-opacity z-[110]" onclick={closeComments} transition:fade></div>

		<div class="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col z-[120]" transition:fly={{ x: -300, duration: 300 }}>
			
			<div class="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
				<h2 class="font-bold font-['Jua'] text-lg">댓글</h2>
				<button onclick={closeComments} class="p-1 hover:bg-gray-100 rounded-full"><X size={24} /></button>
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
								
								{#if user && (user.id === comment.userId || user.role === 'admin')}
									<form method="POST" action="?/deleteComment" use:enhance={() => {
										return async ({ result }) => {
											if (result.type === 'success') {
												showToast('댓글이 삭제되었습니다 🗑️');
												// 삭제 후 댓글창 새로고침
												comments = comments.filter((item) => item.id !== comment.id);
												// 화면상 리뷰 카운트 -1 빼주기
												if (selectedReview) selectedReview.commentCount = Math.max(0, selectedReview.commentCount - 1);
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
				{#if user}
					<input type="text" bind:value={commentInput} onkeydown={(e) => e.key === 'Enter' && submitComment()} placeholder="댓글 달기..." class="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-3 text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors" />
					<button onclick={submitComment} class="bg-[#DC143C] text-white hover:bg-[#C01134] rounded-full w-10 h-10 flex items-center justify-center shrink-0 active:scale-90 transition-transform shadow-sm">
						<ArrowUp size={20} strokeWidth={2.5} />
					</button>
				{:else}
					<div class="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-3 text-sm text-gray-400 text-center cursor-pointer" onclick={() => showToast('로그인이 필요합니다 🔒')}>
						로그인 후 댓글을 남겨보세요.
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if toastMessage}
		<div class="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#9e1b34]/95 backdrop-blur-sm text-white px-5 py-3 rounded-full shadow-2xl text-sm font-bold z-[1000] flex items-center gap-2 whitespace-nowrap" 
			transition:fly={{ y: 20, duration: 300 }}>
			{toastMessage}
		</div>
	{/if}
</div>

<style>
	/* 이미지 가로 스크롤바 가리기용 */
	.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
