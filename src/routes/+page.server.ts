// =========================================================
//  [src/routes/+page.server.ts]
//  KV 캐시 기반 유저 조회 + 만나볼텨? 필수정보 체크
// =========================================================
import type { PageServerLoad } from './$types';
import { getCafeteriaMenu } from '$lib/server/scraper';
import { getKVCache, setKVCache } from '$lib/server/cache';
import { db } from '$lib/server/db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ cookies, platform, setHeaders }) => {
    // 🔥 1. 악성 좀비 캐시 멸종 (무조건 최신화)
    setHeaders({
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    });

    const maincategory = [
        { name: '한식' }, { name: '중식' }, { name: '양식' },
        { name: '일식' }, { name: '아시안' }, { name: '분식' },
        { name: '치킨' }, { name: '피자' }, { name: '고기' },
        { name: '패스트푸드' }, { name: '카페' }, { name: '술집' },
        { name: '기타' }
    ];

    let todayMenu = null;
    const MENU_CACHE_KEY = 'today_cafeteria_menu';
    
    // 🚀 KV 캐시에서 오늘 학식 메뉴 꺼내기
    const cachedMenu = await getKVCache<any>(platform, MENU_CACHE_KEY);

    if (cachedMenu) {
        // 캐시 히트: 무조건 KV 데이터를 사용 (학교 서버 안 찌름)
        todayMenu = cachedMenu;
    } else {
        // 캐시 미스: 학교 서버 크롤링 실행
        try {
            const menuResult = await getCafeteriaMenu();
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
            const KR_TIME_DIFF = 9 * 60 * 60 * 1000;
            const today = new Date(utc + KR_TIME_DIFF);

            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const todayString = `${yyyy}.${mm}.${dd}`;
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            const todayDay = days[today.getDay()];

            if (typeof menuResult === 'object' && menuResult !== null) {
                todayMenu = { date: todayString, day: todayDay, student: menuResult.student, faculty: menuResult.faculty };
                // 🔥 조회 성공 시 KV에 2시간(7200초) 단위로 저장
                await setKVCache(platform, MENU_CACHE_KEY, todayMenu, 7200);
            }
        } catch (e) {
            console.error('학식 파싱 에러:', e);
        }
    }

    // 🔥 2. KV 캐시 기반 유저 조회 (DB 직접 안 찌르고 KV에서 꺼냄!)
    let currentUser = null;
    let canUseMeetup = false;
    const sessionId = cookies.get('session_id');

    if (sessionId) {
        const KV_KEY = `user:${sessionId}`;

        // KV 캐시에서 먼저 조회
        currentUser = await getKVCache<any>(platform, KV_KEY);

        if (!currentUser) {
            // KV 미스 → DB 1회 조회 후 KV에 저장
            try {
                const userId = parseInt(sessionId);
                currentUser = await db.query.users.findFirst({
                    where: eq(users.id, userId)
                });

                if (currentUser) {
                    await setKVCache(platform, KV_KEY, currentUser, 3600);
                }
            } catch (e) {
                console.error('유저 조회 에러:', e);
            }
        }

        if (currentUser) {
            const hasMajor = !!(currentUser.college && currentUser.department);
            const hasContact = !!(currentUser.kakaoId || currentUser.instaId);

            // 필수 조건: 학년, 성별, 단대/학과, 연락처
            if (currentUser.grade && currentUser.gender && hasMajor && hasContact) {
                canUseMeetup = true;
            }
        }
    }

    return {
        maincategory,
        todayMenu,
        restaurants: [],
        // 🛡️ F12에 닉네임+프사만 노출! 민감 정보 절대 안 내려감!
        user: currentUser ? {
            nickname: currentUser.nickname,
            profileImg: currentUser.profileImg,
        } : null,
        canUseMeetup  // 🔥 서버에서 필수정보 체크 후 true/false만 내려줌
    };
};
