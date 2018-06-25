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
            callback(`Restaurant with id '${id}' could not be found.`);
          }
        })
        .catch(err => {
          if (callback) callback(err);
          else console.log(err);
        });
    });
  }

  /**
   * Fetch a review by its ID.
   */
  static fetchReviewById(id, callback) {
    dbPromise.then(db => {
      if (id) {
        try {
          id = parseInt(id);
        } catch (ex) {
          console.log(ex);
          id = null;
        }
      }
      db.transaction('reviews')
        .objectStore('reviews')
        .get(id)
        .then(review => {
          if (review) {
            if (callback) callback(null, review);
          } else {
            callback(`Review with id '${id}' could not be found.`);
          }
        })
        .catch(err => {
          if (callback) callback(err);
          else console.log(err);
        });
    });
  }

  /**
   * Fetch restaurant reviews by restaurant Id.
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
            // sort reviews by updatedAt, createdAt descending
            reviews.sort((a, b) => {
              if (a.updatedAt < b.updatedAt) {
                return 1;
              } else if (a.updatedAt > b.updatedAt) {
                return -1;
              } else {
                if (a.createdAt < b.createdAt) {
                  return 1;
                } else if (a.createdAt > b.createdAt) {
                  return -1;
                } else {
                  return 0;
                }
              }
            });
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
  static urlForRestaurantReview(restaurant, review) {
    let url = `${UrlHelper.ROOT_URL}restaurant_review.html?restaurant_id=${restaurant.id}`;
    if (review)
      url += `&review_id=${review.id}`;
    return url;
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
    if (restaurant.is_favorite && restaurant.is_favorite.toString().toLowerCase() === 'true') {
      return true;
    } else {
      return false;
    }
  }

  static toggleFavoriteRestaurant(restaurant, callback) {
    const isFavorite = DBHelper.isFavoriteRestaurant(restaurant);
    restaurant.is_favorite = !isFavorite;
    restaurant.updatedAt = new Date().toISOString();
    dbPromise.then(db => {
      const tx = db.transaction('restaurants', 'readwrite');
      const store = tx.objectStore('restaurants');
      store.put(restaurant);
      /*
      const urlFav = `${DBHelper.DATASERVICE_RESTAURANTS_URL}/${restaurant.id}?is_favorite=${restaurant.is_favorite}`;
      fetch(urlFav, { method: 'PUT' }).catch(err => {
        console.log(err);
      });
      */
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
      // console.log(`Network inactive, can not synchronizing data, exiting.`);
      return Promise.resolve(false);
    }
    // console.log(`Network active, synchronizing data!`);
    return DBHelper.synchronizeRestaurants()
      .then(() => DBHelper.synchronizeRestaurantReviews())
      .then(() => true)
      .catch(err => {
        console.log(err);
        return false;
      });
  }

  static synchronizeRestaurants() {
    return fetch(DBHelper.DATASERVICE_RESTAURANTS_URL)
      .then(response => response.json())
      .then(restaurants => {
        return dbPromise
          .then(db => {
            let tasks = [];
            const tx = db.transaction('restaurants', 'readwrite');
            return tx
              .objectStore('restaurants')
              .getAll()
              .then(localRestaurants => {
                localRestaurants.forEach(localRestaurant => {
                  const restaurant = restaurants.find(x => x.id === localRestaurant.id);
                  const restaurantUpdatedAtDT = new Date(restaurant.updatedAt);
                  const localRestaurantUpdatedAtDT = new Date(localRestaurant.updatedAt);
                  if (restaurantUpdatedAtDT > localRestaurantUpdatedAtDT) {
                    console.log(`updating local restaurant ${localRestaurant.id} - ${localRestaurant.name}`);
                    tx.objectStore('restaurants').put(restaurant);
                  } else if (restaurantUpdatedAtDT < localRestaurantUpdatedAtDT) {
                    console.log(`updating server restaurant ${restaurant.id} - ${restaurant.name}`);
                    tasks.push(
                      fetch(
                        `${DBHelper.DATASERVICE_RESTAURANTS_URL}/${
                          restaurant.id
                        }?is_favorite=${!!localRestaurant.is_favorite}`,
                        {
                          method: 'PUT'
                        }
                      )
                    );
                  }
                });
                return tx.complete.then(() => {
                  if (tasks && tasks.length > 0) {
                    return Promise.all(tasks);
                  } else {
                    return Promise.resolve();
                  }
                });
              });
          })
          .catch(err => {
            console.log(err);
            return Promise.reject(err);
          });
      })
      .catch(err => {
        console.log(err);
        return Promise.reject(err);
      });
  }

  static synchronizeRestaurantReviews() {
    return fetch(DBHelper.DATASERVICE_REVIEWS_URL)
      .then(response => response.json())
      .then(reviews => {
        return dbPromise
          .then(db => {
            let tasks = [];
            const tx = db.transaction('reviews', 'readwrite');
            tx.objectStore('reviews')
              .getAll()
              .then(localReviews => {
                localReviews.forEach(localReview => {
                  const review = reviews.find(x => x.id === localReview.id);
                  if (!review) {
                    if (DBHelper.isLocalReview(localReview)) {
                      tasks.push(
                        fetch(DBHelper.DATASERVICE_REVIEWS_URL, {
                          method: 'POST',
                          headers: {
                            'content-type': 'application/json'
                          },
                          body: {
                            restaurant_id: localReview.restaurant_id,
                            name: localReview.name,
                            rating: localReview.rating,
                            comments: localReview.comments
                          }
                        })
                      );
                    } else {
                      tx.objectStore('reviews').delete(localReview.id);
                    }
                  } else {
                    if (review.updatedAt > localReview.updatedAt) {
                      tx.objectStore('reviews').put(review);
                    } else if (review.updatedAt < localReview.updatedAt) {
                      tasks.push(
                        fetch(`${DBHelper.DATASERVICE_REVIEWS_URL}/${review.id}`, {
                          method: 'PUT',
                          headers: {
                            'content-type': 'application/json'
                          },
                          body: {
                            name: localReview.name,
                            rating: localReview.rating,
                            comments: localReview.comments
                          }
                        })
                      );
                    }
                  }
                });
                reviews.forEach(review => {
                  const localReview = localReviews.find(x => x.id === review.id);
                  if (!localReview) {
                    tasks.push(
                      fetch(`${DBHelper.DATASERVICE_REVIEWS_URL}/${review.id}`, {
                        method: 'DELETE'
                      })
                    );
                  }
                });
                return tx.complete.then(() => {
                  let serverTasksPromise = null;
                  if (tasks && tasks.length > 0) {
                    serverTasksPromise = Promise.all(tasks);
                  } else {
                    serverTasksPromise = Promise.resolve();
                  }
                  return serverTasksPromise.then(() => {
                    const tx2 = db.transaction('reviews', 'readwrite');
                    tx2.objectStore('reviews')
                      .getAll()
                      .then(localReviews => {
                        localReviews.forEach(localReview => {
                          if (DBHelper.isLocalReview(localReview)) {
                            tx2.objectStore('reviews').delete(localReview.id);
                          }
                        });
                      });
                    return tx2.complete;
                  });
                });
              });
          })
          .catch(err => {
            console.log(err);
            return Promise.reject(err);
          });
      })
      .catch(err => {
        console.log(err);
        return Promise.reject(err);
      });
  }

  static isLocalReview(review) {
    if (!review)
      throw new Error('isLocalReview: invalid review object!');
    if (!review.id || review.id < 0)
      return true;
    else
      return false;      
  }

  static getNewReview(restaurant = null) {
    let lastLocalReviewId = localStorage.getItem('lastLocalReviewId');
    if (lastLocalReviewId === undefined || lastLocalReviewId === null)
      lastLocalReviewId = 0;
    else
      lastLocalReviewId = parseInt(lastLocalReviewId);
    const review = {
      id: --lastLocalReviewId,
      restaurant_id: restaurant ? restaurant.id : null,
      name: null,
      rating: 0,
      comments: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    localStorage.setItem('lastLocalReviewId', lastLocalReviewId);
    return review;
  }

  static saveReview(review) {
    if (!review)
      return Promise.reject('saveReview: invalid review object!');
    if (!review.restaurant_id)
      return Promise.reject('saveReview: restaurant id field is required!');
    if (!review.name)
      return Promise.reject('saveReview: review name field is required!');
    if (review.rating === undefined || review.rating === null)
      return Promise.reject('saveReview: review rating field is required!');
    if (review.rating < 0 || review.rating > 5)
      return Promise.reject('saveReview: review rating field must have a value between 0 and 5!');
    if (!review.comments)
      return Promise.reject('saveReview: review comments field is required!');
    return dbPromise
      .then(db => {
        const tx = db.transaction('reviews', 'readwrite');
        tx.objectStore('reviews').put(review);
        // DBHelper.registerDataSync();
        return tx.complete;
      });
  }

  static deleteReview(review) {
    if (!review)
      return Promise.reject('saveReview: invalid review object!');
    return dbPromise
      .then(db => {
        const tx = db.transaction('reviews', 'readwrite');
        tx.objectStore('reviews').delete(review.id);
        // DBHelper.registerDataSync();
        return tx.complete;
      });
  }

}

dbPromise = DBHelper.openDB();
