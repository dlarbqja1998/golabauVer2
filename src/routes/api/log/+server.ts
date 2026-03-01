import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// 🔥 더 이상 Neon DB를 사용하지 않으므로 db 임포트 싹 다 삭제!

export const POST: RequestHandler = async () => {
    // 🚀 PostHog 도입으로 인해 기존 DB 직접 적재 로직 폐기!
    // 과거 캐시된 클라이언트에서 혹시라도 요청이 들어오면, 
    // DB 용량을 파먹지 않도록 그냥 '성공' 응답만 뱉고 빈손으로 돌려보냅니다.
    
    return json({ 
        success: true, 
        message: 'Log migrated to PostHog. No DB action taken.' 
    });
};