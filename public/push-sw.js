// Push notification handlers, imported into the generated service worker.
// Paths are relative to the app's scope so this works at "/" and at "/<repo>/" (GitHub Pages).
const scopeUrl = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'LC Daily', {
      body: data.body || "Today's topics are ready.",
      icon: scopeUrl('icon-192.png'),
      badge: scopeUrl('icon-192.png'),
      tag: 'lc-daily-morning',
      data: { url: self.registration.scope },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
