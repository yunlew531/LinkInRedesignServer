const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { fireDb, firebase } = require('../connections/firebase_connect');
const formatArticleComments = require('../mixins/formatArticleComments');
const formatArticleLikes = require('../mixins/formatArticleLikes');
const formatArticleFavorites = require('../mixins/formatArticleFavorites');
const formatProfileConnections = require('../mixins/formatProfileConnections');
const formatProfileExperience = require('../mixins/formatProfileExperience');
const formatProfileProjects = require('../mixins/formatProfileProjects');
const formatProfileViews = require('../mixins/formatProfileViews');
const articlesRef = fireDb.collection('articles');

const usersRef = fireDb.collection('users');

router.get('/articles/user/:uid', async (req, res) => {
  const { uid } = req.params;
 
  try {
    const snapshot = await articlesRef.where('uid', '==', uid).orderBy('create_time').get();

    if (snapshot.empty) {
      res.send({
        success: true,
        message: 'get success',
        articles: [],
      });
      return;
    }

    let articles = [];
    snapshot.forEach((doc) => {
      let article = doc.data();
      let { comments, likes, favorites } = article;
      comments = formatArticleComments(comments);
      likes = formatArticleLikes(likes);
      favorites = formatArticleFavorites(favorites);
      article = { ...article, comments, likes, favorites };
      articles.push(article);
    });
    articles = articles.reverse();

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
  const { authorization: token } = req.headers;
  const { uid } = req.params;
  const { view } = req.query;
  const orderSideUserRef = usersRef.doc(uid);
  const { FieldValue } = firebase.firestore;

  let isLogin = false;
  let ownUid;
  try {
    const { uid } = jwt.verify(token, process.env.JWT_PRIVATE_KEY);
    isLogin = true;
    ownUid = uid;
  } catch (err) {}

  try {
    let userSnapshot = await usersRef.doc(ownUid).get();

    if(!userSnapshot.exists) throw new Error('user not exist');

    let user = userSnapshot.data();
    let { uid, name, photo = '', job = '' } = user;

    if (view === 'true') {
      if (isLogin) {
        const data = { name, uid, job, photo };
        await orderSideUserRef.update({
          [`views.profile_views.${uid}`]: data,
          'views.profile_views_total': FieldValue.increment(1),
        });
      } else {
        await orderSideUserRef.update({ 'views.profile_views_total': FieldValue.increment(1) });
      }
    }

    userSnapshot = await orderSideUserRef.get();
    user = userSnapshot.data();
    const { city, brief_introduction, introduction,
      skills, education, background_cover, description, about
    } = user;
    let { connections, projects, experience, views } = user;
    ({ name, uid, job = '', photo = '' } = user);

    connections = formatProfileConnections(connections);
    experience = formatProfileExperience(experience);
    projects = formatProfileProjects(projects);
    views = formatProfileViews(views);

    const resUser = {
      uid,
      name,
      photo,
      city,
      connections,
      connections_qty: connections?.connected?.length,
      brief_introduction,
      introduction,
      projects,
      skills,
      experience,
      education,
      views,
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
});

module.exports = router;
