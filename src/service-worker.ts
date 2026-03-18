// =========================================================
//  [src/service-worker.ts]
//  PWA 백그라운드 워커 로직 (TypeScript 빨간 줄 해결 버전)
// =========================================================
/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

// 1. self를 ServiceWorkerGlobalScope로 강제 인식시켜 일반 Window 객체와의 충돌을 막습니다.
const sw = self as unknown as ServiceWorkerGlobalScope;

// 2. event에 PushEvent 타입을 명시하여 .data, .waitUntil 등의 에러를 해결합니다.
sw.addEventListener('push', (event: PushEvent) => {
    // 이벤트 데이터 파싱
    const data = event.data ? event.data.json() : {};
    const title = data.title || '골라바유 만나볼텨?';
    
    // 알림 옵션 설정
    const options = {
        body: data.body || '새로운 알림이 도착했습니다.',
        icon: '/icon.png', 
        badge: '/favicon.svg', 
        data: { url: data.url || '/' } 
    };

    // sw.registration.showNotification으로 알림 렌더링
    event.waitUntil(sw.registration.showNotification(title, options));
});

// 3. event에 NotificationEvent 타입을 명시하여 .notification 등의 에러를 해결합니다.
sw.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close(); // 알림 닫기
    const urlToOpen = event.notification.data.url;

    event.waitUntil(
        sw.clients.matchAll({ type: 'window' }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                // WindowClient로 타입 캐스팅
                const client = windowClients[i] as WindowClient;
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (sw.clients.openWindow) {
                return sw.clients.openWindow(urlToOpen);
            }
        })
    );
});