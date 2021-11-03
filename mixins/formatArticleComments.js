const formatArticleComments = (comments) => {
  if (comments) {
    return Object.values(comments).sort((a, b) => a.create_time - b.create_time);
  }
  return [];
}

module.exports = formatArticleComments;