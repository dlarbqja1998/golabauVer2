import app from '../.svelte-kit/cloudflare/_worker.js';
import { refreshTodayMenuCache } from '../src/lib/server/menu-cache';

type WorkerEnv = {
    ASSETS: {
        fetch: typeof fetch;
    };
    GOLABAU_CACHE: KVNamespace;
};

export default {
    fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
        return app.fetch(request, env, ctx);
    },

    async scheduled(controller: ScheduledController, env: WorkerEnv, ctx: ExecutionContext) {
        const refreshPromise = refreshTodayMenuCache({
            env: { GOLABAU_CACHE: env.GOLABAU_CACHE },
            context: ctx
        }).then((result) => {
            console.log(`menu refresh cron=${controller.cron} status=${result.status}`);
            if (result.status === 'failed') {
                console.error(`menu refresh failed cron=${controller.cron} reason=${result.reason}`);
            }
        });

        ctx.waitUntil(refreshPromise);
        await refreshPromise;
    }
};
