import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private'; // 🔥 여기 수정! env 보따리를 통째로 가져옴!

// 🔥 1. 매개변수에 locals 추가!
export const POST: RequestHandler = async ({ request, locals }) => {
    
    // =======================================================
    // 🚨 2. [핵심 방어막] 로그인 안 한 유저면 여기서 컷! (401 에러 반환)
    // =======================================================
    if (!locals.user) {
        return new Response('로그인이 필요합니다.', { status: 401 });
    }

    try {
        const { category, content, contact } = await request.json();

        // 디스코드 웹훅 포맷
        const payload = {
            username: "골라바유 알리미",
            avatar_url: "https://i.imgur.com/4M34hi2.png",
            embeds: [
                {
                    title: `📢 새로운 문의: [${category}]`,
                    color: 5814783, // 파란색
                    fields: [
                        {
                            name: "📝 내용",
                            value: content
                        },
                        {
                            name: "📧 연락처",
                            value: contact || "없음"
                        }
                    ],
                    footer: {
                        text: `보낸 시간: ${new Date().toLocaleString()}`
                    }
                }
            ]
        };

        // 🔥 여기 수정! env.DISCORD_WEBHOOK_URL 로 꺼내서 씀!
        const response = await fetch(env.DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            return json({ success: true });
        } else {
            console.error('Discord error:', await response.text());
            return json({ success: false }, { status: 500 });
        }

    } catch (err) {
        console.error(err);
        return json({ success: false }, { status: 500 });
    }
};