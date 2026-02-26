// src/routes/+page.server.ts
import type { PageServerLoad } from './$types';
import { getCafeteriaMenu } from '$lib/server/scraper';

export const load: PageServerLoad = async ({ setHeaders }) => {
    // 🔥 캐싱 설정: 이 페이지의 데이터를 2시간 동안 기억합니다.
    setHeaders({
        'Cache-Control': 'public, max-age=7200'
    });

    // 1. 기존 메인 카테고리 데이터
    const maincategory = [
        { name: '한식' }, { name: '중식' }, { name: '양식' },
        { name: '일식' }, { name: '아시안' }, { name: '분식' },
        { name: '치킨' }, { name: '피자' }, { name: '고기' },
        { name: '패스트푸드' }, { name: '카페' }, { name: '술집' },
        { name: '기타' }
    ];

    // 2. 학식 메뉴 데이터 가져오기
    let todayMenu = null;
    
    try {
        const menuResult = await getCafeteriaMenu();

        // "오늘" 날짜 구하기 (한국 시간 기준)
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
        const KR_TIME_DIFF = 9 * 60 * 60 * 1000;
        const today = new Date(utc + KR_TIME_DIFF);
        
        // 날짜 포맷 맞추기 (YYYY.MM.DD)
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayString = `${yyyy}.${mm}.${dd}`;

        // 요일 구하기
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const todayDay = days[today.getDay()];

        // scraper.ts가 정상적으로 객체를 반환했을 경우 프론트엔드가 요구하는 형식에 맞춤
        if (typeof menuResult === 'object' && menuResult !== null) {
            todayMenu = {
                date: todayString,
                day: todayDay,
                student: menuResult.student,
                faculty: menuResult.faculty
            };
            console.log(`[크롤러] ${todayString} 학식 파싱 성공! (한식: ${todayMenu.student.korean.length}개)`);
        } else {
            // 휴일이거나 메뉴가 없는 경우
            console.log(`[크롤러] ${todayString} 학식 상태: ${menuResult}`);
        }

    } catch (e) {
        console.error('학식 데이터 로드 실패:', e);
    }

    return {
        maincategory,
        todayMenu,
        restaurants: []
    };
};