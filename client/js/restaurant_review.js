(function registerServiceWorker() {
  if (navigator.serviceWorker) {
    /*
    navigator.serviceWorker.register('serviceWorker.min.js')
      .then(() => {
        // console.log('Service worker registered successfully.');
      })
      .catch(err => {
        console.error('Error registering service worker:', err);
      });
    */
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.id === 'synchronize-data') {
        DBHelper.synchronizeData()
          .then(refresh => {
            if (refresh) {
              initalizeRestaurantReviewPage();
            }
          })
          .catch(err => {
            console.error('Error synchronizing data:', err);
          });
        }
      });
  }
})();

window.addEventListener('load', event => {
  initalizeRestaurantReviewPage();
});

function initalizeRestaurantReviewPage() {
  fetchDataFromURL((error, restaurant, review) => {
    if (error) {
      console.error(error);
      return alert(error);
    } else if (!restaurant) {
      error = 'initalizeRestaurantReviewPage: invalid restaurant object!';
      console.error(error);
      return alert(error);
    } else {
        let isNewReview = false;
        const restaurantTitle = document.getElementById('restaurant-title');
        if (review) {
          restaurantTitle.innerText = `Εdit review for '${restaurant.name}'`;
        } else {
          isNewReview = true;
          review = DBHelper.getNewReview(restaurant);
          restaurantTitle.innerText = `Add a new review for '${restaurant.name}'`;
        }
        const inputName = document.querySelector('.review-fields-container #name');
        inputName.value = review.name;
        const inputRating = document.querySelector('.review-fields-container #rating');
        inputRating.value = review.rating;
        const inputComments = document.querySelector('.review-fields-container #comments');
        inputComments.value = review.comments;
        const reviewForm = document.querySelector('#review-form');
        reviewForm.onsubmit = event => {
          submitReview(event, restaurant, review);
        }
        setTimeout(() => {
          if (isNewReview)
            inputName.focus();
          else
            inputComments.focus();
        }, 0);
    }
  });
}

fetchDataFromURL = callback => {
  const restaurantId = UrlHelper.getParameterByName('restaurant_id');
  if (!restaurantId) {
    error = 'No restaurant id in URL';
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(restaurantId, (error, restaurant) => {
      if (error)
        return callback(error);
      if (!restaurant)
        return callback(`Restaurant with id '${restaurantId}' cound not be found!`);
      const reviewId = UrlHelper.getParameterByName('review_id');
      if (!reviewId)
        return callback(null, restaurant);
      DBHelper.fetchReviewById(reviewId, (error, review) => {
        if (error)
          return callback(error, restaurant);
        if (!review)
          return callback(`Review with id '${reviewId}' cound not be found!`, restaurant);
        return callback(null, restaurant, review);
      });
    });
  }
};

submitReview = (event, restaurant, review) => {
  event.preventDefault();
  event.stopPropagation();
  const inputName = document.querySelector('.review-fields-container #name');
  const inputRating = document.querySelector('.review-fields-container #rating');
  const inputComments = document.querySelector('.review-fields-container #comments');
  review.name = inputName.value;
  review.rating = parseInt(inputRating.value);
  review.comments = inputComments.value;
  review.updatedAt = new Date();
  DBHelper.saveReview(review).then(() => {
    setTimeout(() => {
      const restaurantUrl = DBHelper.urlForRestaurant(restaurant);
      UrlHelper.goToUrl(restaurantUrl);
    }, 500);
  })
  .catch(err => {
    alert(err);
  });
};
