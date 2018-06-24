window.addEventListener('load', event => {
  initalizeRestaurantReviewPage();
});

function initalizeRestaurantReviewPage() {
  fetchDataFromURL((error, restaurant, review) => {
    if (error) {
      console.error(error);
    } else {
        const restaurantTitle = document.getElementById('restaurant-title');
        if (review)
          restaurantTitle.innerText = `Do you really want to edit review no '${review.id}' for '${restaurant.name}'?`;
        else
          restaurantTitle.innerText = `Will you please write a new review for '${restaurant.name}'?`;
    }
  });
}

fetchDataFromURL = callback => {
  if (self.restaurant) {
    callback(null, self.restaurant);
    return;
  }
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
      self.restaurant = restaurant;
      self.review = null;
      const reviewId = UrlHelper.getParameterByName('review_id');
      if (!reviewId)
        return callback(null, restaurant);
      DBHelper.fetchReviewById(reviewId, (error, review) => {
        if (error)
          return callback(error, restaurant);
        if (!review)
          return callback(`Review with id '${reviewId}' cound not be found!`, restaurant);
        self.review = review;
        return callback(null, restaurant, review);
      });
    });
  }
};
