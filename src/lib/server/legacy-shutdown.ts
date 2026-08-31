const NEW_SERVICE_URL = 'https://golabau.com';

const SHUTDOWN_PAGE = `<!doctype html>
<html lang="ko">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
		<meta name="robots" content="noindex, nofollow" />
		<meta name="theme-color" content="#ffffff" />
		<title>골라바유 이전 안내</title>
		<style>
			:root { color-scheme: light; font-family: "Noto Sans KR", Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
			* { box-sizing: border-box; }
			body { margin: 0; min-width: 280px; background: #fff; color: #241f21; }
			main { min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; padding: max(28px, env(safe-area-inset-top)) 24px max(28px, env(safe-area-inset-bottom)); }
			section { width: min(100%, 430px); }
			.brand { display: flex; align-items: center; gap: 12px; margin-bottom: 48px; }
			.brand img { width: 48px; height: 48px; object-fit: contain; }
			.brand span { font-size: 14px; font-weight: 700; color: #81767a; }
			h1 { margin: 0; max-width: 330px; font-size: clamp(25px, 7vw, 30px); line-height: 1.35; letter-spacing: -0.04em; }
			p { margin: 20px 0 0; font-size: 15px; line-height: 1.75; color: #6f6569; word-break: keep-all; }
			.divider { height: 1px; margin: 32px 0; background: #eee8ea; }
			a.primary { display: flex; min-height: 52px; align-items: center; justify-content: center; background: #8b0029; color: #fff; font-size: 15px; font-weight: 800; text-decoration: none; }
			a.primary:focus-visible { outline: 3px solid rgba(139, 0, 41, .25); outline-offset: 3px; }
			.address { margin-top: 14px; text-align: center; font-size: 13px; color: #9b9195; }
			a.secondary { display: flex; min-height: 48px; margin-top: 20px; align-items: center; justify-content: center; border-top: 1px solid #eee8ea; color: #81767a; font-size: 13px; font-weight: 700; text-decoration: none; }
			a.secondary:focus-visible { outline: 3px solid rgba(139, 0, 41, .18); outline-offset: 3px; }
		</style>
	</head>
	<body>
		<main>
			<section aria-labelledby="migration-title">
				<div class="brand"><img src="/icon.png" alt="" /><span>골라바유 V2</span></div>
				<h1 id="migration-title">골라바유가 새 주소로 이전했어요</h1>
				<p>골라바유 V2 운영을 종료하고 새로운 서비스로 이전했습니다.<br />아래 버튼을 눌러 새 골라바유를 이용해 주세요.</p>
				<div class="divider"></div>
				<a class="primary" href="${NEW_SERVICE_URL}">새 골라바유로 이동</a>
				<div class="address">golabau.com</div>
				<a class="secondary" href="/my">V2 계정 탈퇴</a>
			</section>
		</main>
	</body>
</html>`;

function isStaticAsset(pathname: string) {
	return pathname.startsWith('/_app/') || /\/[^/]+\.[a-z0-9]+$/i.test(pathname);
}

function isAccountDeletionPath(pathname: string) {
	return pathname === '/my' || pathname === '/login' || pathname.startsWith('/auth/');
}

export function createLegacyShutdownResponse(request: Request): Response | null {
	if (request.method !== 'GET' && request.method !== 'HEAD') return null;

	const pathname = new URL(request.url).pathname;
	if (isAccountDeletionPath(pathname)) return null;
	if (isStaticAsset(pathname)) return null;

	const acceptsHtml = request.headers.get('accept')?.includes('text/html') ?? false;
	const isDocumentNavigation = request.headers.get('sec-fetch-dest') === 'document';
	if (!acceptsHtml && !isDocumentNavigation) return null;

	return new Response(request.method === 'HEAD' ? null : SHUTDOWN_PAGE, {
		status: 200,
		headers: {
			'Cache-Control': 'public, max-age=300',
			'Content-Type': 'text/html; charset=utf-8',
			'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
			'Referrer-Policy': 'no-referrer',
			'X-Content-Type-Options': 'nosniff',
			'X-Frame-Options': 'DENY',
			'X-Robots-Tag': 'noindex, nofollow'
		}
	});
}
