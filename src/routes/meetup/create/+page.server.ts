// =========================================================
//  [src/routes/meetup/create/+page.server.ts]
//  방 생성 및 전체 식당 리스트 KV 캐싱 로직
// =========================================================
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { rooms, users, restaurants } from '../../../db/schema'; 
import { redirect, fail } from '@sveltejs/kit';
import { eq, and, gt, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, platform }) => {
    if (!locals.user) throw redirect(302, '/login');

    const currentUser = await db.query.users.findFirst({
        where: eq(users.id, locals.user.id)
    });

    // 🚀 [비용 0원 식당 필터링] 전체 식당 기본정보를 KV에 캐싱하여 프론트로 한방에 전달!
    const kv = platform?.env?.GOLABAU_CACHE;
    let allRestaurants = [];

    if (kv) {
        const cached = await kv.get('all_restaurants_basic', 'json');
        if (cached) {
            allRestaurants = cached as any[];
        } else {
            // 캐시에 없으면 DB에서 가벼운 정보(id, 이름, 카테고리, 구역)만 추출
            allRestaurants = await db.select({
                id: restaurants.id,
                name: restaurants.placeName,
                category: restaurants.mainCategory,
                zone: restaurants.zone
            }).from(restaurants);
            
            // 하루(86400초) 동안 KV 캐싱 (DB 쿼리 비용 철통 방어)
            await kv.put('all_restaurants_basic', JSON.stringify(allRestaurants), { expirationTtl: 86400 });
        }
    } else {
        // 로컬 테스트 환경 예외 처리
        allRestaurants = await db.select({
            id: restaurants.id, name: restaurants.placeName, category: restaurants.mainCategory, zone: restaurants.zone
        }).from(restaurants);
    }

    // 🛡️ F12 방어: 방 생성 폼에 필요한 최소 정보만 내려줌
    const safeUser = currentUser ? {
        nickname: currentUser.nickname,
        kakaoId: currentUser.kakaoId,
        instaId: currentUser.instaId,
    } : null;

    return { user: safeUser, restaurants: allRestaurants };
};

export const actions: Actions = {
    create: async ({ request, locals, platform }) => {
        if (!locals.user) return fail(401, { message: '로그인이 필요한 서비스입니다.' });

        const activeCountRes = await db.select({ count: sql<number>`count(*)` })
            .from(rooms)
            .where(and(
                eq(rooms.creatorId, locals.user.id), 
                eq(rooms.status, 'OPEN'),
                gt(rooms.appointmentTime, new Date().toISOString())
            ));

        if (activeCountRes[0].count >= 3) { 
            return fail(429, { message: '욕심쟁이! 동시에 최대 3개의 방만 열어둘 수 있습니다.' });
        }

        const formData = await request.formData();
        const title = formData.get('title')?.toString();
        const meetingType = formData.get('meetingType')?.toString(); 
        const genderCondition = formData.get('genderCondition')?.toString(); 
        const headcountCondition = formData.get('headcountCondition')?.toString();
        const restaurantId = Number(formData.get('restaurantId'));
        const restaurantName = formData.get('restaurantName')?.toString();
        const appointmentTime = formData.get('appointmentTime')?.toString();
        const contactType = formData.get('contactType')?.toString();
        const contactId = formData.get('contactId')?.toString();

        if (!title || !appointmentTime || !restaurantId || !contactId) return fail(400, { message: '필수 항목 누락' });

        try {
            await db.insert(rooms).values({
                creatorId: locals.user.id, title, meetingType: meetingType as string,
                genderCondition: genderCondition as string, headcountCondition, restaurantId,
                restaurantName: restaurantName as string, appointmentTime: appointmentTime as string,
                contactType: contactType as string, contactId: contactId as string,
            });

            const kv = platform?.env?.GOLABAU_CACHE;
            if (kv) {
                await kv.delete('active_meetup_rooms');
            }
        } catch (error) {
            console.error('Room Create Error:', error);
            return fail(500, { message: '서버 에러가 발생했습니다.' });
        }

        throw redirect(303, '/meetup');
    }
};