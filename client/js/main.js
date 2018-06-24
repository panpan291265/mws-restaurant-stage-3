/**
 * Register service worker
 */
(function registerServiceWorker() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    connection.addEventListener('change', () => {
      // console.log('connection:', connection);
      if (connection.effectiveType && connection.downlink > 0) {
        DBHelper.registerDataSync();
      }
    });
  }

  if (navigator.serviceWorker) {
    navigator.serviceWorker
      .register('serviceWorker.min.js')
      .then(() => {
        // console.log('Service worker registered successfully.');
      })
      .catch(err => {
        console.error('Error registering service worker:', err);
      });
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.id === 'synchronize-data') {
        DBHelper.synchronizeData()
          .then(refresh => {
            if (refresh) {
              updateRestaurants();
            }
          })
          .catch(err => {
            console.error('Error synchronizing data:', err);
          });
      }
    });
    DBHelper.registerDataSync();
  }
})();

/**
 * Initialize focus on window load.
 */
window.addEventListener('load', event => {
  initalizeFocus();
});

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', event => {
  fetchData();
});

/**
 * Initialize focus
 */
initalizeFocus = () => {
  const filterOptionsTitle = document.querySelector('.filter-options h2');
  filterOptionsTitle.focus();
  filterOptionsTitle.setAttribute('tabindex', '0');
};

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) {
      // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) {
      // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');
  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Fetch data
 */
fetchData = () => {
  DBHelper.fetchRestaurants((error, restaurants) => {
    // console.log(restaurants);
    DBHelper.fetchReviews((error, reviews) => {
      // console.log(reviews);
      /*
      restaurants.forEach(r => {
        DBHelper.fetchRestaurantReviews(r.id, (error, restaurantReviews) => {
          r.reviews = restaurantReviews;
        });
      });
      */
    }, true);
    fetchNeighborhoods();
    fetchCuisines();
  }, true);
};

/**
 * Initialize Google map, called from HTML.
 */
window.initMainMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    // Cache all fetced restaurants sites preactivelly
    if (
      !error &&
      restaurants &&
      restaurants.length > 0 &&
      navigator.serviceWorker &&
      navigator.serviceWorker.controller
    ) {
      navigator.serviceWorker.controller.postMessage({
        action: 'cacheRestaurantSites',
        restaurants: restaurants
      });
    }

    const ul = document.getElementById('restaurants-list');
    ul.innerHTML = '';
    if (error) {
      // Got an error!
      console.error(error);
      ul.innerHTML = `<h3 style="color: red; margin: 32px auto;">
        An error occured while fetching data
      </h3>`;
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  });
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = restaurants => {
  // Remove all restaurants
  self.restaurants = restaurants;
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers && self.markers.length > 0) self.markers.forEach(m => m.setMap(null));
  self.markers = [];
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  resumeMap();
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = restaurant => {
  const li = document.createElement('li');

  const isFavorite = DBHelper.isFavoriteRestaurant(restaurant);

  const itemContainer = document.createElement('div');
  itemContainer.id = `restaurant-container-${restaurant.id}`;
  itemContainer.className = `restaurant-list-item-container${isFavorite ? ' favorite' : ''}`;
  li.append(itemContainer);

  const container1 = document.createElement('div');
  container1.className = 'container1';
  itemContainer.append(container1);

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.alt = `${restaurant.name} restaurant photograph`;
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.setAttribute(
    'srcset',
    `${DBHelper.imageUrlForRestaurant(restaurant, '-200')} 200w` +
      `,${DBHelper.imageUrlForRestaurant(restaurant, '-300')} 300w` +
      `,${DBHelper.imageUrlForRestaurant(restaurant, '-400')} 400w` +
      `,${DBHelper.imageUrlForRestaurant(restaurant, '-500')} 500w` +
      `,${DBHelper.imageUrlForRestaurant(restaurant, '-600')} 600w`
  );
  image.setAttribute('sizes', '(min-width: 600px) 200px');
  container1.append(image);

  const container2 = document.createElement('div');
  container2.className = 'container2';
  itemContainer.append(container2);

  const container3 = document.createElement('div');
  container3.className = 'container3';
  container2.append(container3);

  const favoriteImage = document.createElement('img');
  favoriteImage.className = 'favorite-Image';
  favoriteImage.alt = 'Is favorite';
  favoriteImage.src = UrlHelper.getUrl('img/gold-medal-32.png');
  container3.append(favoriteImage);

  const name = document.createElement('h2');
  name.className = 'restaurant-name';
  name.innerHTML = restaurant.name;
  name.setAttribute('tabindex', '0');
  container3.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.className = 'restaurant-neighborhood';
  neighborhood.innerHTML = restaurant.neighborhood;
  neighborhood.setAttribute('tabindex', '0');
  container2.append(neighborhood);

  const address = document.createElement('p');
  address.className = 'restaurant-address';
  address.innerHTML = restaurant.address;
  address.setAttribute('tabindex', '0');
  container2.append(address);

  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'restaurant-buttons-container';
  container2.append(buttonsContainer);

  const moreContainer = document.createElement('div');
  moreContainer.className = 'restaurant-more-container';
  buttonsContainer.append(moreContainer);
  const more = document.createElement('a');
  more.className = 'restaurant-more';
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute('aria-label', `${restaurant.name} more details`);
  moreContainer.append(more);

  const favButton = document.createElement('button');
  favButton.className = 'restaurant-fav-button';
  favButton.innerHTML = `<img alt='Make favorite' src='${UrlHelper.getUrl('img/gold-medal-32.png')}' />`;
  favButton.title = 'Make favorite';
  favButton.onclick = event => {
    toggleFavoriteRestaurant(restaurant);
  };
  buttonsContainer.append(favButton);

  const reviewButton = document.createElement('button');
  reviewButton.className = 'restaurant-write-review-button';
  reviewButton.innerHTML = `<img alt='Write a review' src='${UrlHelper.getUrl('img/write-32.png')}' />`;
  reviewButton.title = 'Write a review';
  reviewButton.onclick = event => {
    reviewRestaurant(restaurant);
  };
  buttonsContainer.append(reviewButton);

  return li;
};

toggleFavoriteRestaurant = restaurant => {
  DBHelper.toggleFavoriteRestaurant(restaurant, (error, restaurant) => {
    if (error) return console.log(error);
    const li = document.querySelector(`#restaurants-list #restaurant-container-${restaurant.id}`);
    const isFavorite = DBHelper.isFavoriteRestaurant(restaurant);
    if (isFavorite) li.classList.add('favorite');
    else li.classList.remove('favorite');
  });
};

reviewRestaurant = restaurant => {
  const url = DBHelper.urlForRestaurantReview(restaurant);
  UrlHelper.goToUrl(url);
};

/**
 * Resume map.
 */
resumeMap = () => {
  /*
  const mapContainer = document.querySelector('#map-container');
  const mapElement = mapContainer.querySelector('#map-container #map');
  mapContainer.style.height = 0;
  mapElement.style.visibility = 'hidden';
  google.maps.event.addListener(self.map, 'tilesloaded', event => {
    mapContainer.style.height = 'auto';
    mapElement.style.visibility = 'visible';
    addMarkersToMap();
  });
  */
  addMarkersToMap();
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  if (self.map) {
    restaurants.forEach(restaurant => {
      // Add marker to the map
      const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
      google.maps.event.addListener(marker, 'click', () => {
        window.location.href = marker.url;
      });
      self.markers.push(marker);
    });
  }
};
