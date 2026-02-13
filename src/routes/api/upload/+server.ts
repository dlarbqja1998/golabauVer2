import { json } from '@sveltejs/kit';
// SvelteKit에서 제공하는 타입 추가
import type { RequestEvent } from '@sveltejs/kit'; 
import { r2 } from '../../../lib/server/s3'; 
import { PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// { request }: RequestEvent 로 타입을 지정해주면 빨간 줄이 사라집니다.
export async function POST({ request }: RequestEvent) {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
        return json({ error: '이미지가 없습니다.' }, { status: 400 });
    }

    const uniqueName = `images/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
        await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: uniqueName,
            Body: buffer,
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