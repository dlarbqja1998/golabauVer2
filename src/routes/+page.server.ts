import type { PageServerLoad } from './$types';
import { getUserBySessionId, isMeetupProfileComplete } from '$lib/server/user';
import { hasPinnedVisibleNotices } from '$lib/data/notices';
import { getCachedTodayMenu } from '$lib/server/menu-cache';

export const load: PageServerLoad = async ({ cookies, locals, platform, setHeaders }) => {
    setHeaders({
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    });

    const maincategory = [
        { name: '\uD55C\uC2DD' }, { name: '\uC911\uC2DD' }, { name: '\uC591\uC2DD' },
        { name: '\uC77C\uC2DD' }, { name: '\uC544\uC2DC\uC548' }, { name: '\uBD84\uC2DD' },
        { name: '\uCE58\uD0A8' }, { name: '\uD53C\uC790' }, { name: '\uACE0\uAE30' },
        { name: '\uD328\uC2A4\uD2B8\uD478\uB4DC' }, { name: '\uCE74\uD398' }, { name: '\uC220\uC9D1' },
        { name: '\uAE30\uD0C0' }
    ];

    const todayMenu = await getCachedTodayMenu(platform);

    const sessionId = cookies.get('session_id');
    const currentUser =
        locals.user ??
        (sessionId ? await getUserBySessionId(platform, sessionId) : null);
    const canUseMeetup = currentUser
        ? isMeetupProfileComplete({
              nickname: currentUser.nickname,
              grade: currentUser.grade ?? null,
              college: currentUser.college ?? null,
              department: currentUser.department ?? null,
              gender: currentUser.gender ?? null,
              kakaoId: currentUser.kakaoId ?? null,
              instaId: currentUser.instaId ?? null
          })
        : false;

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
