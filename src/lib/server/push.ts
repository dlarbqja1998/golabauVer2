// =========================================================
//  [src/lib/server/push.ts]
//  Cloudflare Workers 호환 Web Push 구현
//  (web-push 라이브러리 없이 Web Crypto API + fetch 사용)
// =========================================================
import { db } from './db';
import { pushSubscriptions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

// ─────────────────────────────────────────────────────
//  유틸: Base64url 인코딩/디코딩
// ─────────────────────────────────────────────────────
function base64urlEncode(data: ArrayBuffer | Uint8Array): string {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function concatBuffers(...arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}

/** Uint8Array → ArrayBuffer 안전 변환 (TS strict 호환) */
function toBuffer(arr: Uint8Array): ArrayBuffer {
    return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength);
}

// ─────────────────────────────────────────────────────
//  VAPID JWT 생성 (ECDSA P-256 서명)
// ─────────────────────────────────────────────────────
async function createVapidJwt(
    audience: string,
    subject: string,
    privateKeyBase64url: string,
    publicKeyBase64url: string
): Promise<{ authorization: string }> {
    const header = { typ: 'JWT', alg: 'ES256' };
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
        aud: audience,
        exp: now + 12 * 60 * 60,
        sub: subject
    };

    const headerStr = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
    const payloadStr = base64urlEncode(new TextEncoder().encode(JSON.stringify(jwtPayload)));
    const unsignedToken = `${headerStr}.${payloadStr}`;

    // VAPID 비밀키 → JWK 변환 후 import
    const rawPrivateKey = base64urlDecode(privateKeyBase64url);
    const rawPublicKey = base64urlDecode(publicKeyBase64url);
    // 65바이트 uncompressed: 0x04 + x(32) + y(32)
    const x = base64urlEncode(rawPublicKey.slice(1, 33));
    const y = base64urlEncode(rawPublicKey.slice(33, 65));
    const d = base64urlEncode(rawPrivateKey);

    const signingKey = await crypto.subtle.importKey(
        'jwk',
        { kty: 'EC', crv: 'P-256', x, y, d, ext: true } as JsonWebKey,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        signingKey,
        new TextEncoder().encode(unsignedToken)
    );

    const token = `${unsignedToken}.${base64urlEncode(signature)}`;
    return { authorization: `vapid t=${token}, k=${publicKeyBase64url}` };
}

// ─────────────────────────────────────────────────────
//  HKDF (RFC 5869) - Web Crypto API
// ─────────────────────────────────────────────────────
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
    const keyMaterial = await crypto.subtle.importKey(
        'raw', toBuffer(ikm), { name: 'HKDF' }, false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'HKDF', hash: 'SHA-256', salt: toBuffer(salt), info: toBuffer(info) },
        keyMaterial,
        length * 8
    );
    return new Uint8Array(bits);
}

// ─────────────────────────────────────────────────────
//  RFC 8291: Web Push 페이로드 암호화 (aes128gcm)
// ─────────────────────────────────────────────────────
async function encryptPayload(
    clientPublicKeyBase64url: string,
    clientAuthBase64url: string,
    payloadText: string
): Promise<Uint8Array> {

    const clientPublicKeyRaw = base64urlDecode(clientPublicKeyBase64url);
    const clientAuth = base64urlDecode(clientAuthBase64url);
    const payloadBytes = new TextEncoder().encode(payloadText);

    // 1. 서버 임시 ECDH 키쌍
    const localKeyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
    ) as CryptoKeyPair;

    // 클라이언트 공개키 import
    const clientPubCryptoKey = await crypto.subtle.importKey(
        'raw', toBuffer(clientPublicKeyRaw),
        { name: 'ECDH', namedCurve: 'P-256' },
        false, []
    );

    // 2. ECDH 공유 시크릿
    const sharedSecret = new Uint8Array(
        await crypto.subtle.deriveBits(
            { name: 'ECDH', public: clientPubCryptoKey },
            localKeyPair.privateKey, 256
        )
    );

    // 서버 공개키 raw export (65바이트)
    const localPubRaw = new Uint8Array(
        await crypto.subtle.exportKey('raw', localKeyPair.publicKey)
    );

    const enc = new TextEncoder();

    // 3. 랜덤 salt 16바이트
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // 4. RFC 8291 키 유도
    // auth_info = "WebPush: info\0" + client_public(65) + server_public(65)
    const authInfo = concatBuffers(
        enc.encode('WebPush: info\0'),
        clientPublicKeyRaw,
        localPubRaw
    );
    const ikm = await hkdf(clientAuth, sharedSecret, authInfo, 32);

    const cekInfo = enc.encode('Content-Encoding: aes128gcm\0');
    const nonceInfo = enc.encode('Content-Encoding: nonce\0');
    const cek = await hkdf(salt, ikm, cekInfo, 16);
    const nonce = await hkdf(salt, ikm, nonceInfo, 12);

    // 5. 패딩 + AES-128-GCM 암호화
    const padded = concatBuffers(payloadBytes, new Uint8Array([2]));

    const aesKey = await crypto.subtle.importKey(
        'raw', toBuffer(cek), { name: 'AES-GCM' }, false, ['encrypt']
    );
    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: toBuffer(nonce) },
            aesKey,
            toBuffer(padded)
        )
    );

    // 6. aes128gcm 레코드 조립: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
    const rs = new Uint8Array(4);
    new DataView(rs.buffer).setUint32(0, 4096, false);
    const idlen = new Uint8Array([localPubRaw.length]); // 65

    return concatBuffers(salt, rs, idlen, localPubRaw, ciphertext);
}

// ─────────────────────────────────────────────────────
//  푸시 알림 발송 (외부 인터페이스 - 기존과 동일!)
// ─────────────────────────────────────────────────────
export async function sendPushNotification(userId: number, title: string, body: string, url: string = '/') {
    const vapidPublicKey = publicEnv.PUBLIC_VITE_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
    const vapidSubject = env.VAPID_SUBJECT || 'mailto:dlarbqja19980987@gmail.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
        console.warn('⚠️ VAPID 키가 누락되어 푸시를 발송하지 않았습니다.');
        return false;
    }

    try {
        const subs = await db.query.pushSubscriptions.findMany({
            where: eq(pushSubscriptions.userId, userId)
        });

        if (!subs || subs.length === 0) return false;

        const payloadText = JSON.stringify({ title, body, url });
        let successCount = 0;

        for (const sub of subs) {
            try {
                // 푸시 엔드포인트 origin 추출
                const endpointUrl = new URL(sub.endpoint);
                const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

                // VAPID 인증 헤더
                const vapid = await createVapidJwt(audience, vapidSubject, vapidPrivateKey, vapidPublicKey);

                // 페이로드 암호화
                const encrypted = await encryptPayload(sub.p256dh, sub.auth, payloadText);

                // 푸시 서비스에 전송
                const response = await fetch(sub.endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': vapid.authorization,
                        'Content-Encoding': 'aes128gcm',
                        'Content-Type': 'application/octet-stream',
                        'TTL': '86400',
                        'Urgency': 'high'
                    },
                    body: toBuffer(encrypted)
                });

                if (response.status === 201 || response.status === 200) {
                    successCount++;
                } else if (response.status === 410 || response.status === 404) {
                    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
                    console.warn(`구독 만료로 DB 제거 (userId: ${userId})`);
                } else {
                    console.error(`푸시 발송 실패 (userId: ${userId}): HTTP ${response.status}`);
                }
            } catch (error: any) {
                console.error(`푸시 발송 실패 (userId: ${userId}):`, error.message || error);
            }
        }
        return successCount > 0;
    } catch (e) {
        console.error('푸시 전송 코어 에러:', e);
        return false;
    }
}
