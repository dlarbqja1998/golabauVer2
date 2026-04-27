import { env } from '$env/dynamic/private';

type KVMutationAction = 'write' | 'delete' | 'list';

type KVMutationDetails = {
    action: KVMutationAction;
    source: string;
    key: string;
    path?: string;
    userId?: number | string | null;
    note?: string;
};

function getCooldownSeconds() {
    const parsed = Number.parseInt(env.KV_ALERT_COOLDOWN_SECONDS || '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 15 * 60;
}

function getWebhookUrl() {
    return env.KV_ALERT_WEBHOOK_URL || env.DISCORD_WEBHOOK_URL || '';
}

function getAlertGroupKey(key: string) {
    if (/^restaurant_detail_\d+$/.test(key)) return 'restaurant_detail_*';
    if (/^user_likes_\d+$/.test(key)) return 'user_likes_*';
    if (/^user_eval_\d+_\d+$/.test(key)) return 'user_eval_*';
    if (/^post_comments_\d+$/.test(key)) return 'post_comments_*';
    if (/^meetup_room:\d+$/.test(key)) return 'meetup_room:*';
    return key;
}

function getCooldownKey(details: KVMutationDetails) {
    const raw = `${details.action}:${details.source}:${getAlertGroupKey(details.key)}`;
    const normalized = raw.replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 180);
    return `__kv_monitor_cooldown:${normalized}`;
}

async function sendKVMutationAlert(platform: App.Platform | undefined, details: KVMutationDetails) {
    const webhookUrl = getWebhookUrl();
    if (!webhookUrl) return;

    const kv = platform?.env?.GOLABAU_CACHE;
    if (kv) {
        const cooldownKey = getCooldownKey(details);
        const alreadySent = await kv.get(cooldownKey);
        if (alreadySent) return;

        await kv.put(cooldownKey, '1', {
            expirationTtl: getCooldownSeconds()
        });
    }

    const fields = [
        { name: 'action', value: details.action, inline: true },
        { name: 'source', value: details.source, inline: true },
        { name: 'group', value: getAlertGroupKey(details.key), inline: true },
        { name: 'key', value: details.key, inline: false }
    ];

    if (details.path) fields.push({ name: 'path', value: details.path, inline: true });
    if (details.userId) fields.push({ name: 'userId', value: String(details.userId), inline: true });
    if (details.note) fields.push({ name: 'note', value: details.note, inline: false });

    const payload = {
        username: 'golabau KV monitor',
        embeds: [
            {
                title: 'KV mutation detected',
                color: details.action === 'write' ? 16753920 : 15158332,
                fields,
                timestamp: new Date().toISOString()
            }
        ]
    };

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        console.error('KV monitor webhook failed:', response.status, await response.text());
    }
}

export function observeKVMutation(platform: App.Platform | undefined, details: KVMutationDetails) {
    const task = sendKVMutationAlert(platform, details).catch((error) => {
        console.error('KV monitor failed:', error);
    });

    if (platform?.context?.waitUntil) {
        platform.context.waitUntil(task);
    } else {
        void task;
    }
}
