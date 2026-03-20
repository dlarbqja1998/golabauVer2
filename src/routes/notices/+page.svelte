<script lang="ts">
	import { Bell, ChevronDown, ChevronLeft, Pin } from 'lucide-svelte';
	import type { NoticeItem } from '$lib/data/notices';

	let { data } = $props<{ data: { notices: NoticeItem[] } }>();

	type NoticeGroup = {
		key: string;
		label: string;
		notices: NoticeItem[];
	};

	const notices = data.notices;
	const pinnedNotices = notices.filter((notice) => notice.isPinned);
	const archiveNotices = notices.filter((notice) => !notice.isPinned);

	const groupedByMonth = archiveNotices.reduce<NoticeGroup[]>((groups, notice) => {
		const date = new Date(`${notice.publishedAt}T00:00:00+09:00`);
		const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		const label = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
		const existing = groups.find((group) => group.key === key);

		if (existing) {
			existing.notices.push(notice);
			return groups;
		}

		groups.push({ key, label, notices: [notice] });
		return groups;
	}, []);

	let openMonths = $state(new Set(groupedByMonth[0] ? [groupedByMonth[0].key] : []));
	let openNotices = $state(new Set<string>());

	function toggleMonth(key: string) {
		const next = new Set(openMonths);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		openMonths = next;
	}

	function toggleNotice(id: string) {
		const next = new Set(openNotices);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		openNotices = next;
	}

	function formatDate(dateString: string) {
		const date = new Date(`${dateString}T00:00:00+09:00`);
		return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(
			date.getDate()
		).padStart(2, '0')}`;
	}
</script>

<div class="min-h-screen bg-[#F8F9FA] pb-24">
	<div class="max-w-md mx-auto min-h-screen bg-white shadow-sm">
		<header class="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-4 flex items-center gap-3">
			<a href="/" class="p-2 -ml-2 rounded-full text-gray-700 hover:bg-gray-100 active:scale-95 transition-transform" aria-label="뒤로가기">
				<ChevronLeft size={24} />
			</a>
			<div class="flex items-center gap-2">
				<div class="w-10 h-10 rounded-2xl bg-red-50 text-[#8B0029] flex items-center justify-center">
					<Bell size={18} />
				</div>
				<div>
					<h1 class="text-xl font-['Jua'] text-gray-900">공지사항</h1>
					<p class="text-xs text-gray-400 font-medium">중요 공지와 월별 공지를 확인해 주세요</p>
				</div>
			</div>
		</header>

		<div class="px-4 py-5 flex flex-col gap-5">
			{#if pinnedNotices.length > 0}
				<section class="flex flex-col gap-3">
					<div class="flex items-center gap-2">
						<span class="text-xs font-bold px-2 py-1 rounded-full bg-[#8B0029] text-white">중요 공지</span>
						<p class="text-xs text-gray-400">여기에 넣은 공지는 홈에서 느낌표가 뜹니다.</p>
					</div>

					{#each pinnedNotices as notice (notice.id)}
						<div class="rounded-2xl border border-red-100 bg-red-50/50 overflow-hidden">
							<button type="button" onclick={() => toggleNotice(notice.id)} class="w-full px-4 py-4 text-left flex items-start gap-3">
								<div class="w-9 h-9 rounded-xl bg-white text-[#8B0029] flex items-center justify-center shrink-0 border border-red-100">
									<Pin size={16} />
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-1 flex-wrap">
										<span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-[#8B0029] border border-red-100">{notice.category}</span>
										<span class="text-[11px] text-gray-400 font-medium">{formatDate(notice.publishedAt)}</span>
									</div>
									<h2 class="text-sm font-bold text-gray-900 break-keep">{notice.title}</h2>
									<p class="text-xs text-gray-500 mt-1 break-keep">{notice.summary}</p>
								</div>
								<ChevronDown size={18} class={`mt-1 shrink-0 text-gray-400 transition-transform ${openNotices.has(notice.id) ? 'rotate-180' : ''}`} />
							</button>

							{#if openNotices.has(notice.id)}
								<div class="px-4 pb-4">
									<div class="ml-12 rounded-xl bg-white border border-red-100 px-4 py-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
										{notice.content}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</section>
			{/if}

			<section class="flex flex-col gap-3">
				<div class="flex items-center justify-between">
					<h2 class="text-base font-bold text-gray-900">월별 공지</h2>
					<span class="text-xs text-gray-400">월을 누르면 목록이 열립니다</span>
				</div>

				{#if groupedByMonth.length === 0}
					<div class="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
						<p class="text-sm font-medium text-gray-400">등록된 공지가 아직 없습니다.</p>
					</div>
				{:else}
					{#each groupedByMonth as monthGroup (monthGroup.key)}
						<div class="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
							<button type="button" onclick={() => toggleMonth(monthGroup.key)} class="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
								<div>
									<h3 class="text-sm font-bold text-gray-900">{monthGroup.label}</h3>
									<p class="text-xs text-gray-400 mt-1">{monthGroup.notices.length}개의 공지</p>
								</div>
								<ChevronDown size={18} class={`text-gray-400 transition-transform ${openMonths.has(monthGroup.key) ? 'rotate-180' : ''}`} />
							</button>

							{#if openMonths.has(monthGroup.key)}
								<div class="px-3 pb-3 flex flex-col gap-2 border-t border-gray-100 bg-gray-50/60">
									{#each monthGroup.notices as notice (notice.id)}
										<div class="rounded-xl bg-white border border-gray-100 overflow-hidden">
											<button type="button" onclick={() => toggleNotice(notice.id)} class="w-full px-4 py-4 text-left flex items-start gap-3">
												<div class="pt-0.5">
													<span class="text-[11px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-600">{notice.category}</span>
												</div>
												<div class="flex-1 min-w-0">
													<h4 class="text-sm font-bold text-gray-900 break-keep">{notice.title}</h4>
													<p class="text-xs text-gray-500 mt-1 break-keep">{notice.summary}</p>
													<p class="text-[11px] text-gray-400 mt-2">{formatDate(notice.publishedAt)}</p>
												</div>
												<ChevronDown size={18} class={`mt-1 shrink-0 text-gray-400 transition-transform ${openNotices.has(notice.id) ? 'rotate-180' : ''}`} />
											</button>

											{#if openNotices.has(notice.id)}
												<div class="px-4 pb-4">
													<div class="rounded-xl bg-gray-50 px-4 py-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
														{notice.content}
													</div>
												</div>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</section>
		</div>
	</div>
</div>
