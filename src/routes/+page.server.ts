// src/routes/+page.server.ts
import type { PageServerLoad } from './$types';

// 외부 파일, DB import를 아예 하지 않습니다.
// import { db } ... (X)
// import { ... } from '$lib/...' (X)

export const load: PageServerLoad = async () => {
    console.log("서버 로드 함수 실행됨!"); // 터미널에 이 로그가 찍히는지 보세요

    const maincategory = [
        { name: '한식' }, { name: '중식' }, { name: '양식' },
        { name: '일식' }, { name: '아시안' }, { name: '분식' },
        { name: '치킨' }, { name: '피자' }, { name: '고기' },
        { name: '패스트푸드' }, { name: '커피' }, { name: '술집' },
        { name: '기타' }
    ];

    return {
        maincategory,
        restaurants: []
    };
};