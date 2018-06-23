const cachePrefix = 'resto-revs';
const cacheVersion = 'v0001';
const cacheName = `${cachePrefix}-${cacheVersion}`;
const apiServer = 'http://localhost:1337';

self.addEventListener('install', event => {
  // console.log('Service worker install event handler called :', event);

  event.waitUntil(
    caches
      .open(cacheName)
      .then(function(cache) {
        // Cache main application resources
        let requests = [
          'index.html',
          'restaurant.html',
          'restaurant_review.html',
          'unavailable.html',
          'img/restaurant-128.png',
          'img/restaurant-256.png',
          'img/restaurant-512.png',
          'img/restaurant.png',
          'css/styles.common.css',
          'css/styles.common.min.css',
          'css/styles.index.css',
          'css/styles.index.min.css',
          'css/styles.restaurant.css',
          'css/styles.restaurant.min.css',
          'css/styles.restaurant_review.css',
          'css/styles.restaurant_review.min.css',
          'js/idb.js',
          'js/idb.min.js',
          'js/urlhelper.js',
          'js/urlhelper.min.js',
          'js/dbhelper.js',
          'js/dbhelper.min.js',
          'js/main.js',
          'js/main.min.js',
          'js/restaurant_info.js',
          'js/restaurant_info.min.js',
          'js/restaurant_review.js',
          'js/restaurant_review.min.js'
        ];

        const dataImgSuffs = ['', '-200', '-300', '-400', '-500', '-600'];
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'image-not-found'].forEach(imageFileName => {
          dataImgSuffs.forEach(imgSuffix => requests.push(`img/${imageFileName}${imgSuffix}.jpg`));
        });
        return cache.addAll(requests).then(() => self.skipWaiting());
      })
      .catch(err => console.error(err))
  );
});

self.addEventListener('activate', event => {
  // console.log('Service worker activate event handler called :', event);
  // event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  let cacheKey = event.request.url;
  if (cacheKey.startsWith(apiServer)) return fetch(event.request);
  const responsePromise = new Promise((resolve, reject) => {
    caches.open(cacheName).then(cache => {
      cache.match(cacheKey).then(cachedResponse => {
        if (cachedResponse) return resolve(cachedResponse);
        fetch(event.request)
          .then(networkResponse => {
            // console.log(`Adding new cache item: '${cacheKey}'`);
            cache.put(cacheKey, networkResponse.clone());
            return resolve(networkResponse);
          })
          .catch(err => {
            if (
              event.request.url.includes('restaurant.html?id=') ||
              event.request.url.includes('restaurant_review.html?id=')
            ) {
              cache.match('unavailable.html').then(unavailableResponse => {
                return resolve(unavailableResponse);
              });
            } else {
              return reject(err);
            }
          });
      });
    });
  });
  event.respondWith(responsePromise);
});

self.addEventListener('sync', event => {
  if (event.tag.startsWith('sync-')) {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage({ id: 'synchronize-data', tag: event.tag }));
    });
  }
});

self.addEventListener('message', event => {
  if (event.data.action === 'cacheRestaurantSites') {
    if (event.data.restaurants && event.data.restaurants.length > 0) {
      caches.open(cacheName).then(function(cache) {
        let requests = [];
        event.data.restaurants.forEach(r => {
          requests.push(`restaurant.html?id=${r.id}`);
          requests.push(`restaurant_review.html?id=${r.id}`);
        });
        cache.addAll(requests);
      });
    }
  }
});
