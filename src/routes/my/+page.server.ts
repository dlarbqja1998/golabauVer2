import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { users, golabassyuPosts, pushSubscriptions } from '../../db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import {
    buildDeletedEmail,
    DELETED_USER_NICKNAME,
    getUserBySessionId,
    USER_STATUS
} from '$lib/server/user';

const loginAttempts = new Map<string, { currentFails: number; totalFails: number; lockedUntil: number }>();
const DELETE_CONFIRMATION_TEXT = '\uD0C8\uD1F4\uD558\uACA0\uC2B5\uB2C8\uB2E4';

export const load: PageServerLoad = async ({ cookies }) => {
    const sessionId = cookies.get('session_id');
    if (!sessionId) throw redirect(303, '/login');

    const userInfo = await getUserBySessionId(undefined, sessionId);
    if (!userInfo) {
        cookies.delete('session_id', { path: '/' });
        throw redirect(303, '/login');
    }

    const myPosts = await db.query.golabassyuPosts.findMany({
        where: eq(golabassyuPosts.userId, userInfo.id),
        orderBy: [desc(golabassyuPosts.createdAt)]
    });

    return {
        user: userInfo,
        myPosts,
        deleteConfirmationText: DELETE_CONFIRMATION_TEXT
    };
};

async function getActiveDeletionBlockers(userId: number) {
    const hostedRoomResult = await db.execute(sql`
        SELECT count(*)::int AS count
        FROM rooms
        WHERE creator_id = ${userId}
          AND status = 'OPEN'
    `);

    const activeRequestResult = await db.execute(sql`
        SELECT count(*)::int AS count
        FROM room_requests rr
        JOIN rooms r ON r.id = rr.room_id
        WHERE rr.requester_id = ${userId}
          AND rr.status IN ('PENDING', 'HOST_READY', 'APPLICANT_READY', 'MATCHED')
          AND r.status IN ('OPEN', 'MATCHED')
    `);

    return {
        openHostedRoomCount: Number(hostedRoomResult.rows[0]?.count ?? 0),
        activeRequestCount: Number(activeRequestResult.rows[0]?.count ?? 0)
    };
}

export const actions: Actions = {
    logout: async ({ cookies }) => {
        cookies.delete('session_id', { path: '/' });
        throw redirect(303, '/');
    },

    updateProfile: async ({ request, cookies }) => {
        const sessionId = cookies.get('session_id');
        if (!sessionId) return fail(401);

        const sessionUser = await getUserBySessionId(undefined, sessionId);
        if (!sessionUser) return fail(401);

        const data = await request.formData();
        const nickname = data.get('nickname')?.toString().trim();
        const college = data.get('college')?.toString();
        const department = data.get('department')?.toString();
        const grade = data.get('grade')?.toString();
        const kakaoId = data.get('kakaoId')?.toString().trim() || null;
        const instaId = data.get('instaId')?.toString().trim() || null;

        if (!nickname || nickname.length < 2 || nickname.length > 10) {
            return fail(400, { message: '\uB2C9\uB124\uC784\uC740 2\uAE00\uC790 \uC774\uC0C1, 10\uAE00\uC790 \uC774\uD558\uB85C \uC785\uB825\uD574 \uC8FC\uC138\uC694.' });
        }

        try {
            await db
                .update(users)
                .set({ nickname, college, department, grade, kakaoId, instaId })
                .where(eq(users.id, sessionUser.id));

            return { success: true };
        } catch {
            return fail(500, { message: '\uD504\uB85C\uD544 \uC218\uC815\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.' });
        }
    },

    deleteAccount: async ({ request, cookies }) => {
        const sessionId = cookies.get('session_id');
        if (!sessionId) return fail(401, { deleteError: '\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.' });

        const sessionUser = await getUserBySessionId(undefined, sessionId);
        if (!sessionUser) return fail(401, { deleteError: '\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.' });

        if (sessionUser.status === USER_STATUS.DELETED) {
            cookies.delete('session_id', { path: '/' });
            return fail(400, { deleteError: '\uC774\uBBF8 \uD0C8\uD1F4 \uCC98\uB9AC\uB41C \uACC4\uC815\uC785\uB2C8\uB2E4.' });
        }

        const formData = await request.formData();
        const confirmationText = formData.get('confirmationText')?.toString().trim() ?? '';
        const deletionReason = formData.get('deletionReason')?.toString().trim() || null;

        if (confirmationText !== DELETE_CONFIRMATION_TEXT) {
            return fail(400, {
                deleteError: `\uD655\uC778 \uBB38\uAD6C\uB97C \uC815\uD655\uD788 \uC785\uB825\uD574 \uC8FC\uC138\uC694: ${DELETE_CONFIRMATION_TEXT}`
            });
        }

        if (sessionUser.role === 'admin') {
            return fail(400, { deleteError: '\uAD00\uB9AC\uC790 \uACC4\uC815\uC740 \uC77C\uBC18 \uD0C8\uD1F4\uB97C \uC9C4\uD589\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.' });
        }

        const blockers = await getActiveDeletionBlockers(sessionUser.id);
        if (blockers.openHostedRoomCount > 0) {
            return fail(400, {
                deleteError: '\uC9C4\uD589 \uC911\uC778 \uBAA8\uC784\uC758 \uBC29\uC7A5 \uACC4\uC815\uC740 \uBA3C\uC800 \uBAA8\uC784\uC744 \uC815\uB9AC\uD574\uC57C \uD0C8\uD1F4\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'
            });
        }

        if (blockers.activeRequestCount > 0) {
            return fail(400, {
                deleteError: '\uC9C4\uD589 \uC911\uC778 \uBAA8\uC784 \uC2E0\uCCAD \uB610\uB294 \uB9E4\uCE6D \uB0B4\uC5ED\uC774 \uC788\uC5B4 \uC9C0\uAE08\uC740 \uD0C8\uD1F4\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.'
            });
        }

        const now = new Date().toISOString();
        const anonymizedEmail = buildDeletedEmail(sessionUser.id);

        try {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, sessionUser.id));

            await db
                .update(users)
                .set({
                    email: anonymizedEmail,
                    password: null,
                    nickname: DELETED_USER_NICKNAME,
                    badge: null,
                    profileImg: null,
                    provider: 'deleted',
                    providerId: null,
                    college: null,
                    department: null,
                    grade: null,
                    birthYear: null,
                    gender: null,
                    isOnboarded: false,
                    role: 'user',
                    isBanned: false,
                    kakaoId: null,
                    instaId: null,
                    status: USER_STATUS.DELETED,
                    deletedAt: now,
                    anonymizedAt: now,
                    deletionReason
                })
                .where(eq(users.id, sessionUser.id));

            cookies.delete('session_id', { path: '/' });
            return {
                deleteSuccess: true,
                message: '\uD68C\uC6D0 \uD0C8\uD1F4\uAC00 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.'
            };
        } catch {
            return fail(500, {
                deleteError: '\uD0C8\uD1F4 \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.'
            });
        }
    },

    becomeAdmin: async ({ request, locals, getClientAddress }) => {
        const sessionUser = locals.user;
        if (!sessionUser) return fail(401, { message: '\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.' });

        await new Promise((resolve) => setTimeout(resolve, 1000));
        const ip = getClientAddress();
        const now = Date.now();

        if (!loginAttempts.has(ip)) {
            loginAttempts.set(ip, { currentFails: 0, totalFails: 0, lockedUntil: 0 });
        }

        const attempt = loginAttempts.get(ip)!;
        if (attempt.totalFails >= 15) {
            return fail(403, { message: '\uC9C0\uC18D\uC801\uC778 \uACF5\uACA9 \uC2DC\uB3C4\uB85C \uD574\uB2F9 IP\uB294 \uC601\uAD6C \uCC28\uB2E8\uB418\uC5C8\uC2B5\uB2C8\uB2E4.' });
        }

        if (attempt.lockedUntil > now) {
            const remainMin = Math.ceil((attempt.lockedUntil - now) / 1000 / 60);
            return fail(429, { message: `\uC2DC\uB3C4 \uD69F\uC218 \uCD08\uACFC\uB85C ${remainMin}\uBD84 \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.` });
        }

        const data = await request.formData();
        const secretCode = data.get('secretCode')?.toString();

        if (secretCode !== env.ADMIN_SECRET_KEY) {
            attempt.currentFails += 1;
            attempt.totalFails += 1;

            if (attempt.currentFails >= 5) {
                attempt.lockedUntil = now + 15 * 60 * 1000;
                attempt.currentFails = 0;
                return fail(429, { message: '5\uD68C \uC5F0\uC18D \uC2E4\uD328\uB85C 15\uBD84 \uB3D9\uC548 \uC778\uC99D\uC774 \uCC28\uB2E8\uB429\uB2C8\uB2E4.' });
            }

            return fail(400, { message: '\uBE44\uBC00 \uCF54\uB4DC\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.' });
        }

        loginAttempts.delete(ip);

        try {
            await db.update(users).set({ role: 'admin' }).where(eq(users.id, sessionUser.id));
            return { success: true, message: '\uAD00\uB9AC\uC790 \uAD8C\uD55C\uC774 \uD65C\uC131\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4.' };
        } catch {
            return fail(500, { message: '\uAD8C\uD55C \uBCC0\uACBD \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.' });
        }
    }
};
