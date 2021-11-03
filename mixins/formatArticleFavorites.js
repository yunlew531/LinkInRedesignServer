const formatArticleFavorites = (favorites) => {
  if (favorites) {
    return Object.values(favorites);
  }
  return [];
};

module.exports = formatArticleFavorites;