export type NoticeCategory = '업데이트' | '점검' | '이벤트' | '운영';

export type NoticeItem = {
	id: string;
	title: string;
	category: NoticeCategory;
	summary: string;
	content: string;
	publishedAt: string;
	isPinned: boolean;
	isVisible: boolean;
};

const notices: NoticeItem[] = [
	{
		id: '2026-03-20-meetup-policy',
		title: '[운영] 만나볼텨? 이용 안내 및 운영 기준',
		category: '운영',
		summary: '만나볼텨? 이용 기준과 함께 포인트샵 관련 기본 안내를 함께 공지합니다.',
		content:
			'안녕하세요. 골라바유입니다.\n\n만나볼텨?는 안전하고 부담 없는 연결 경험을 목표로 운영됩니다.\n\n1. 연락처는 매칭 완료 후에만 공개됩니다.\n2. 불쾌한 표현이나 무례한 태도는 제재 대상이 될 수 있습니다.\n3. 허위 정보 입력이나 반복적인 노쇼는 운영 정책에 따라 제한될 수 있습니다.\n4. 문제가 생기면 문의하기를 통해 바로 제보해 주시기 바랍니다.\n\n추가로 포인트샵 관련 안내도 함께 드립니다.\n\n5. 포인트샵에서 보유 포인트를 사용해 기능을 이용할 수 있습니다.\n6. 포인트 사용 조건과 차감 기준은 운영 상황에 따라 조정될 수 있습니다.\n7. 포인트 관련 이상 사항이 있으면 문의하기를 통해 알려주시기 바랍니다.\n\n이용 전에 기본 운영 기준과 포인트샵 안내를 한 번씩 확인해 주시기 바랍니다.',
		publishedAt: '2026-03-20',
		isPinned: true,
		isVisible: true
	},
	{
		id: '2026-03-23-feature-update',
		title: '[업데이트] 만나볼텨?, 돌림판, 공지사항 기능이 업데이트됐습니다',
		category: '업데이트',
		summary:
			'골라바유 안에서 만나볼텨?, 돌림판, 공지사항 기능을 중심으로 사용 흐름을 한 번 더 정리했습니다.',
		content:
			'안녕하세요. 골라바유입니다.\n\n이번 업데이트에서는 주요 기능 흐름을 더 보기 쉽게 정리했습니다.\n\n1. 공지사항 페이지가 새로 추가됐습니다.\n- 홈 우상단에서 공지사항 버튼을 바로 확인할 수 있습니다.\n- 중요한 공지는 느낌표 배지로 바로 표시됩니다.\n- 공지는 월별로 모아서 보고, 제목을 눌러 내용을 펼쳐볼 수 있습니다.\n\n2. 만나볼텨? 관련 흐름을 더 명확하게 다듬었습니다.\n- 밥약, 미팅, 과팅 관련 기능을 더 쉽게 확인할 수 있도록 정리했습니다.\n\n3. 돌림판 기능도 함께 정리했습니다.\n- 메뉴를 고를 때 더 직관적으로 사용할 수 있도록 흐름을 보완했습니다.\n\n4. 골라밧슈 리뷰 흐름도 함께 다듬고 있습니다.\n- 식당을 고르고, 다녀오고, 리뷰를 남기는 흐름이 더 자연스럽게 이어지도록 계속 보완할 예정입니다.\n\n앞으로도 골라바유 안에서 필요한 기능들을 하나씩 더 정리하겠습니다. 감사합니다.',
		publishedAt: '2026-03-23',
		isPinned: false,
		isVisible: true
	}
];

export function getVisibleNotices(): NoticeItem[] {
	return notices
		.filter((notice) => notice.isVisible)
		.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export function hasPinnedVisibleNotices(): boolean {
	return getVisibleNotices().some((notice) => notice.isPinned);
}
