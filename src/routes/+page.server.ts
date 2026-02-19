// src/routes/+page.server.ts
import type { PageServerLoad } from './$types';
import { getCafeteriaMenu } from '$lib/server/scraper';

export const load: PageServerLoad = async ({ setHeaders }) => {
    // 🔥 캐싱 설정: 이 페이지의 데이터를 1시간(3600초) 동안 기억합니다.
    // Cloudflare가 알아서 기억해두고 유저들에게 바로 쏴주기 때문에 학교 서버가 안전해집니다!
    setHeaders({
        'Cache-Control': 'public, max-age=7200'
    });

    // 1. 기존 메인 카테고리 데이터
    const maincategory = [
        { name: '한식' }, { name: '중식' }, { name: '양식' },
        { name: '일식' }, { name: '아시안' }, { name: '분식' },
        { name: '치킨' }, { name: '피자' }, { name: '고기' },
        { name: '패스트푸드' }, { name: '커피' }, { name: '술집' },
        { name: '기타' }
    ];

    // 2. 학식 메뉴 데이터 가져오기
    let todayMenu = null;
    
    try {
        // 전체 주간 메뉴 긁어오기 (이제 1시간에 1번만 진짜로 긁어옵니다)
        const weeklyMenus = await getCafeteriaMenu();

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

        // 오늘 날짜에 해당하는 메뉴 찾기
        todayMenu = weeklyMenus.find(m => m.date === todayString) || null;

        console.log(`[크롤러 실행됨] 오늘 날짜: ${todayString}, 메뉴 찾음: ${todayMenu ? '성공' : '실패(또는 휴일)'}`);

    } catch (e) {
        console.error('학식 데이터 로드 실패:', e);
    }

    return {
        maincategory,
        todayMenu,
        restaurants: []
    };
};