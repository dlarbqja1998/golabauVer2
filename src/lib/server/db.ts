import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { DATABASE_URL } from '$env/static/private';
import * as schema from '../../db/schema'; // src/db/schema.ts 를 가져옴

if (!DATABASE_URL) {
    throw new Error('❌ .env 파일에서 DATABASE_URL을 찾을 수 없습니다!');
}

const sql = neon(DATABASE_URL);
// schema 객체를 통째로 넘겨야 나중에 db.query.users... 식으로 쓸 수 있음
export const db = drizzle(sql, { schema });