import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createLegacyShutdownResponse } from './legacy-shutdown';

describe('구버전 서비스 종료 안내', () => {
	it('예전 상세 주소로 접속해도 신규 서비스 이전 안내를 보여준다', async () => {
		const response = createLegacyShutdownResponse(
			new Request('https://golabau.pages.dev/restaurant/old-place', {
				headers: { accept: 'text/html' }
			})
		);

		assert.ok(response);
		assert.equal(response.status, 200);
		assert.match(response.headers.get('content-type') ?? '', /text\/html/);
		assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');

		const html = await response.text();
		assert.match(html, /골라바유가 새 주소로 이전했어요/);
		assert.match(html, /https:\/\/golabau\.com/);
		assert.match(html, /새 골라바유로 이동/);
		assert.match(html, /href="\/my"/);
		assert.match(html, /V2 계정 탈퇴/);
		assert.match(html, /name="robots" content="noindex, nofollow"/);
	});

	it('탈퇴에 필요한 마이·로그인·인증 경로는 기존 기능으로 열어 둔다', () => {
		for (const pathname of ['/my', '/login', '/auth/callback/kakao']) {
			const response = createLegacyShutdownResponse(
				new Request(`https://golabau.pages.dev${pathname}`, {
					headers: { accept: 'text/html' }
				})
			);

			assert.equal(response, null, `${pathname}은 종료 안내로 막으면 안 된다.`);
		}
	});

	it('정적 자산 요청은 종료 안내로 바꾸지 않는다', () => {
		const response = createLegacyShutdownResponse(
			new Request('https://golabau.pages.dev/icon.png', {
				headers: { accept: 'image/png' }
			})
		);

		assert.equal(response, null);
	});
});
