const express = require('express');
const router = express();
const { fireDb, fireStorage, firebase } = require('../connections/firebase_connect');
const { validationResult, checkSchema } = require('express-validator');
const multer  = require('multer');
const upload = multer();
const usersRef = fireDb.collection('users');
const userPhotosStorageRef = fireStorage.ref('/user_photo');
const articlesRef = fireDb.collection('articles');
const handleProfileConnections = require('../mixins/handleProfileConnections');

router.get('/profile', async (req, res) => {
  const { uid } = req;
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

    const connectionsData = handleProfileConnections(connections);

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

    const connectionsData = handleProfileConnections(connections);

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
  const { project } = req.body;
  const projectsRef = usersRef.doc(uid).collection('projects');
  const projectRef = projectsRef.doc();
  const { id } = projectRef;
  const create_time = firebase.firestore.FieldValue.serverTimestamp();
  
  try {
    await projectRef.set({
      ...project,
      id,
      create_time,
    });
    const snapshot = await projectsRef.get();
    const projects = [];
    snapshot.forEach((doc) => {
      const project = doc.data();
      const { create_time, update_time } = project;
      if (create_time) project.create_time = create_time.seconds;
      if (update_time) project.update_time = update_time.seconds;
      projects.push(project)
    });

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
  const { project } = req.body;
  const update_time = firebase.firestore.FieldValue.serverTimestamp();
  const newProject = {
    ...project,
    update_time,
  }
  const projectsRef = usersRef.doc(uid).collection('projects');
  const projectRef = projectsRef.doc(id);

  try {
    await projectRef.update(newProject);
    const snapshot = await projectsRef.get();

    const projects = [];
    snapshot.forEach((doc) => {
      const project = doc.data();
      const { create_time, update_time } = project;
      if (create_time) project.create_time = create_time.seconds;
      if (update_time) project.update_time = update_time.seconds;
      projects.push(project);
    });

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
  const projectsRef = usersRef.doc(uid).collection('projects');
  
  try {
    await projectsRef.doc(id).delete();
    const snapshot = await projectsRef.get();
    const projects = [];
    snapshot.forEach((doc) => {
      const project = doc.data();
      const { create_time, update_time } = project;
      if (create_time) project.create_time = create_time.seconds;
      if (update_time) project.update_time = update_time.seconds;
      projects.push(project);
    });

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
    const experiencesRef = usersRef.doc(uid).collection('experience');
    const experienceRef = experiencesRef.doc();
    const { id } = experienceRef;
    const data = {
      id,
      title,
      place,
      image_url,
      start_time,
      end_time,
      content,
    };

    try {
      await experienceRef.set(data);
      const snapshots = await experiencesRef.get();
      const experience = [];
      snapshots.forEach((doc) => {
        experience.push(doc.data());
      });

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
    const experiencesRef = usersRef.doc(uid).collection('experience');
    const experienceRef = experiencesRef.doc(id);

    const data = {
      id,
      title,
      place,
      image_url,
      start_time,
      end_time,
      content,
    };

    try {
      await experienceRef.update(data);
      const snapshots = await experiencesRef.get();
      const experience = [];
      snapshots.forEach((doc) => {
        experience.push(doc.data());
      });

      res.send({
        success: true,
        message: 'update success',
        experience,
      });
    } catch (err) {
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
  const experiencesRef = usersRef.doc(uid).collection('experience');
  const experienceRef = experiencesRef.doc(id);

  try {
    await experienceRef.delete();
    const snapshot = await experiencesRef.get();

    const experience = [];
    snapshot.forEach((doc) => {
      experience.push(doc.data());
    });

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
  const education = req.body;
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
    const { education: resEducation } = snapshot.data();
    
    res.send({
      success: true,
      message: 'update success',
      education: resEducation,
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
      let { articles = [], name, photo = '', job = '' } = snapshot.data();
      
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
      articles = articles ? [ ...articles, id ] : [ id ];
      await usersRef.doc(uid).update({ articles });
      const articlesSnapshot =
        await articlesRef.orderBy('create_time').startAt(1).limitToLast(10).get();
      let resArticles = [];
      articlesSnapshot.forEach((doc) => resArticles.push(doc.data()));
      resArticles = resArticles.reverse();

      res.send({
        success: true,
        message: 'create success',
        articles: resArticles,
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

router.get('/articles/page/:page', async (req, res) => {
  const page = req.params.page || 1;
  const startIdx = (page - 1) * 10 + 1;

  try {
    const articlesSnapshot =
      await articlesRef.orderBy('create_time').get();
      // await articlesRef.orderBy('create_time').limitToLast(10).get();
      
      const articlesPromise = () => new Promise((resolve, reject) => {
      let resArticles = [];
      articlesSnapshot.forEach(async (doc) => {
        const data = doc.data();
        try {
          const commentsSnapshot =
            await articlesRef.doc(data.id).collection('comments').orderBy('create_time').get();
          const comments = [];
          
          if (!commentsSnapshot.empty) {
            commentsSnapshot.forEach((commentDoc) => comments.push(commentDoc.data()));
          }
          
          const article = { ...data, comments };

          if (article.favorites) {
            const favorites = Object.keys(article.favorites).map((favorite) =>
              ({ uid: favorite }));
            article.favorites = favorites;
          }

          resArticles.push(article);
          if (resArticles.length === articlesSnapshot.size) {
            resolve(resArticles);
          }
        } catch (err) { reject(new Error()); }
      });
    });
    let resArticles = await articlesPromise();
    resArticles = resArticles.reverse();

    res.send({
      success: true,
      message: 'success',
      articles: resArticles,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({
      success: false,
      message: 'failed'
    });
  }
});

router.post('/article/like/:articleId', async (req, res) => {
  const { uid } = req;
  const { articleId } = req.params;
  const { name, photo = '', job = '' } = req.body;

  try {
    const snapshot = await articlesRef.doc(articleId).get();
    const { likes } = snapshot.data();

    const like = {
      uid,
      name,
      photo,
      job,
    };

    if (!likes) {
      await articlesRef.doc(articleId).update({
        likes: [ like ],
      });
    } else {
      likes.push(like);
      await articlesRef.doc(articleId).update({ likes });
    }

    const articleSnapshot = await articlesRef.doc(articleId).get();
    const article = articleSnapshot.data();

    res.send({
      success: true,
      message: 'thumbs up success',
      article,
    });
  } catch (err) {
    console.log(' log => ', err);
    res.status(400).send({
      success: false,
      message: 'thumbs up failed',
    });
  }
});

router.post('/article/dislike/:articleId', async (req, res) => {
  const { uid } = req;
  const { articleId } = req.params;

  try {
    const snapshot = await articlesRef.doc(articleId).get();
    const { likes } = snapshot.data();
    const userInLikesIndex = likes.findIndex((like) => like.uid === uid);
    if (userInLikesIndex === -1) throw new Error('user no thumbs up')

    likes.splice(userInLikesIndex, 1);
    await articlesRef.doc(articleId).update({ likes });
    
    const articleSnapshot = await articlesRef.doc(articleId).get();
    const article = articleSnapshot.data();

    res.send({
      success: true,
      message: 'cancel thumbs up success',
      article,
    });
  } catch (err) {
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

  const commentsRef = articlesRef.doc(articleId).collection('comments');
  const commentRef = commentsRef.doc();
  const { id } = commentRef;

  const data = {
    id,
    uid,
    name,
    photo,
    comment,
    create_time: Math.floor(Date.now() / 1000),
  };
  
  try {
    await commentRef.set(data);
    const snapshot = await commentsRef.orderBy('create_time').get();
    const comments = [];
    snapshot.forEach((comment) => comments.push(comment.data()));

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
  const commentRef = articlesRef.doc(articleId).collection('comments').doc(commentId);

  try {
    const commentSnapshot = await commentRef.get();
    const comment = commentSnapshot.data();
    if (comment.uid !== uid) throw new Error('not comment owner');

    await commentRef.delete();
    const snapshot =
      await articlesRef.doc(articleId).collection('comments').orderBy('create_time').get();

    const comments = [];
    snapshot.forEach((doc) => {
      comments.push(doc.data());
    });

    res.send({
      success: true,
      message: 'delete success',
      comments,
    });
  } catch (err) {
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
    const { favorites: resFavorites } = articleSnapshot.data();
    const favoritesArr = Object.keys(resFavorites).map((favorite) => ({ uid: favorite }));

    res.send({
      success: true,
      message: 'add favorite',
      favorites: favoritesArr,
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
    const { favorites } = articleSnapshot.data();
    const favoritesArr = Object.keys(favorites).map((favorite) => ({ uid: favorite }));

    res.send({
      success: true,
      message: 'remove favorite',
      favorites: favoritesArr,
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

router.get('/articles/own', async (req, res) => {
  const { uid } = req;

  try {
    const snapshot = await articlesRef.where('uid', '==', uid).orderBy('create_time').get();
    
    const articlesPromise = () => new Promise((resolve, reject) => {
      let articles = [];
      snapshot.forEach(async (doc) => {
        const article = doc.data();
        const commentsSnapshot =
          await articlesRef.doc(article.id).collection('comments').orderBy('create_time').get();
        const comments = [];
        commentsSnapshot.forEach((doc) => comments.push(doc.data()));
  
        const articleData = {
          ...article,
          comments,
        };
  
        articles.push(articleData);
        if (articles.length === snapshot.size) {
          articles = articles.reverse();
          resolve(articles);
        }
      });
    });
    const articles = await articlesPromise();

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
  
    const isConnected = ownConnections.sent ? ownConnections.sent[orderSideUid] : false;

    if (ownConnections.sent && isConnected) {
      throw new Error('user is connected');
    }

    const ownConnectionsQty = ownConnections.connected?.length || 0;
    const orderSideConnectionsQty = orderSideConnections.connected?.length || 0;

    const ownSentData = {
      uid: orderSideUid,
      name: orderSideName,
      job: orderSideJob,
      photo: orderSidePhoto,
      connections_qty: ownConnectionsQty,
      timestamp: Math.floor(Date.now() / 1000),
    };
    const orderSideReceivedData = {
      uid: ownUid,
      name: ownName,
      job: ownJob,
      photo: ownPhoto,
      connections_qty: orderSideConnectionsQty,
      timestamp: Math.floor(Date.now() / 1000),
     };

    ownRef.update({ [`connections.sent.${orderSideUid}`]: ownSentData });
    orderSideRef.update({ [`connections.received.${ownUid}`]: orderSideReceivedData });

    const snapshot = await ownRef.get();
    const { connections: newConnections } = snapshot.data();

    const connectionsData = handleProfileConnections(newConnections);

    res.send({
      success: true,
      message: 'connect sent',
      connections: connectionsData,
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

    const isOrderSideInOwnSent = ownConnections.sent ? ownConnections.sent[orderSideUid] : false;
    const isOwnInOrderSideReceived =
      userConnections.received ? userConnections.received[ownUid] : false;

    if (!isOrderSideInOwnSent) throw new Error('user is not in own connections sent');
    if (!isOwnInOrderSideReceived) throw new Error('own is not in user connections received');

    const { FieldValue } = firebase.firestore;
    Promise.all([
      ownRef.update({ [`connections.sent.${orderSideUid}`]: FieldValue.delete() }),
      orderSideRef.update({ [`connections.received.${ownUid}`]: FieldValue.delete() })
    ]);

    const snapshot = await ownRef.get();
    const { connections: newConnections } = snapshot.data();

    const connectionsData = handleProfileConnections(newConnections);

    res.send({
      success: true,
      message: 'connect sent',
      connections: connectionsData,
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


    Promise.all([
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

    const connectionsData = handleProfileConnections(newConnections);

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
    Promise.all([
      ownRef.update({ [`connections.connected.${orderSideUid}`]: FieldValue.delete()}),
      orderSideRef.update({ [`connections.connected.${ownUid}`]: FieldValue.delete()}),
    ]);

    const snapshot = await ownRef.get();
    const { connections: newConnections } = snapshot.data();

    const connectionsData = handleProfileConnections(newConnections);

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
    Promise.all([
      ownRef.update({ [`connections.received.${orderSideUid}`]: FieldValue.delete()}),
      orderSideRef.update({ [`connections.sent.${ownUid}`]: FieldValue.delete() }),
    ]);

    const snapshot = await ownRef.get();
    const { connections: newConnections } = snapshot.data();

    const connectionsData = handleProfileConnections(newConnections);

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

module.exports = router;