// client/public/sw.js

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activar inmediatamente
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim()); // Tomar control de todas las pestañas
});

self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: data.icon || '/logo1.png',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200],
      tag: 'sale-notification', // Evitar duplicados
      renotify: true,
      data: {
        url: data.data?.url || '/'
      },
      actions: [
        { action: 'explore', title: 'Ver Inventario' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Si hay una pestaña abierta, enfocarla
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
