/**
 * Common database helper functions.
 */

const dbVersion = 1;
let dbPromise = null;
let syncCounter = 0;

class DBHelper {
  /**
   * API Data Services URL.
   */
  static get DATASERVICES_URL() {
    const apiServer = 'http://localhost:1337';
    return apiServer;
  }

  /**
   * Restaurants Data Service URL.
   */
  static get DATASERVICE_RESTAURANTS_URL() {
    const dataserviceUrl = `${DBHelper.DATASERVICES_URL}/restaurants`;
    return dataserviceUrl;
  }

  /**
   * Reviews Data Service URL.
   */
  static get DATASERVICE_REVIEWS_URL() {
    const dataserviceUrl = `${DBHelper.DATASERVICES_URL}/reviews`;
    return dataserviceUrl;
  }

  /**
   * Open IndexedDB restorevs database
   */
  static openDB() {
    return idb.open('restorevs', dbVersion, upgradeDb => {
      var storeRestaurants = upgradeDb.createObjectStore('restaurants', {
        keyPath: 'id'
      });
      var storeReviews = upgradeDb.createObjectStore('reviews', {
        keyPath: 'id'
      });
    });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback, reloadFromService = false) {
    dbPromise
      .then(db => {
        db.transaction('restaurants')
          .objectStore('restaurants')
          .getAll()
          .then(localRestaurants => {
            if (callback) {
              callback(null, localRestaurants);
            }
            if (reloadFromService) {
              fetch(DBHelper.DATASERVICE_RESTAURANTS_URL)
                .then(response => response.json())
                .then(restaurants => {
                  const tx = db.transaction('restaurants', 'readwrite');
                  tx.objectStore('restaurants')
                    .clear()
                    .then(() => {
                      restaurants.forEach(r => {
                        tx.objectStore('restaurants').put(r);
                      });
                    });
                  if (callback) {
                    callback(null, restaurants);
                  }
                })
                .catch(err => {
                  console.log(err);
                  if (callback) {
                    callback(null, localRestaurants);
                  }
                });
            }
          });
      })
      .catch(err => {
        if (callback) {
          callback(err);
        } else {
          console.log(err);
        }
      });
  }

  /**
   * Fetch all reviews.
   */
  static fetchReviews(callback, reloadFromService = false) {
    dbPromise
      .then(db => {
        db.transaction('reviews')
          .objectStore('reviews')
          .getAll()
          .then(localReviews => {
            if (callback) {
              callback(null, localReviews);
            }
            if (reloadFromService) {
              fetch(DBHelper.DATASERVICE_REVIEWS_URL)
                .then(response => response.json())
                .then(reviews => {
                  const tx = db.transaction('reviews', 'readwrite');
                  tx.objectStore('reviews')
                    .clear()
                    .then(() => {
                      reviews.forEach(r => {
                        tx.objectStore('reviews').put(r);
                      });
                    });
                  if (callback) {
                    callback(null, reviews);
                  }
                })
                .catch(err => {
                  console.log(err);
                  if (callback) {
                    callback(null, localReviews);
                  }
                });
            }
          });
      })
      .catch(err => {
        if (callback) {
          callback(err);
        } else {
          console.log(err);
        }
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    dbPromise.then(db => {
      if (id) {
        try {
          id = parseInt(id);
        } catch (ex) {
          console.log(ex);
          id = null;
        }
      }
      db.transaction('restaurants')
        .objectStore('restaurants')
        .get(id)
        .then(restaurant => {
          if (restaurant) {
            DBHelper.fetchRestaurantReviews(restaurant.id, (error, restaurantReviews) => {
              restaurant.reviews = restaurantReviews;
              if (callback) callback(null, restaurant);
            });
          } else {
            callback(`Restaurant with id '${id}' could not be found.`, null);
          }
        })
        .catch(err => {
          if (callback) callback(err, null);
          else console.log(err);
        });
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantReviews(restaurantId, callback) {
    dbPromise.then(db => {
      if (restaurantId) {
        try {
          restaurantId = parseInt(restaurantId);
        } catch (ex) {
          console.log(ex);
          restaurantId = null;
        }
      }
      db.transaction('reviews')
        .objectStore('reviews')
        .getAll()
        .then(reviews => {
          if (reviews && reviews.length > 0) {
            reviews = reviews.filter(r => r.restaurant_id === restaurantId);
          }
          if (callback) {
            callback(null, reviews);
          }
        })
        .catch(err => {
          if (callback) callback(err, null);
          else console.log(err);
        });
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != 'all') {
          // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') {
          // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    dbPromise.then(db => {
      db.transaction('restaurants')
        .objectStore('restaurants')
        .getAll()
        .then(restaurants => {
          // Get all neighborhoods from all restaurants
          const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
          // Remove duplicates from neighborhoods
          const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
          if (callback) callback(null, uniqueNeighborhoods);
        })
        .catch(err => {
          if (callback) callback(err, null);
          else console.log(err);
        });
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    dbPromise.then(db => {
      db.transaction('restaurants')
        .objectStore('restaurants')
        .getAll()
        .then(restaurants => {
          // Get all cuisines from all restaurants
          const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
          // Remove duplicates from cuisines
          const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
          if (callback) callback(null, uniqueCuisines);
        })
        .catch(err => {
          if (callback) callback(err, null);
          else console.log(err);
        });
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return `${UrlHelper.ROOT_URL}restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant review page URL.
   */
  static urlForRestaurantReview(restaurant) {
    return `${UrlHelper.ROOT_URL}restaurant_review.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant, suffix = null) {
    let photoFileName = restaurant.photograph;
    if (!photoFileName) photoFileName = 'image-not-found';
    if (!photoFileName.endsWith('.jpg')) photoFileName += '.jpg';
    if (suffix) photoFileName = photoFileName.replace(/.jpg$/, `${suffix}.jpg`);
    return `${UrlHelper.ROOT_URL}img/${photoFileName}`;
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    });
    return marker;
  }

  static isFavoriteRestaurant(restaurant) {
    if (!restaurant) return false;
    return !!restaurant.is_favorite;
  }

  static toggleFavoriteRestaurant(restaurant, callback) {
    const isFavorite = !!DBHelper.isFavoriteRestaurant(restaurant);
    restaurant.is_favorite = !isFavorite;
    dbPromise.then(db => {
      const tx = db.transaction('restaurants', 'readwrite');
      const store = tx.objectStore('restaurants');
      store.put(restaurant);
      const urlFav = `${DBHelper.DATASERVICE_RESTAURANTS_URL}/${restaurant.id}?is_favorite=${restaurant.is_favorite}`;
      fetch(urlFav, { method: 'POST' })
        .catch(err => {
          console.log(err);
        });
      if (callback) callback(null, restaurant);
      DBHelper.registerDataSync();
      return tx.complete;
    });
  }

  static registerDataSync() {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.ready
        .then(registration => {
          return registration.sync.register(`sync-${++syncCounter}`);
        })
        .catch(err => {
          console.error('Error registering service worker:', err);
        });
    }
  }

  static synchronizeData() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection || !connection.effectiveType || connection.downlink <= 0) {
      console.log(`Network inactive, can not synchronizing data, exiting.`);
      return Promise.resolve(false);
    }
    console.log(`Network active, synchronizing data!`);
    return Promise.resolve(true);
  }
 
}

dbPromise = DBHelper.openDB();
