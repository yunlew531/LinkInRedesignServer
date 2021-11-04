const express = require('express');
const router = express.Router();
const { fireDb } = require('../connections/firebase_connect');
const formatArticleComments = require('../mixins/formatArticleComments');
const formatArticleLikes = require('../mixins/formatArticleLikes');
const formatArticleFavorites = require('../mixins/formatArticleFavorites');
const formatProfileConnections = require('../mixins/formatProfileConnections');
const articlesRef = fireDb.collection('articles');

const usersRef = fireDb.collection('users');

router.get('/', function(req, res) {
  res.send({
    success: false,
  });
});

router.get('/articles/user/:uid', async (req, res) => {
  const { uid } = req.params;

  try {
    const snapshot = await articlesRef.where('uid', '==', uid).orderBy('create_time').get();
    const articles = [];
    snapshot.forEach((doc) => {
      let article = doc.data();
      let { comments, likes, favorites } = article;
      comments = formatArticleComments(comments);
      likes = formatArticleLikes(likes);
      favorites = formatArticleFavorites(favorites);
      article = { ...article, comments, likes, favorites };
      articles.push(article);
    });

    res.send({
      success: true,
      message: 'get success',
      articles,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      success: false,
      message: 'get error',
    })
  }
});

router.get('/user/:uid', async (req, res) => {
  const { uid } = req.params;
  const userRef = usersRef.doc(uid);
  const projectsRef = userRef.collection('projects');
  const experienceRef = userRef.collection('experience');

  try {
    const [ userSnapshot, projectsSnapshot, experienceSnapshot ] =
      await Promise.all([userRef.get(), projectsRef.get(), experienceRef.get()]);

    if(!userSnapshot.exists) throw new Error('user not exist');

    const user = userSnapshot.data();
    const { uid, name, photo, city, connections = {}, brief_introduction, introduction,
      skills, education, profile_views, background_cover, description, about, job
    } = user;

    const projects = [];
    projectsSnapshot.forEach((doc) => {
      const project = doc.data();
      const { create_time, update_time } = project;
      if (create_time) project.create_time = create_time.seconds;
      if (update_time) project.update_time = update_time.seconds;
      projects.push(project);
    });

    const experience = [];
    experienceSnapshot.forEach((doc) => {
      experience.push(doc.data());
    });

    const connectionsData = formatProfileConnections(connections);

    const resUser = {
      uid,
      name,
      photo,
      city,
      connections: connectionsData,
      connections_qty: connectionsData?.connected?.length,
      brief_introduction,
      introduction,
      projects,
      skills,
      experience,
      education,
      profile_views,
      background_cover,
      description,
      about,
      job,
    };

    res.send({
      success: true,
      user: resUser,
      message: 'get success',
    });
  } catch(err) {
    console.log(err);
    let message = '';

    switch(err.message) {
      case 'user not exist':
        message = 'user not exist';
        break;
      default:
        message = 'get failed';
        break;
    }

    res.status(400).send({
      success: false,
      message,
    });
  }
})

module.exports = router;
