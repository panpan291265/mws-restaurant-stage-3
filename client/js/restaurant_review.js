window.addEventListener('load', event => {
  initalizeRestaurantReviewPage();
});

function initalizeRestaurantReviewPage() {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) {
      console.error(error);
    } else {
        const restaurantTitle = document.getElementById('restaurant-title');
        restaurantTitle.innerText = `Will you please write a review for '${restaurant.name}'?`;
    }
  });
}

fetchRestaurantFromURL = callback => {
  if (self.restaurant) {
    callback(null, self.restaurant);
    return;
  }
  const id = UrlHelper.getParameterByName('id');
  if (!id) {
    error = 'No restaurant id in URL';
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      if (error)
        return callback(error, null);
      if (!restaurant)
        return callback(`Restaurant with id '${id}' cound not be found!`, null);
      self.restaurant = restaurant;
      callback(null, restaurant);
    });
  }
};
