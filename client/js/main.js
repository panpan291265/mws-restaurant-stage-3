/**
 * Register service worker
 */
(function registerServiceWorker() {
  if (navigator.serviceWorker) {
    navigator.serviceWorker
      .register('serviceWorker.min.js')
      .then(() => {
        // console.log('Service worker registered successfully.');
      })
      .catch(err => {
        console.error('Error registering service worker:', err);
      });
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

  const itemContainer = document.createElement('div');
  itemContainer.className = 'restaurant-list-item-container';
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

  const name = document.createElement('h2');
  name.className = 'restaurant-name';
  name.innerHTML = restaurant.name;
  name.setAttribute('tabindex', '0');
  container2.append(name);

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

  const moreContainer = document.createElement('div');
  moreContainer.className = 'restaurant-more-container';
  container2.append(moreContainer);
  const more = document.createElement('a');
  more.className = 'restaurant-more';
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.setAttribute('aria-label', `${restaurant.name} more details`);
  moreContainer.append(more);

  return li;
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
