// =========================================================
//  [static/sw-push.js]
//  PWA 커스텀 푸시 알림 워커 로직
// =========================================================

self.addEventListener('push', (event) => {
    // 이벤트 데이터 파싱
    const data = event.data ? event.data.json() : {};
    const title = data.title || '골라바유 만나볼텨?';

    // 알림 옵션 설정
    const options = {
        body: data.body || '새로운 알림이 도착했습니다.',
        icon: '/icon.png', // manifest에 적은 아이콘과 동일하게
        badge: '/favicon.svg',
        data: { url: data.url || '/' }
    };

    // 알림 렌더링
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // 알림 닫기
    const urlToOpen = event.notification.data.url;

    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});