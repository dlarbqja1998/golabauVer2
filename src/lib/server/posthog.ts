const POSTHOG_API_HOST = 'https://us.i.posthog.com';
const POSTHOG_PROJECT_KEY = 'phc_1cmMD5IMfSn3JjgyglhzUNuSEmS8dKdPj4s6GPDJTVN';

type PostHogProperties = Record<string, unknown>;

export async function captureServerEvent(
	event: string,
	distinctId: string,
	properties: PostHogProperties = {}
) {
	try {
		await fetch(`${POSTHOG_API_HOST}/capture/`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				api_key: POSTHOG_PROJECT_KEY,
				event,
				distinct_id: distinctId,
				properties: {
					$lib: 'server',
					...properties
				}
			})
		});
	} catch (error) {
		console.error(`PostHog server capture failed: ${event}`, error);
	}
}
