/**
 * Register service worker
 */
(function registerServiceWorker() {
  if (navigator.serviceWorker) {
    navigator.serviceWorker.register('serviceWorker.min.js')
      .then(() => {
        // console.log('Service worker registered successfully.');
      })
      .catch(err => {
        console.error('Error registering service worker:', err);
      })
  }
})();

/**
 * Initialize focus on window load.
 */
window.addEventListener('load', (event) => {
  initalizeFocus();
});

/**
 * Initialize focus
 */
initalizeFocus = () => {
  const filterOptionsTitle = document.querySelector('#restaurant-container h2');
  filterOptionsTitle.focus();
  filterOptionsTitle.setAttribute('tabIndex', '0');
}

/**
 * Initialize Google map, called from HTML.
 */
window.initRestaurantMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      const mapElement = document.getElementById('map');
      self.map = new google.maps.Map(mapElement, {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      resumeMap();
    }
  });
}

/**
 * Resume map.
 */
resumeMap = () => {
  /*
  const mapContainer = document.querySelector('.inside #map-container');
  const mapElement = mapContainer.querySelector('.inside #map-container #map');
  mapContainer.style.height = 0;
  mapElement.style.visibility = 'hidden';
  google.maps.event.addListener(self.map, 'tilesloaded', event => {
    mapContainer.style.height = 'auto';
    mapElement.style.visibility = 'visible';
    DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
  });
  */
  DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
};



/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.setAttribute('tabIndex', '0');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.alt = `${restaurant.name} restaurant photograph`;
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.setAttribute('srcset',
    `${DBHelper.imageUrlForRestaurant(restaurant, '-200')} 200w` +
    `,${DBHelper.imageUrlForRestaurant(restaurant, '-300')} 300w` +
    `,${DBHelper.imageUrlForRestaurant(restaurant, '-400')} 400w` +
    `,${DBHelper.imageUrlForRestaurant(restaurant, '-500')} 500w` +
    `,${DBHelper.imageUrlForRestaurant(restaurant, '-600')} 600w`);
  image.setAttribute('sizes',
    '(min-width: 620px) 40vw' +
    ',(min-width: 1024px) 47vw' +
    ',(min-width: 1300px) 44vw' +
    ',(min-width: 1400px) 42vw' +
    ',(min-width: 1500px) 40vw' +
    ',(min-width: 1600px) 38vw' +
    ',100vw');

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.setAttribute('tabIndex', '0');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  hours.setAttribute('tabindex', '0');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  title.setAttribute('tabIndex', '0');
  title.setAttribute('aria-label', `${self.restaurant.name} reviews`);
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');

  const reviewHeader = document.createElement('div');
  reviewHeader.classList.add('review-header');
  li.appendChild(reviewHeader);

  const name = document.createElement('div');
  name.innerHTML = review.name;
  name.classList.add('review-author');
  reviewHeader.appendChild(name);

  const date = document.createElement('div');
  date.innerHTML = review.date;
  date.classList.add('review-date');
  reviewHeader.appendChild(date);

  const reviewBody = document.createElement('div');
  reviewBody.classList.add('review-body');
  li.appendChild(reviewBody);

  const ratingContainer = document.createElement('div');
  ratingContainer.classList.add('review-rating-container');
  reviewBody.appendChild(ratingContainer);

  const rating = document.createElement('span');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.classList.add('review-rating');
  ratingContainer.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  rating.classList.add('review-comments');
  reviewBody.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumbList= document.querySelector('#breadcrumb ol');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumbList.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}