import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './src/db/schema'; // 경로 확인 필수!
import { config } from 'dotenv';
import fs from 'fs';

config();

if (!process.env.DATABASE_URL) {
    throw new Error('❌ DATABASE_URL이 설정되지 않았습니다.');
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client, { schema });

async function seedRestaurants() {
    console.log('🚀 데이터베이스 시딩(Seeding)을 시작합니다...');

    try {
        // 1. 🔥 기존 음식점 데이터 싹 다 날리기 (초기화)
        console.log('🧹 1. 기존 음식점 데이터를 DB에서 모두 삭제하는 중...');
        await db.delete(schema.restaurants);
        console.log('✨ 기존 데이터 삭제 완료! 깨끗해졌습니다.');

        // 2. 파이썬에서 만든 JSON 파일 읽어오기
        const fileData = fs.readFileSync('./3_final_restaurants.json', 'utf-8');
        const restaurants = JSON.parse(fileData);

        console.log(`📥 2. 총 ${restaurants.length}개의 새로운 식당 데이터를 넣을 준비 중...`);

        // Drizzle 스키마에 맞게 데이터 매핑
        const valuesToInsert = restaurants.map((r: any) => ({
            id: r.id, 
            placeName: r.name,
            mainCategory: r.main_category,
            phone: r.phone,
            roadAddressName: r.address,
            placeUrl: r.placeUrl,
            x: r.x,
            y: r.y,
            distanceInMeters: r.distance_m,
            walkTimeInMinutes: r.walk_time_min,
            pathCoordinates: r.route_path, 
            zone: r.zone || '기타'
        }));

        // 3. 텅 빈 DB에 새 데이터 꽂아 넣기 (덮어쓰기 로직 제거, 순수 삽입)
        let count = 0;
        for (const item of valuesToInsert) {
            await db.insert(schema.restaurants).values(item);
            count++;
            // 진행 상황 보여주기 (50개 단위)
            if (count % 50 === 0) {
                console.log(`   ... ${count} / ${valuesToInsert.length} 개 완료`);
            }
        }

        console.log(`\n🎉 데이터베이스 시딩 완료! 총 ${count}개의 데이터가 새롭게 추가되었습니다.`);

    } catch (error) {
        console.error('🚨 에러 발생:', error);
    }
}

seedRestaurants();