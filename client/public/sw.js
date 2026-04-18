// client/public/sw.js

self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: data.icon || '/logo1.png',
      badge: '/favicon.svg',
      vibrate: [100, 50, 100],
      data: {
        url: data.data?.url || '/'
      },
      actions: [
        { action: 'explore', title: 'Ver Inventario' },
        { action: 'close', title: 'Cerrar' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action !== 'close') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
