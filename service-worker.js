// Service Worker - service-worker.js

self.addEventListener('install', (event) => {
    console.log('Service Worker installing');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activating');
    event.waitUntil(clients.claim());
});

// Message handler - THIS is where your message handling goes
self.addEventListener('message', (event) => {
    console.log('Service Worker received message:', event.data);
    
    // Always send a response if the app is waiting for one
    if (event.ports && event.ports.length > 0) {
        event.ports[0].postMessage({
            success: true,
            data: 'Message received by service worker'
        });
    }
});

self.addEventListener('fetch', (event) => {
    // Handle fetch requests if needed
});