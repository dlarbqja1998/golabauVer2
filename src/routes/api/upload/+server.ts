import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit'; 
import { r2 } from '../../../lib/server/s3'; // (형 폴더 경로 맞는지 확인!)
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private'; // 🔥 dotenv 대신 SvelteKit 보따리!

const R2_BUCKET_NAME = env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = env.R2_PUBLIC_URL;

export async function POST({ request }: RequestEvent) {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
        return json({ error: '이미지가 없습니다.' }, { status: 400 });
    }

    const uniqueName = `images/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    
    const arrayBuffer = await file.arrayBuffer();
    // 🔥 Buffer 대신 클라우드플레어 찰떡 호환인 Uint8Array 사용!
    const bodyData = new Uint8Array(arrayBuffer);

    try {
        await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: uniqueName,
            Body: bodyData, // 🔥 변경된 bodyData 넣기
            ContentType: file.type,
        }));

        const imageUrl = `${R2_PUBLIC_URL}/${uniqueName}`;
        console.log(`[Upload Success] ${imageUrl}`);
        
        return json({ url: imageUrl });

    } catch (e) {
        console.error('R2 Upload Error:', e);
        return json({ error: '업로드 실패' }, { status: 500 });
    }
}