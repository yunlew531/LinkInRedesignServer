const formatProfileViews = (views) => {
  if (views?.profile_views) {
    views.profile_views = Object.values(views.profile_views).sort((a, b) => b.timestamp - a.timestamp);
  }
  return views;
};

module.exports = formatProfileViews;