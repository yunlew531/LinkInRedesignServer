const formatArticleLikes = (likes) => {
  if (likes) {
    return Object.values(likes);
  }
  return [];
};

module.exports = formatArticleLikes;