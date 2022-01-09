const express = require('express');
const router = express();
const { fireDb, fireStorage, firebase } = require('../connections/firebase_connect');
const { validationResult, checkSchema } = require('express-validator');
const multer  = require('multer');
const upload = multer();
const usersRef = fireDb.collection('users');
const userPhotosStorageRef = fireStorage.ref('/user_photo');
const articlesRef = fireDb.collection('articles');
const formatProfileConnections = require('../mixins/formatProfileConnections');
const formatArticleComments = require('../mixins/formatArticleComments');
const formatArticleLikes = require('../mixins/formatArticleLikes');
const formatArticleFavorites = require('../mixins/formatArticleFavorites');
const formatProfileExperience = require('../mixins/formatProfileExperience');
const formatProfileProjects = require('../mixins/formatProfileProjects');
const formatProfileViews = require('../mixins/formatProfileViews');
const getRandomId = require('../mixins/getRandomId');

router.get('/profile', async (req, res) => {
  const { uid } = req;
  const userRef = usersRef.doc(uid);

  try {
    const userSnapshot = await userRef.get();

    if(!userSnapshot.exists) throw new Error('user not exist');

    const user = userSnapshot.data();
    const { uid, name, photo, city, brief_introduction, introduction,
      skills, education, background_cover, description, about, job, notice
    } = user;
    let { experience, projects, connections, views } = user;

    experience = formatProfileExperience(experience);
    projects = formatProfileProjects(projects);
    connections = formatProfileConnections(connections);
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
      notice
    };

    res.send({
      success: true,
      user: resUser,
      message: 'get data success',
    });
  } catch(err) {
    console.log(err);
    let message = '';

    switch(err.message) {
      case 'user not exist':
        message = 'user not exist';
        break;
      default:
        message = 'get data failed';
        break;
    }

    res.status(400).send({
      success: false,
      message,
    });
  }
});

router.get('/photo', async (req, res) => {
  const { uid } = req ;

  try {
    const snapshot = await usersRef.doc(uid).get();
    const { photo, name, connections = {} } = snapshot.data();

    const connectionsData = formatProfileConnections(connections);

    res.send({
      success: true,
      message: 'get photo success',
      user: {
        photo,
        name,
        connections: connectionsData,
      },
    });
  } catch (err) {
    res.status(400).send({
      success: false,
      message: 'Error',
    });
  }
});

router.post('/photo', upload.single('img-file'), async (req, res) => {
  const { uid } = req;
  const photo = req.file;
  const fileExtension = photo.originalname.split('.').pop();

  if (fileExtension !== 'jpg') {
    res.status(400).send({
      success: false,
      message: 'only use jpg',
    });
    return;
  }

  const userPhotoStorageRef = userPhotosStorageRef.child(uid);
  
  try {
    await userPhotoStorageRef.put(photo.buffer, { contentType: photo.mimetype });
    const url = await userPhotoStorageRef.getDownloadURL();
    await usersRef.doc(uid).update({ photo: url });

    res.send({
      success: true,
      message: 'upload success',
      url,
    })
  } catch (err) {
    res.status(400).send({
      success: false,
      message: err.message,
    });
  }
});

router.post('/background', upload.single('img-file'), async (req, res) => {
  const { uid } = req;
  const photo = req.file;
  const fileExtension = photo.originalname.split('.').pop();

  if (fileExtension !== 'jpg') {
    res.status(400).send({
      success: false,
      message: 'only use jpg',
    });
    return;
  }

  const userPhotosStorageRef = fireStorage.ref('/user_bg');
  const userPhotoStorageRef = userPhotosStorageRef.child(uid);
  
  try {
    await userPhotoStorageRef.put(photo.buffer, { contentType: photo.mimetype });
    const url = await userPhotoStorageRef.getDownloadURL();
    await usersRef.doc(uid).update({ background_cover: url });

    res.send({
      success: true,
      message: 'upload success',
      url,
    })
  } catch (err) {
    res.status(400).send({
      success: false,
      message: err.message,
    });
  }
});

router.put('/description/update', async (req, res) => {
  const { uid } = req;
  const { description } = req.body;

  try {
    await usersRef.doc(uid).update({ description });
    const snapshot = await usersRef.doc(uid).get();
    const { description: newDescription } = snapshot.data();

    res.send({
      success: true,
      message: 'description updated',
      description: newDescription,
    });
  } catch (err) {
    res.status(400).send({
      success: false,
      message: 'Error',
    });
  }
});

router.put('/about/update', async (req, res) => {
  const { uid } = req;
  const { about } = req.body;

  try {
    await usersRef.doc(uid).update({ about });
    const snapshot = await usersRef.doc(uid).get();
    const { about: newAbout } = snapshot.data();

    res.send({
      success: true,
      message: 'about updated',
      about: newAbout,
    });
  } catch (err) {
    res.status(400).send({
      success: false,
      message: 'Error',
    });
  }
});

router.post('/project/create', async (req, res) => {
  const { uid } = req;
  let { project } = req.body;
  const id = getRandomId();
  const create_time = Math.floor(Date.now() / 1000);

  project = {
    ...project,
    id,
    create_time,
  };

  const userRef = usersRef.doc(uid);
  
  try {
    await userRef.update({ [`projects.${id}`]: project });
    const snapshot = await userRef.get();
    
    let { projects } = snapshot.data();
    projects = formatProfileProjects(projects);

    res.send({
      success: true,
      message: 'project create',
      projects,
      project_id: id,
    })
  } catch (err) {
    res.status(400).send({
      success: false,
      message: 'create failed',
    })
  }
});

router.put('/project/:id', async (req, res) => {
  const { uid } = req;
  const { id } = req.params;
  let { project } = req.body;
  const update_time = Math.floor(Date.now() / 1000);
    
  const userRef = usersRef.doc(uid);

  try {
    let snapshot = await userRef.get();
    let { projects } = snapshot.data();

    const { create_time } = projects[id];

    project = {
      ...project,
      update_time,
      create_time,
    };

    await userRef.update({ [`projects.${id}`]: project });
    snapshot = await userRef.get();

    ({ projects } = snapshot.data());
    projects = formatProfileProjects(projects);

    res.send({
      success: true,
      message: 'project update',
      projects,
      project_id: id,
    })
  } catch (err) {
    res.status(400).send({
      success: false,
      message: 'update failed',
    })
  }
});

router.delete('/project/:id', async (req, res) => {
  const { uid } = req;
  const { id } = req.params;

  const { FieldValue } = firebase.firestore;
  const userRef = usersRef.doc(uid);
  
  try {
    await userRef.update({ [`projects.${id}`]: FieldValue.delete() });
    const snapshot = await userRef.get();
   
    let { projects } = snapshot.data();
    projects = formatProfileProjects(projects);

    res.send({
      success: true,
      message: 'delete project success',
      projects,
    });
  } catch (err) {
    res.status(400).send({
      success: false,
      message: 'Error'
    });
  }
});

router.post('/experience/image', upload.single('img-file'), async (req, res) => {
  const { uid } = req;
  const image = req.file;
  const experienceRef = fireStorage.ref(`/users/${uid}/experience/${Date.now()}`);

  try {
    await experienceRef.put(image.buffer, { contentType: image.mimetype });
    const url = await experienceRef.getDownloadURL();
    
    res.send({
      success: true,
      imgUrl: url,
      message: 'upload success',
    });
  } catch (err) {
    res.status(400).send({
      success: false,
      message: 'upload failed',
    });
  }
});

const experienceCheck = {
  title: {
    in: ['body'],
    notEmpty: true,
    errorMessage: 'title required',
  },
  place: {
    in: ['body'],
    notEmpty: true,
    errorMessage: 'place required',
  },
  start_time: {
    in: ['body'],
    notEmpty: true,
    errorMessage: 'start_time required',
  },
  end_time: {
    in: ['body'],
    notEmpty: true,
    errorMessage: 'end_time required',
  },
  content: {
    in: ['body'],
    notEmpty: true,
    errorMessage: 'content required',
  },
  image_url: {
    in: ['body'],
    notEmpty: true,
    errorMessage: 'image_url required',
  },
};

router.post(
  '/experience/create',
  checkSchema(experienceCheck),
  async (req, res) => {
    const formatter = (error) => error.msg;
    const errors = validationResult(req).formatWith(formatter);
    const hasErrors = !errors.isEmpty();

    if (hasErrors) {
      res.status(400).send({
        success: false,
        message: errors.array(),
      });
      return;
    }

    const { uid } = req;
    const { title, place, image_url, start_time, end_time, content } = req.body;
    const id = getRandomId();

    let experience = {
      id,
      title,
      place,
      image_url,
      start_time,
      end_time,
      content,
    };

    const userRef = usersRef.doc(uid);

    try {
      await userRef.update({ [`experience.${id}`]: experience });
      const snapshot = await userRef.get();
      ({ experience } = snapshot.data());
      experience = formatProfileExperience(experience);

      res.send({
        success: true,
        message: 'create success',
        experience,
      });
    } catch (err) {
      res.status(400).send({
        success: false,
        message: 'create failed',
      });
    }
  }
);

router.put(
  '/experience/:id',
  checkSchema(experienceCheck),
  async (req, res) => {
    const formatter = (error) => error.msg;
    const errors = validationResult(req).formatWith(formatter);
    const hasErrors = !errors.isEmpty();

    if (hasErrors) {
      res.status(400).send({
        success: false,
        message: errors.array(),
      });
      return;
    }

    const { uid } = req;
    const { id } = req.params;
    const { title, place, image_url, start_time, end_time, content } = req.body;

    let experience = {
      id,
      title,
      place,
      image_url,
      start_time,
      end_time,
      content,
    };

    const userRef = usersRef.doc(uid);

    try {
      await userRef.update({ [`experience.${id}`]: experience });
      const snapshot = await userRef.get();
      ({ experience } = snapshot.data());
      experience = formatProfileExperience(experience);

      res.send({
        success: true,
        message: 'update success',
        experience,
      });
    } catch (err) {
      console.log(err);
      res.status(400).send({
        success: false,
        message: 'update failed',
      });
    }
  }
);

router.delete('/experience/:id', async (req, res) => {
  const { uid } = req;
  const { id } = req.params;
  const { FieldValue } = firebase.firestore;
  const userRef = usersRef.doc(uid);

  try {
    await userRef.update({ [`experience.${id}`]: FieldValue.delete() });
    const snapshot = await userRef.get();

    let { experience } = snapshot.data();
    experience = formatProfileExperience(experience);

    res.send({
      success: true,
      message: 'delete success',
      experience,
    });
  } catch (err) {
    res.status(400).send({
      success: false,
      message: 'delete failed',
    });
  }
});

const educationCheck = {
  school: {
    in: ['body'],
    notEmpty: true,
    errorMessage: 'school required',
  },
  major: {
    in: ['body'],
    notEmpty: true,
    errorMessage: 'major required',
  },
  content: {
    in: ['body'],
    notEmpty: true,
    errorMessage: 'content required',
  },
  time: {
    in: ['body'],
    notEmpty: true,
    errorMessage: 'time required',
  },
};

router.post('/education',
  checkSchema(educationCheck),
  async (req, res) => {
  const { uid } = req;
  let education = req.body;
  const formatter = (error) => error.msg;
  const errors = validationResult(req).formatWith(formatter);
  const hasErrors = !errors.isEmpty();

  if(hasErrors) {
    res.status(400).send({
      success: false,
      message: errors.array(),
    });
    return;
  }

  try {
    await usersRef.doc(uid).update({ education });
    const snapshot = await usersRef.doc(uid).get();
    ({ education } = snapshot.data());
    
    res.send({
      success: true,
      message: 'update success',
      education,
    });
  } catch (err) {
    res.status(400).send({
      success: false,
      message: 'update failed',
    });
  }
});

const articleCheck = {
  content: {
    in: ['body'],
    notEmpty: true,
    errorMessage: 'content required',
  },
};

const checkError = (req) => {
  const formatter = (error) => error.msg;
  const errors = validationResult(req).formatWith(formatter);
  const hasErrors = !errors.isEmpty();

  if(hasErrors) {
    res.status(400).send({
      success: false,
      message: errors.array(),
    });
    return true;
  } else return false;
};

router.post(
  '/article/create',
  checkSchema(articleCheck),
  async (req, res) => {
    const hasError = checkError(req);
    if (hasError) return;

    const { uid } = req;
    const { content } = req.body;
    const create_time = Math.floor(Date.now() / 1000);
    const articleRef = articlesRef.doc();
    const { id } = articleRef;

    try {
      const snapshot = await usersRef.doc(uid).get();
      let { name, photo = '', job = '' } = snapshot.data();
      
      const article = {
        id,
        uid,
        name,
        content,
        create_time,
        photo,
        job,
      };
      
      await articleRef.set(article);
      await usersRef.doc(uid).update({ [`articles.${id}`]: id });

      const articlesSnapshot =
        await articlesRef.orderBy('create_time').startAt(1).limitToLast(10).get();
      let articles = [];
      articlesSnapshot.forEach((doc) => articles.push(doc.data()));
      articles = articles.reverse();

      res.send({
        success: true,
        message: 'create success',
        articles,
      });
    } catch (err) {
      console.log(err);
      res.status(400).send({
        success: false,
        message: 'create failed'
      });
    }
  }
);

router.post('/article/like/:articleId', async (req, res) => {
  const { uid } = req;
  const { articleId } = req.params;
  const { name, photo = '', job = '' } = req.body;

  const articleRef = articlesRef.doc(articleId);

  try {
    const snapshot = await articleRef.get();
    let { likes = {}, uid: articleOwnerUid } = snapshot.data();

    if (likes[uid]) {
      throw new Error('user has in liked');
    }

    const like = {
      uid,
      name,
      photo,
      job,
    };

    const timestamp = Math.floor(Date.now() / 1000);
    const noticeRandomId = getRandomId();
    const orderSideNotice = {
      type: 'articleLike',
      uid,
      name,
      status: true,
      timestamp,
      id: noticeRandomId,
      article_id: articleId
    }

    await articleRef.update({ [`likes.${uid}`]: like });
    await usersRef.doc(articleOwnerUid).update({ [`notices.${noticeRandomId}`]: orderSideNotice })
    const articleSnapshot = await articleRef.get();
    ({ likes } = articleSnapshot.data());
    likes = formatArticleLikes(likes);

    res.send({
      success: true,
      message: 'thumbs up success',
      likes,
    });
  } catch (err) {
    console.log(' log => ', err);
    let { message: code } = err;
    let message = '';

    switch (code) {
      case 'user has in liked':
        message = 'user has in liked';
        break;
      default:
        message = 'thumbs up failed';
        break;
    }

    res.status(400).send({
      success: false,
      message,
    });
  }
});

router.post('/article/dislike/:articleId', async (req, res) => {
  const { uid } = req;
  const { articleId } = req.params;

  const articleRef = articlesRef.doc(articleId);
  const { FieldValue } = firebase.firestore;

  try {
    const snapshot = await articleRef.get();
    let { likes = {} } = snapshot.data();

    if (!likes[uid]) {
      throw new Error('user no thumbs up');
    }

    await articleRef.update({ [`likes.${uid}`]: FieldValue.delete() });
    const articleSnapshot = await articleRef.get();
    ({ likes } = articleSnapshot.data());
    likes = formatArticleLikes(likes);

    res.send({
      success: true,
      message: 'cancel thumbs up success',
      likes,
    });
  } catch (err) {
    console.log(err);
    const code = err.message;
    let message = '';

    switch (code) {
      case 'user no thumbs up':
        message = 'user no thumbs up';
        break;
      default:
        message = 'cancel thumbs up failed';
    }

    res.status(400).send({
      success: false,
      message,
    });
  }
});

router.post('/article/comment/:articleId', async (req, res) => {
  const { uid } = req;
  const { articleId } = req.params;
  const { comment, name, photo = '' } = req.body;
  const timestamp = Math.floor(Date.now() / 1000);

  const commentId = getRandomId();

  const data = {
    id: commentId,
    uid,
    name,
    photo,
    comment,
    create_time: Math.floor(Date.now() / 1000),
  };
  
  try {
    await articlesRef.doc(articleId).update({ [`comments.${commentId}`]: data });
    const snapshot = await articlesRef.doc(articleId).get();
    let { comments } = snapshot.data();
    const { uid: articleOwnerUid } = snapshot.data();
    comments = formatArticleComments(comments);
    const noticeRandomId = getRandomId();
    const orderSideNotice = {
      type: 'articleComment',
      uid,
      name,
      status: true,
      timestamp,
      id: noticeRandomId
    };
    await usersRef.doc(articleOwnerUid).update({ [`notices.${noticeRandomId}`]: orderSideNotice });

    res.send({
      success: true,
      message: 'comment success',
      comments,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      success: false,
      message: 'comment failed',
    });
  }
});

router.delete('/article/:articleId/comment/:commentId', async (req, res) => {
  const { uid } = req;
  const { articleId, commentId } = req.params;

  const { FieldValue } = firebase.firestore;
  const articleRef = articlesRef.doc(articleId);

  try {
    const articleSnapshot = await articleRef.get();
    let { comments } = articleSnapshot.data();

    if (comments[commentId].uid !== uid) throw new Error('not comment owner');

    await articleRef.update({ [`comments.${commentId}`]: FieldValue.delete() });
    
    const snapshot = await articleRef.get();
    ({ comments } = snapshot.data());
    comments = formatArticleComments(comments);

    res.send({
      success: true,
      message: 'delete success',
      comments,
    });
  } catch (err) {
    console.log(err);
    const code = err.message;
    let message = '';
    let status = 400;

    switch(code) {
      case 'not comment owner':
        status = 403;
        message = 'not comment owner';
        break;
      default:
        message = 'delete failed';
        break;
    }

    res.status(status).send({
      success: false,
      message,
    });
  }
});

router.post('/article/favorites/:articleId', async (req, res) => {
  const { uid } = req;
  const { articleId } = req.params;

  try {
    await articlesRef.doc(articleId).update({ [`favorites.${uid}`]: uid });
    const articleSnapshot = await articlesRef.doc(articleId).get();
    let { favorites } = articleSnapshot.data();
    favorites = formatArticleFavorites(favorites);

    res.send({
      success: true,
      message: 'add favorite',
      favorites,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      success: false,
      message: 'add favorite failed',
    });
  }
});

router.delete('/article/favorites/:articleId', async (req, res) => {
  const { uid } = req;
  const { articleId } = req.params;
  const { FieldValue } = firebase.firestore;

  try {
    await articlesRef.doc(articleId).update({ [`favorites.${uid}`]: FieldValue.delete() });
    const articleSnapshot = await articlesRef.doc(articleId).get();
    let { favorites } = articleSnapshot.data();
    favorites = formatArticleFavorites(favorites);

    res.send({
      success: true,
      message: 'remove favorite',
      favorites,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      success: false,
      message: 'remove favorite failed',
    });
  }
});

router.delete('/article/:articleId', async (req, res) => {
  const { uid } = req;
  const { articleId } = req.params;
  const articleRef = articlesRef.doc(articleId);

  try {
    const snapshot = await articleRef.get();
    const article = snapshot.data();

    if (article.uid !== uid) throw new Error('not article owner');

    await articleRef.delete();

    res.send({
      success: true,
      message: 'article delete',
    });
  } catch (err) {
    const code = err.message;
    let message = '';
    let status = 400;

    switch (code) {
      case 'not article owner':
        status = 403;
        message = 'not article owner';
        break;
      default:
        message = 'delete failed';
        break;
    }

    res.status(status).send({
      success: false,
      message, 
    });
  }
});

router.get('/articles/all', async (req, res) => {
  const page = req.params.page || 1;

  try {
    const articlesSnapshot =
      await articlesRef.orderBy('create_time').get();
 
    let articles = [];
    articlesSnapshot.forEach(async (doc) => {
      let article = doc.data();
      let { comments, likes, favorites } = article;
      likes = formatArticleLikes(likes);
      comments = formatArticleComments(comments);
      favorites = formatArticleFavorites(favorites);
      article = { ...article, comments, likes, favorites };
      articles.push(article);
    });
    articles = articles.reverse();
    
    res.send({
      success: true,
      message: 'success',
      articles,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      success: false,
      message: 'failed'
    });
  }
});

router.get('/articles', async (req, res, next) => {
  const { filter } = req.query;
  if (filter !== 'own') {
    next();
    return;
  };

  const { uid } = req;

  try {
    const snapshot = await articlesRef.where('uid', '==', uid).orderBy('create_time').get();
    
    let articles = [];
    snapshot.forEach((doc) => {
      const article = doc.data();
      let { comments, likes, favorites} = article;
      comments = formatArticleComments(comments);
      likes = formatArticleLikes(likes);
      favorites = formatArticleFavorites(favorites);
    
      const articleData = {
        ...article,
        comments,
        likes,
        favorites,
      };

      articles.push(articleData);
    });
    articles = articles.reverse();

    res.send({
      success: true,
      message: 'get articles success',
      articles,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      success: false,
      message: 'get articles failed',
    });
  }
});

router.get('/articles', async(req, res, next) => {
  const { filter } = req.query;
  if (filter !== 'favorites') {
    next();
    return;
  }
  
  const { uid } = req;
  const fieldPath = new firebase.firestore.FieldPath('favorites', uid);
  
  try {
    const snapshot = await articlesRef.where(fieldPath, '==', uid).get();

    if (snapshot.empty) {
      res.send({
        success: true,
        message: 'get articles',
        articles: [],
      });
      return;
    }

    let articles = [];
    snapshot.forEach((doc) => {
      const article = doc.data();
      let { comments, likes, favorites} = article;
      comments = formatArticleComments(comments);
      likes = formatArticleLikes(likes);
      favorites = formatArticleFavorites(favorites);
    
      const articleData = {
        ...article,
        comments,
        likes,
        favorites,
      };

      articles.push(articleData);
    });
    articles = articles.reverse();

    res.send({
      success: true,
      message: 'get articles',
      articles,
    });
  } catch (err) {
    
  }
});

router.post('/user/connect/:orderSideUid', async (req, res) => {
  const { uid: ownUid } = req;
  const { orderSideUid } = req.params;

  const ownRef = usersRef.doc(ownUid);
  const orderSideRef = usersRef.doc(orderSideUid);

  try {
    const [ownProfileSnapshot, userProfileSnapshot] =
      await Promise.all([ownRef.get(), orderSideRef.get()]);
  
    const {
      connections: ownConnections = {},
      name: ownName,
      job: ownJob = '',
      photo: ownPhoto = '',
    } = ownProfileSnapshot.data();
    const {
      connections: orderSideConnections = {},
      name: orderSideName,
      job: orderSideJob = '',
      photo: orderSidePhoto = ''
    } = userProfileSnapshot.data();
  
    const isConnected = ownConnections.sent && ownConnections.sent[orderSideUid];

    if (ownConnections.sent && isConnected) {
      throw new Error('user is connected');
    }

    const ownConnectionsQty = ownConnections.connected?.length || 0;
    const orderSideConnectionsQty = orderSideConnections.connected?.length || 0;
    const timestamp = Math.floor(Date.now() / 1000);

    const ownSentData = {
      uid: orderSideUid,
      name: orderSideName,
      job: orderSideJob,
      photo: orderSidePhoto,
      connections_qty: ownConnectionsQty,
      timestamp
    };
    const orderSideReceivedData = {
      uid: ownUid,
      name: ownName,
      job: ownJob,
      photo: ownPhoto,
      connections_qty: orderSideConnectionsQty,
      timestamp
    };
    const noticeRandomId = getRandomId()
    const orderSideNotice = {
      type: 'connect',
      uid: ownUid,
      name: ownName,
      status: true,
      timestamp,
      id: noticeRandomId
    }

    await Promise.all([
      ownRef.update({ [`connections.sent.${orderSideUid}`]: ownSentData }),
      orderSideRef.update({
        [`connections.received.${ownUid}`]: orderSideReceivedData,
        [`notices.${noticeRandomId}`]: orderSideNotice
      }),
    ]);

    const snapshot = await ownRef.get();
    let { connections: newConnections } = snapshot.data();

    newConnections = formatProfileConnections(newConnections);

    res.send({
      success: true,
      message: 'connect sent',
      connections: newConnections,
    });
  } catch (err) {
    console.log(err);
    const { message: code } = err;
    let message = '';

    switch (code) {
      case 'user is connected':
        message = 'user is connected';
        break;
      default:
        message = 'sent connect failed'
        break;
    }

    res.status(400).send({
      success: false,
      message,
    });
  }
});

router.post('/user/connect/remove_sent/:orderSideUid', async (req, res) => {
  const { uid: ownUid } = req;
  const { orderSideUid } = req.params;

  const ownRef = usersRef.doc(ownUid);
  const orderSideRef = usersRef.doc(orderSideUid);

  try {
    const [ownProfileSnapshot, userProfileSnapshot] =
      await Promise.all([ownRef.get(), orderSideRef.get()]);

    const { connections: ownConnections = {} } = ownProfileSnapshot.data();
    const { connections: userConnections = {} } = userProfileSnapshot.data();

    const isOrderSideInOwnSent = ownConnections.sent && ownConnections.sent[orderSideUid];
    const isOwnInOrderSideReceived =
      userConnections.received && userConnections.received[ownUid];

    if (!isOrderSideInOwnSent) throw new Error('user is not in own connections sent');
    if (!isOwnInOrderSideReceived) throw new Error('own is not in user connections received');

    const { FieldValue } = firebase.firestore;
    await Promise.all([
      ownRef.update({ [`connections.sent.${orderSideUid}`]: FieldValue.delete() }),
      orderSideRef.update({ [`connections.received.${ownUid}`]: FieldValue.delete() })
    ]);

    const snapshot = await ownRef.get();
    let { connections: newConnections } = snapshot.data();

    newConnections = formatProfileConnections(newConnections);

    res.send({
      success: true,
      message: 'connect sent',
      connections: newConnections,
    });
  } catch (err) {
    console.log(err);
    const { message: code } = err;
    let message = '';

    switch (code) {
      case 'user is not in own connections sent':
        message = 'user is not in own connections sent';
        break;
      case 'own is not in user connections received':
        message = 'own is not in user connections received';
        break;
      default:
        message = 'remove sent connect failed'
        break;
    }

    res.status(400).send({
      success: false,
      message,
    });
  }
});

router.post('/user/connect/accept/:orderSideUid', async (req, res) => {
  const { uid: ownUid } = req;
  const { orderSideUid } = req.params;

  
  const ownRef = usersRef.doc(ownUid);
  const orderSideRef = usersRef.doc(orderSideUid);
  
  try {
    const { FieldValue } = firebase.firestore;
    const [ownProfileSnapshot, userProfileSnapshot] =
    await Promise.all([ownRef.get(), orderSideRef.get()]);
    
    const { connections: ownConnections = {} } = ownProfileSnapshot.data();
    const { connections: orderSideConnections = {} } = userProfileSnapshot.data();

    const timestamp = Math.floor(Date.now() / 1000);
    const ownTempConnect = ownConnections.received[orderSideUid];
    ownTempConnect.connected_time = timestamp;
    const orderSideTempConnect = orderSideConnections.sent[ownUid];
    orderSideTempConnect.connected_time = timestamp;


    await Promise.all([
      ownRef.update({
        [`connections.received.${orderSideUid}`]: FieldValue.delete(),
        [`connections.connected.${orderSideUid}`]: ownTempConnect,
      }),
      orderSideRef.update({
        [`connections.sent.${ownUid}`]: FieldValue.delete(),
        [`connections.connected.${ownUid}`]: orderSideTempConnect,
      }),
    ]);

    const snapshot = await ownRef.get();
    const { connections: newConnections } = snapshot.data();

    const connectionsData = formatProfileConnections(newConnections);

    res.send({
      success: true,
      message: 'connect sent',
      connections: connectionsData,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      success: false,
      message: 'apply connect failed',
    });
  }
});

router.delete('/user/connect/remove/:orderSideUid', async (req, res) => {
  const { uid: ownUid } = req;
  const { orderSideUid } = req.params;

  const ownRef = usersRef.doc(ownUid);
  const orderSideRef = usersRef.doc(orderSideUid);
  const { FieldValue } = firebase.firestore;

  try {
    await Promise.all([
      ownRef.update({ [`connections.connected.${orderSideUid}`]: FieldValue.delete()}),
      orderSideRef.update({ [`connections.connected.${ownUid}`]: FieldValue.delete()}),
    ]);

    const snapshot = await ownRef.get();
    const { connections: newConnections } = snapshot.data();

    const connectionsData = formatProfileConnections(newConnections);

    res.send({
      success: true,
      message: 'connected remove',
      connections: connectionsData,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      success: false,
      message: 'connected remove failed',
    });
  }
});

router.post('/user/connect/refuse/:orderSideUid', async (req, res) => {
  const { uid: ownUid } = req;
  const { orderSideUid } = req.params;

  const ownRef = usersRef.doc(ownUid);
  const orderSideRef = usersRef.doc(orderSideUid);
  const { FieldValue } = firebase.firestore;

  try {
    await Promise.all([
      ownRef.update({ [`connections.received.${orderSideUid}`]: FieldValue.delete()}),
      orderSideRef.update({ [`connections.sent.${ownUid}`]: FieldValue.delete() }),
    ]);

    const snapshot = await ownRef.get();
    const { connections: newConnections } = snapshot.data();

    const connectionsData = formatProfileConnections(newConnections);

    res.send({
      success: true,
      message: 'refuse connect',
      connections: connectionsData,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      success: false,
      message: 'refuse connect failed',
    });
  }
});

router.get('/user/notice/', async (req, res) => {
  const { uid } = req
  const userRef = usersRef.doc(uid)
  const snapshot = await userRef.get()
  const { notices } = snapshot.data()

  res.send({
    success: true,
    message: 'get notice data success',
    notices
  })
});

module.exports = router;