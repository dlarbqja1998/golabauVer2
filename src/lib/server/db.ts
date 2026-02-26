import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from '$env/dynamic/private'; // 👈 dynamic으로 바꿈!
import * as schema from '../../db/schema';

// env.DATABASE_URL 로 꺼내 쓰게 바꿈!
const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, { schema });