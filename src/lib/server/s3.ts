import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// .env 파일 로드 (안전장치)
dotenv.config();

// 환경변수 가져오기 (별칭 없이 직접 접근)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 환경변수가 설정되지 않았습니다. .env 파일을 확인해주세요.");
}

export const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});