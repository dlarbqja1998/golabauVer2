// src/routes/api/upload/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const formData = await request.formData();
	const file = formData.get('image') as File;

	if (!file) {
		return json({ error: '이미지가 없습니다.' }, { status: 400 });
	}

	const fileName = `${Date.now()}_${file.name}`;

	try {
		// 로컬 모드일 때 platform.env가 없을 수 있음
		if (!platform?.env?.R2) {
            // 로컬 테스트용: 그냥 성공했다고 뻥치고 가짜 주소 줌
            // (주의: 실제 파일은 R2에 안 올라감. 엑박 뜰 수 있음)
			console.log('⚠️ 로컬 모드: R2가 없어서 업로드 흉내만 냅니다.');
            return json({ url: 'https://placehold.co/600x400?text=Local+Test+Image' });
		}

		await platform.env.R2.put(fileName, file);
		
        // ⚠️ 본인의 R2 공개 주소로 바꿔야 함
		const imageUrl = `https://pub-my-r2-domain.r2.dev/${fileName}`;

		return json({ url: imageUrl });

	} catch (err) {
		console.error(err);
		return json({ error: '업로드 실패' }, { status: 500 });
	}
};