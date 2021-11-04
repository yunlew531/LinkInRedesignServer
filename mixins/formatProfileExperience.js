const formatProfileExperience = (experience) => {
  if (experience) {
    return Object.values(experience);
  }
  return [];
}

module.exports = formatProfileExperience;
