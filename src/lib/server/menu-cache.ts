import { getCafeteriaMenu } from './scraper';

export const MENU_CACHE_KEY = 'today_cafeteria_menu';
export const MENU_META_KEY = 'today_cafeteria_menu_meta';

export type TodayMenu = {
    date: string;
    day: string;
    student: {
        breakfast: string[];
        korean: string[];
        special: string[];
        snack: string[];
        dinner: string[];
    };
    faculty: {
        lunch: string[];
    };
};

type MenuCacheMeta = {
    menuDate: string;
    fetchedAt: string;
    lastAttemptAt: string;
    lastStatus: 'success' | 'failed';
    lastFailureReason?: string;
};

type CachePlatform = {
    env?: {
        GOLABAU_CACHE?: KVNamespace;
    };
};

function getMenuCache(platform: CachePlatform | undefined) {
    return platform?.env?.GOLABAU_CACHE ?? null;
}

function getSeoulDateParts(now = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
    });

    const parts = formatter.formatToParts(now);
    const year = parts.find((part) => part.type === 'year')?.value ?? '';
    const month = parts.find((part) => part.type === 'month')?.value ?? '';
    const day = parts.find((part) => part.type === 'day')?.value ?? '';
    const weekday = parts.find((part) => part.type === 'weekday')?.value ?? 'Sun';
    const weekdayMap: Record<string, string> = {
        Sun: '\uC77C',
        Mon: '\uC6D4',
        Tue: '\uD654',
        Wed: '\uC218',
        Thu: '\uBAA9',
        Fri: '\uAE08',
        Sat: '\uD1A0'
    };

    return {
        cacheDate: `${year}.${month}.${day}`,
        isoDate: `${year}-${month}-${day}`,
        dayLabel: weekdayMap[weekday] ?? '\uC77C'
    };
}

async function readJson<T>(kv: KVNamespace | null, key: string): Promise<T | null> {
    if (!kv) return null;

    try {
        const raw = await kv.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
        console.error(`menu cache read failed: ${key}`, error);
        return null;
    }
}

async function writeJson(kv: KVNamespace | null, key: string, value: unknown, expirationTtl: number) {
    if (!kv) return;

    try {
        await kv.put(key, JSON.stringify(value), { expirationTtl });
    } catch (error) {
        console.error(`menu cache write failed: ${key}`, error);
    }
}

function isTodayMenu(value: unknown): value is TodayMenu {
    return !!value && typeof value === 'object' && 'student' in value && 'faculty' in value;
}

export async function getCachedTodayMenu(platform: CachePlatform | undefined): Promise<TodayMenu | null> {
    const cached = await readJson<unknown>(getMenuCache(platform), MENU_CACHE_KEY);
    return isTodayMenu(cached) ? cached : null;
}

export async function refreshTodayMenuCache(platform: CachePlatform | undefined) {
    const kv = getMenuCache(platform);
    if (!kv) {
        return { status: 'skipped' as const, reason: 'missing_kv' };
    }

    const dateParts = getSeoulDateParts();
    const previousMenu = await readJson<unknown>(kv, MENU_CACHE_KEY);
    const existingMenu = isTodayMenu(previousMenu) ? previousMenu : null;
    const existingMeta = await readJson<MenuCacheMeta>(kv, MENU_META_KEY);

    if (existingMenu && existingMeta?.menuDate === dateParts.isoDate) {
        return { status: 'skipped' as const, reason: 'already_fresh' };
    }

    const attemptedAt = new Date().toISOString();

    try {
        const menuResult = await getCafeteriaMenu();

        if (typeof menuResult !== 'object' || menuResult === null) {
            await writeJson(kv, MENU_META_KEY, {
                menuDate: existingMeta?.menuDate ?? '',
                fetchedAt: existingMeta?.fetchedAt ?? '',
                lastAttemptAt: attemptedAt,
                lastStatus: 'failed',
                lastFailureReason: 'empty_menu_result'
            } satisfies MenuCacheMeta, 60 * 60 * 24 * 7);

            return { status: 'failed' as const, reason: 'empty_menu_result' };
        }

        const nextMenu: TodayMenu = {
            date: dateParts.cacheDate,
            day: dateParts.dayLabel,
            student: menuResult.student,
            faculty: menuResult.faculty
        };

        await Promise.all([
            writeJson(kv, MENU_CACHE_KEY, nextMenu, 60 * 60 * 24 * 7),
            writeJson(kv, MENU_META_KEY, {
                menuDate: dateParts.isoDate,
                fetchedAt: attemptedAt,
                lastAttemptAt: attemptedAt,
                lastStatus: 'success'
            } satisfies MenuCacheMeta, 60 * 60 * 24 * 7)
        ]);

        return { status: 'updated' as const, menu: nextMenu };
    } catch (error) {
        await writeJson(kv, MENU_META_KEY, {
            menuDate: existingMeta?.menuDate ?? '',
            fetchedAt: existingMeta?.fetchedAt ?? '',
            lastAttemptAt: attemptedAt,
            lastStatus: 'failed',
            lastFailureReason: error instanceof Error ? error.message : 'unknown_error'
        } satisfies MenuCacheMeta, 60 * 60 * 24 * 7);

        console.error('scheduled menu refresh failed:', error);
        return { status: 'failed' as const, reason: error instanceof Error ? error.message : 'unknown_error' };
    }
}
