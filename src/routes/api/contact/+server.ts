import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types'; // [추가] 타입 가져오기
import { DISCORD_WEBHOOK_URL } from '$env/static/private';

// [수정] RequestHandler 타입 적용
export const POST: RequestHandler = async ({ request }) => {
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

        // 디스코드로 전송
        const response = await fetch(DISCORD_WEBHOOK_URL, {
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