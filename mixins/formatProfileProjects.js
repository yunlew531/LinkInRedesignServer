const formatProfileProjects = (projects) => {
  if (projects) {
    return Object.values(projects);
  }
  return [];
};

module.exports = formatProfileProjects;
