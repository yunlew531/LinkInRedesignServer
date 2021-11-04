const { fireDb } = require('../connections/firebase_connect');

const getRandomId = () => {
  const randomsRef = fireDb.collection('users');
  const randomRef = randomsRef.doc();
  const { id } = randomRef
  return id;
}

module.exports = getRandomId;
