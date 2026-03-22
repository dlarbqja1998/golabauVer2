import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { deleteKVCache } from '$lib/server/cache';
import { getUserBySessionId, getUserCacheKey } from '$lib/server/user';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ cookies }) => {
	const sessionId = cookies.get('session_id');
	if (!sessionId) throw redirect(303, '/login');

	const user = await getUserBySessionId(undefined, sessionId);
	if (!user) throw redirect(303, '/login');
	if (user.isOnboarded) throw redirect(303, '/my');

	return { user };
};

export const actions: Actions = {
	default: async ({ request, cookies, platform }) => {
		const sessionId = cookies.get('session_id');
		if (!sessionId) throw redirect(303, '/login');

		const sessionUser = await getUserBySessionId(platform, sessionId);
		if (!sessionUser) throw redirect(303, '/login');

		const formData = await request.formData();
		const nickname = formData.get('nickname')?.toString().trim() ?? '';
		const college = formData.get('college')?.toString().trim() ?? '';
		const department = formData.get('department')?.toString().trim() ?? '';
		const grade = formData.get('grade')?.toString().trim() ?? '';
		const birthYearValue = formData.get('birthYear')?.toString().trim() ?? '';
		const gender = formData.get('gender')?.toString().trim() ?? '';
		const contactType = formData.get('contactType')?.toString().trim() ?? '';
		const contactValue = formData.get('contactValue')?.toString().trim() ?? '';
		const agreePrivacy = formData.get('agreePrivacy')?.toString().trim() ?? '';

		const submittedValues = {
			nickname,
			college,
			department,
			grade,
			birthYear: birthYearValue,
			gender,
			contactType,
			contactValue,
			agreePrivacy
		};

		if (!nickname || nickname.length > 10) {
			return fail(400, {
				message: '닉네임은 1글자 이상 10글자 이하로 입력해 주세요.',
				...submittedValues
			});
		}

		const validGrades = new Set(['1학년', '2학년', '3학년', '4학년', '5학년 이상', '졸업생', '기타']);
		if (!validGrades.has(grade)) {
			return fail(400, {
				message: '학년을 선택해 주세요.',
				...submittedValues
			});
		}

		const birthYear = Number(birthYearValue);
		if (!birthYearValue || Number.isNaN(birthYear) || birthYear < 1950 || birthYear > new Date().getFullYear()) {
			return fail(400, {
				message: '출생연도를 올바르게 선택해 주세요.',
				...submittedValues
			});
		}

		if (gender !== 'male' && gender !== 'female') {
			return fail(400, {
				message: '성별을 선택해 주세요.',
				...submittedValues
			});
		}

		if (agreePrivacy !== 'yes') {
			return fail(400, {
				message: '개인정보 수집 및 이용에 동의해 주세요.',
				...submittedValues
			});
		}

		if ((college && !department) || (!college && department)) {
			return fail(400, {
				message: '소속을 입력하려면 단과대학과 학부(과)를 모두 선택해 주세요.',
				...submittedValues
			});
		}

		if ((contactType && !contactValue) || (!contactType && contactValue)) {
			return fail(400, {
				message: '연락처를 입력하려면 수단과 값을 함께 입력해 주세요.',
				...submittedValues
			});
		}

		if (contactType && contactType !== 'kakao' && contactType !== 'insta') {
			return fail(400, {
				message: '연락처 수단이 올바르지 않습니다.',
				...submittedValues
			});
		}

		await db
			.update(users)
			.set({
				nickname,
				college: college || null,
				department: department || null,
				grade,
				gender,
				birthYear,
				kakaoId: contactType === 'kakao' && contactValue ? contactValue : null,
				instaId: contactType === 'insta' && contactValue ? contactValue : null,
				isOnboarded: true
			})
			.where(eq(users.id, sessionUser.id));

		await deleteKVCache(platform, getUserCacheKey(sessionUser.id));

		throw redirect(303, '/my');
	}
};
