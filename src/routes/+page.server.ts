// =========================================================
//  [src/routes/+page.server.ts]
//  KV 캐시 기반 유저 조회 + 만나볼텨? 필수정보 체크
// =========================================================
import type { PageServerLoad } from './$types';
import { getCafeteriaMenu } from '$lib/server/scraper';
import { getKVCache, setKVCache } from '$lib/server/cache';
import { getUserBySessionId, isMeetupProfileComplete } from '$lib/server/user';
import { hasPinnedVisibleNotices } from '$lib/data/notices';

export const load: PageServerLoad = async ({ cookies, platform, setHeaders }) => {
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
    const menuCacheKey = 'today_cafeteria_menu';
    const cachedMenu = await getKVCache<any>(platform, menuCacheKey);

    if (cachedMenu) {
        todayMenu = cachedMenu;
    } else {
        try {
            const menuResult = await getCafeteriaMenu();
            const now = new Date();
            const utc = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
            const krTimeDiff = 9 * 60 * 60 * 1000;
            const today = new Date(utc + krTimeDiff);

            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const todayString = `${yyyy}.${mm}.${dd}`;
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            const todayDay = days[today.getDay()];

            if (typeof menuResult === 'object' && menuResult !== null) {
                todayMenu = {
                    date: todayString,
                    day: todayDay,
                    student: menuResult.student,
                    faculty: menuResult.faculty
                };
                await setKVCache(platform, menuCacheKey, todayMenu, 7200);
            }
        } catch (e) {
            console.error('학식 파싱 오류:', e);
        }
    }

    let currentUser = null;
    let canUseMeetup = false;
    const sessionId = cookies.get('session_id');

    if (sessionId) {
        currentUser = await getUserBySessionId(platform, sessionId);

        if (currentUser) {
            canUseMeetup = isMeetupProfileComplete(currentUser);
        }
    }

    return {
        maincategory,
        todayMenu,
        restaurants: [],
        hasImportantNotice: hasPinnedVisibleNotices(),
        user: currentUser
            ? {
                  nickname: currentUser.nickname,
                  profileImg: currentUser.profileImg
              }
            : null,
        canUseMeetup,
        hasSession: !!sessionId
    };
};
