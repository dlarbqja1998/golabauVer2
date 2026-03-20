import type { PageServerLoad } from './$types';
import { getVisibleNotices } from '$lib/data/notices';

export const load: PageServerLoad = async () => {
	return {
		notices: getVisibleNotices()
	};
};
