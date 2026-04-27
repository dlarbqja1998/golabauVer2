import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { rooms, users, restaurants } from '../../../db/schema';
import { redirect, fail } from '@sveltejs/kit';
import { eq, and, gt, sql } from 'drizzle-orm';
import { observeKVMutation } from '$lib/server/kv-monitor';

export const load: PageServerLoad = async ({ locals, platform }) => {
    if (!locals.user) throw redirect(302, '/login');

    const currentUser = await db.query.users.findFirst({
        where: eq(users.id, locals.user.id)
    });

    const kv = platform?.env?.GOLABAU_CACHE;
    let allRestaurants = [];

    if (kv) {
        const cached = await kv.get('all_restaurants_basic', 'json');
        if (cached) {
            allRestaurants = cached as Array<{
                id: number;
                name: string;
                category: string | null;
                zone: string | null;
            }>;
        } else {
            allRestaurants = await db
                .select({
                    id: restaurants.id,
                    name: restaurants.placeName,
                    category: restaurants.mainCategory,
                    zone: restaurants.zone
                })
                .from(restaurants);

            await kv.put('all_restaurants_basic', JSON.stringify(allRestaurants), { expirationTtl: 86400 });
            observeKVMutation(platform, {
                action: 'write',
                source: 'meetup-create',
                key: 'all_restaurants_basic',
                path: '/meetup/create',
                userId: locals.user?.id
            });
        }
    } else {
        allRestaurants = await db
            .select({
                id: restaurants.id,
                name: restaurants.placeName,
                category: restaurants.mainCategory,
                zone: restaurants.zone
            })
            .from(restaurants);
    }

    const safeUser = currentUser
        ? {
              nickname: currentUser.nickname,
              kakaoId: currentUser.kakaoId,
              instaId: currentUser.instaId
          }
        : null;

    return { user: safeUser, restaurants: allRestaurants };
};

export const actions: Actions = {
    create: async ({ request, locals, platform }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요한 서비스입니다.' });

        const activeCountRes = await db
            .select({ count: sql<number>`count(*)` })
            .from(rooms)
            .where(
                and(
                    eq(rooms.creatorId, locals.user.id),
                    eq(rooms.status, 'OPEN'),
                    gt(rooms.appointmentTime, new Date().toISOString())
                )
            );

        if (activeCountRes[0].count >= 3) {
            return fail(429, { message: '동시에 최대 3개의 방만 만들 수 있습니다.' });
        }

        const formData = await request.formData();
        const title = formData.get('title')?.toString().trim();
        const genderCondition = formData.get('genderCondition')?.toString();
        const headcountCondition = formData.get('headcountCondition')?.toString();
        const restaurantId = Number(formData.get('restaurantId'));
        const appointmentTime = formData.get('appointmentTime')?.toString();
        const contactType = formData.get('contactType')?.toString();
        const contactId = formData.get('contactId')?.toString().trim();

        if (!title || !appointmentTime || !restaurantId || !contactId) {
            return fail(400, { message: '필수 항목이 누락되었습니다.' });
        }

        const validHeadcountConditions = new Set(['1:1', '2:2', '3:3', 'N:N']);
        const validGenderConditions = new Set(['ALL', 'MALE', 'FEMALE']);
        const validContactTypes = new Set(['KAKAO', 'INSTA']);

        if (!validHeadcountConditions.has(headcountCondition || '')) {
            return fail(400, { message: '인원 조건이 올바르지 않습니다.' });
        }

        if (!validGenderConditions.has(genderCondition || '')) {
            return fail(400, { message: '성별 조건이 올바르지 않습니다.' });
        }

        if (!validContactTypes.has(contactType || '')) {
            return fail(400, { message: '연락처 유형이 올바르지 않습니다.' });
        }

        const parsedAppointmentTime = new Date(appointmentTime);
        if (Number.isNaN(parsedAppointmentTime.getTime())) {
            return fail(400, { message: '약속 시간 정보가 올바르지 않습니다.' });
        }

        if (parsedAppointmentTime <= new Date()) {
            return fail(400, { message: '현재 시각 이후의 약속만 만들 수 있습니다.' });
        }

        try {
            const restaurant = await db.query.restaurants.findFirst({
                where: eq(restaurants.id, restaurantId),
                columns: { id: true, placeName: true }
            });

            if (!restaurant?.placeName) {
                return fail(400, { message: '식당 정보를 다시 확인해 주세요.' });
            }

            const meetingType = headcountCondition === '1:1' ? 'BABYAK' : 'GWATING';

            await db.insert(rooms).values({
                creatorId: locals.user.id,
                title,
                meetingType,
                genderCondition,
                headcountCondition,
                restaurantId,
                restaurantName: restaurant.placeName,
                appointmentTime: parsedAppointmentTime.toISOString(),
                contactType,
                contactId
            });

            const kv = platform?.env?.GOLABAU_CACHE;
            if (kv) {
                await kv.delete('active_meetup_rooms');
                observeKVMutation(platform, {
                    action: 'delete',
                    source: 'meetup-create',
                    key: 'active_meetup_rooms',
                    path: '/meetup/create',
                    userId: locals.user.id
                });
            }
        } catch (error) {
            console.error('Room Create Error:', error);
            return fail(500, { message: '서버 오류가 발생했습니다.' });
        }

        throw redirect(303, '/meetup');
    }
};
