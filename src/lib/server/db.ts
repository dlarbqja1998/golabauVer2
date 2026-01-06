// src/lib/server/db.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { DATABASE_URL } from '$env/static/private';
import * as schema from '../../db/schema';

// 1. 여기서 주소가 잘 찍히는지 터미널에서 확인해야 함!
if (!DATABASE_URL) {
    throw new Error('❌ .env 파일에서 DATABASE_URL을 찾을 수 없습니다!');
}
// console.log('✅ DB 연결 시도 중:', DATABASE_URL); // 필요하면 주석 해제해서 확인

const sql = neon(DATABASE_URL);
export const db = drizzle(sql, { schema });