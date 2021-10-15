const express = require('express');
const router = express();
const { fireDb, fireStorage, firebase } = require('../connections/firebase_connect');
const { validationResult, checkSchema } = require('express-validator');
const multer  = require('multer');
const upload = multer();

const usersRef = fireDb.collection('users');
const userPhotosStorageRef = fireStorage.ref('/user_photo');

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
    const { name, photo, city, connections, brief_introduction, introduction,
      skills, education, profile_views, background_cover, description, about
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

    const resUser = {
      name,
      photo,
      city,
      connections_qty: connections?.length,
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
    };

    res.send({
      success: true,
      user: resUser,
      message: '成功取得資料',
    });
  } catch(err) {
    console.log(err);
    let message = '';

    switch(err.message) {
      case 'user not exist':
        message = '帳戶不存在';
        break;
      default:
        message = '無法取得資料';
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
    const { photo, name } = snapshot.data();

    res.send({
      success: true,
      message: 'get photo success',
      user: {
        photo,
        name,
      }
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
    console.log(err);
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
    console.log('err log => ', err);
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
    console.log('err log => ', err);
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

module.exports = router;