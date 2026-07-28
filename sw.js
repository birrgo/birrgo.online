// 1. Third-Party Provider Configuration
self.options = {
    "domain": "5gvci.com",
    "zoneId": 11364696
};
self.lary = "";
importScripts('https://5gvci.com/act/files/service-worker.min.js?r=sw');


// 2. Custom Push Listener
// This forces your logo and 96x96 bell badge for your own push notifications
self.addEventListener('push', function(event) {
  let data = { title: 'Birr Go', body: 'You have a new notification!' };
  
  // Try to parse incoming push data
  if (event.data) {
    try {
      const parsedData = event.data.json();
      data.title = parsedData.title || data.title;
      data.body = parsedData.body || data.body;
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon.png',         // Your colorful 192x192 logo
    badge: '/badge-icon.png',  // Your 96x96 transparent monochrome bell
    vibrate: [100, 50, 100],   // Optional: Makes the phone vibrate
    data: {
      url: '/'                 // Where to go when tapped
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});


// 3. Notification Click Handler
// This ensures that when a user taps the notification, it opens your PWA
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Close the notification

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If the app is already open in the background, bring it to the front
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url === self.registration.scope && 'focus' in client) {
          return client.focus();
        }
      }
      // If the app is closed, open a new window with your PWA
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
