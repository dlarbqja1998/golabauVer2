import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types'; // 👈 타입 추가
import { db } from '$lib/server/db';
import { userLogs } from '../../../db/schema'; // 👈 상대 경로로 수정 (폴더 4번 위로)

export const POST: RequestHandler = async ({ request, cookies }) => {
    // 1. 데이터 받기
    const body = await request.json();
    const { actionType, target, metadata } = body;
    
    // 2. 로그인 유저 ID 확인
    const loginSession = cookies.get('session_id');
    const userId = loginSession ? parseInt(loginSession) : null;

    // 3. 비로그인 유저 추적용 쿠키 (없으면 생성)
    let trackingId = cookies.get('tracking_id');
    if (!trackingId) {
        trackingId = crypto.randomUUID();
        cookies.set('tracking_id', trackingId, { 
            path: '/', 
            maxAge: 60 * 60 * 24 * 365, // 1년
            httpOnly: true,
            sameSite: 'lax'
        });
    }

    // 4. DB에 저장 (CCTV 녹화)
    await db.insert(userLogs).values({
        userId,
        sessionId: trackingId,
        actionType,
        target,
        metadata: metadata || {}
    });

    return json({ success: true });
};