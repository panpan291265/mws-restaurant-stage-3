/**
 * Register service worker
 */
/*
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
*/

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

resumeFavoriteRestaurant = restaurant => {
  const isFavorite = DBHelper.isFavoriteRestaurant(restaurant);
  const restaurantContainer = document.getElementById('restaurant-container');
  if (isFavorite)
    restaurantContainer.classList.add('favorite');
  else
    restaurantContainer.classList.remove('favorite');
  const favoriteImages = restaurantContainer.querySelectorAll('#restaurant-name-container img.favorite-image');
  if (favoriteImages && favoriteImages.length > 0) {
    favoriteImages.forEach(img => {
      if (isFavorite) {
        img.src = UrlHelper.getUrl('img/gold-medal-32.png');
        img.style.display = 'inline-block';
      }
      else {
        img.style.display = 'none';
        img.src = "";
      }
    });
  }
};

toggleFavoriteRestaurant = restaurant => {
  DBHelper.toggleFavoriteRestaurant(restaurant, (error, restaurant) => {
    if (error)
      return console.log(error);
    resumeFavoriteRestaurant(restaurant);
  });
};

reviewRestaurant = (restaurant, event) => {
  // alert(`Just write a review for '${restaurant.name}'`);
  event.preventDefault();
  event.stopPropagation();
  const url = DBHelper.urlForRestaurantReview(restaurant);
  setTimeout(() => UrlHelper.goToUrl(url), 0);
};

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) {
    callback(null, self.restaurant)
    return;
  }
  const id = UrlHelper.getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      if (error)
        return callback(error, null);
      if (!restaurant)
        return callback(`Restaurant with id '${id}' cound not be found!`, null);
      self.restaurant = restaurant;
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  resumeFavoriteRestaurant(restaurant);

  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const favoriteButton = document.querySelector('#restaurant-actions-container button.restaurant-fav-button');
  if (favoriteButton) {
    favoriteButton.onclick = event => {
      toggleFavoriteRestaurant(restaurant);
    };
    const favoriteImage = favoriteButton.querySelector('img');
    if (favoriteImage)
      favoriteImage.src = UrlHelper.getUrl('img/gold-medal-32.png');
  }

  const reviewButton = document.querySelector('#restaurant-actions-container button.restaurant-write-review-button');
  if (reviewButton) {
    reviewButton.onclick = event => {
      reviewRestaurant(restaurant, event);
    };
    const reviewImage = reviewButton.querySelector('img');
    if (reviewImage)
      reviewImage.src = UrlHelper.getUrl('img/write-32.png');
  }

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

  const actions = document.createElement('div');
  actions.classList.add('review-actions');
  const buttonEdit = document.createElement('button');
  buttonEdit.id = `review-edit-${review.id}`;
  buttonEdit.innerHTML = `<img alt='Edit review' src='${UrlHelper.getUrl('img/write-32.png')}' />`;
  buttonEdit.onclick = event => {
    editReview(review);
  };
  actions.appendChild(buttonEdit);
  const buttonDelete = document.createElement('button');
  buttonDelete.id = `review-delete-${review.id}`;
  buttonDelete.innerHTML = `<img alt='Delete review' src='${UrlHelper.getUrl('img/delete-32.png')}' />`;
  buttonDelete.onclick = event => {
    deleteReview(review);
  };
  actions.appendChild(buttonDelete);
  reviewHeader.appendChild(actions);

  const date = document.createElement('div');
  date.innerHTML = new Date(review.updatedAt).toLocaleString();
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

editReview = review => {
  const url = DBHelper.urlForRestaurantReview(self.restaurant, review);
  UrlHelper.goToUrl(url);
};

deleteReview = review => {
  const confirmDelete = confirm(`Do you really want to delete '${self.restaurant.name}' review no '${review.id}'?`);
  if (confirmDelete) {
    const url = DBHelper.urlForRestaurantReview(self.restaurant, review);
    alert(`Delete review '${review.id}' for restaurant '${self.restaurant.name}'\n${url}`);
  }
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumbList= document.querySelector('#breadcrumb ol');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumbList.appendChild(li);
}
