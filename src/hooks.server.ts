import type { Handle } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getUserBySessionId, isMeetupProfileComplete } from '$lib/server/user';
import { db } from '$lib/server/db';
import { users } from './db/schema';

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	const userAgent = event.request.headers.get('user-agent')?.toLowerCase() || '';

	const badPaths = ['.php', '.env', '.git', '/wp-admin', '/wp-login', '/admin.php', '/config'];
	if (badPaths.some((badPath) => path.includes(badPath))) {
		console.log(`[방화벽] 비정상 경로 차단: ${path}`);
		return new Response('Go away', { status: 403 });
	}

	const badAgents = ['curl', 'wget', 'python', 'postman', 'httpclient'];
	if (!userAgent || badAgents.some((badAgent) => userAgent.includes(badAgent))) {
		console.log(`[방화벽] 비정상 User-Agent 차단: ${userAgent}`);
		return new Response('Only humans allowed', { status: 403 });
	}

	if (path.startsWith('/_app') || path.includes('.')) {
		return resolve(event);
	}

	const protectedPaths = ['/my', '/write', '/auth', '/api', '/restaurant', '/golabassyu', '/meetup'];
	const isProtectedPath = protectedPaths.some((protectedPath) => path.startsWith(protectedPath));

	if (!isProtectedPath) {
		return resolve(event);
	}

	const sessionId = event.cookies.get('session_id');
	if (!sessionId) {
		return resolve(event);
	}

	const cachedUser = await getUserBySessionId(event.platform, sessionId);
	if (!cachedUser) {
		return resolve(event);
	}

	let resolvedUser = cachedUser;
	if (!cachedUser.isOnboarded) {
		const freshUser = await db.query.users.findFirst({
			where: eq(users.id, cachedUser.id)
		});

		if (freshUser) {
			resolvedUser = freshUser;
		}
	}

	if (resolvedUser.isBanned) {
		return new Response('차단된 사용자입니다.', { status: 403 });
	}

	event.locals.user = {
		id: resolvedUser.id,
		nickname: resolvedUser.nickname,
		email: resolvedUser.email,
		profileImg: resolvedUser.profileImg,
		badge: resolvedUser.badge,
		isOnboarded: resolvedUser.isOnboarded,
		role: resolvedUser.role,
		college: resolvedUser.college,
		department: resolvedUser.department,
		grade: resolvedUser.grade,
		gender: resolvedUser.gender,
		kakaoId: resolvedUser.kakaoId,
		instaId: resolvedUser.instaId
	};

	const isAllowedPath = path === '/register' || path.startsWith('/auth') || path === '/login';
	if (!resolvedUser.isOnboarded && !isAllowedPath) {
		return new Response(null, {
			status: 303,
			headers: { location: '/register' }
		});
	}

	if (path.startsWith('/meetup') && !isMeetupProfileComplete(resolvedUser)) {
		return new Response(null, {
			status: 303,
			headers: { location: '/my?error=meetup_profile' }
		});
	}

	return resolve(event);
};
