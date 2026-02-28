import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit'; 
import { r2 } from '../../../lib/server/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';

const R2_BUCKET_NAME = env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = env.R2_PUBLIC_URL;

// 🔥 1. 허용할 최대 용량 설정 (예: 5MB = 5 * 1024 * 1024 bytes)
const MAX_FILE_SIZE = 15 * 1024 * 1024;

// 🔥 2. 허용할 진짜 이미지 타입(MIME) 목록
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export async function POST({ request }: RequestEvent) {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
        return json({ error: '이미지가 없습니다.' }, { status: 400 });
    }

    // 🚨 [방어 1] 용량 컷! 5MB 넘으면 바로 쫓아냄
    if (file.size > MAX_FILE_SIZE) {
        console.log(`[보안] 대용량 파일 업로드 시도 차단! (${file.size} bytes)`);
        return json({ error: '파일 용량은 5MB를 초과할 수 없습니다.' }, { status: 400 });
    }

    // 🚨 [방어 2] 확장자 꼼수 컷! 진짜 이미지 형식이 아니면 쫓아냄
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        console.log(`[보안] 비정상 파일 업로드 시도 차단! (타입: ${file.type})`);
        return json({ error: 'JPG, PNG, WEBP, GIF 형식의 이미지만 업로드 가능합니다.' }, { status: 400 });
    }

    // 🚨 [방어 3] 이름 변조 방지! 유저가 올린 파일명은 싹 다 버리고 서버가 무작위로 새로 만듦
    // file.type이 'image/jpeg' 면 'jpeg'를 빼내서 확장자로 씀
    const ext = file.type.split('/')[1]; 
    const randomString = Math.random().toString(36).substring(2, 8); // 무작위 문자열
    const uniqueName = `images/${Date.now()}-${randomString}.${ext}`;
    
    const arrayBuffer = await file.arrayBuffer();
    const bodyData = new Uint8Array(arrayBuffer);

    try {
        await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: uniqueName,
            Body: bodyData, 
            ContentType: file.type, // 검증된 이미지 타입만 들어감
        }));

        const imageUrl = `${R2_PUBLIC_URL}/${uniqueName}`;
        console.log(`[Upload Success] ${imageUrl}`);
        
        return json({ url: imageUrl });

    } catch (e) {
        console.error('R2 Upload Error:', e);
        return json({ error: '서버 업로드 실패' }, { status: 500 });
    }
}