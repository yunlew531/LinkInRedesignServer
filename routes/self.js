const express = require('express');
const router = express();
const { fireDb, fireStorage } = require('../connections/firebase_connect');
const multer  = require('multer');
const upload = multer();

const usersRef = fireDb.collection('users');

router.get('/profile', async (req, res) => {
  const { uid } = req;
  try {
    const snapshot = await usersRef.doc(uid).get();
    if(!snapshot.exists) throw new Error('user not exist');
    const user = snapshot.data();
    const { name, photo, city, connections, brief_introduction, introduction, projects,
      skills, experience, education, profile_views, background_cover, description, about } = user;
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

router.post('/photo', upload.single('img-file'), async (req, res) => {
  const photo = req.file;
  const { uid } = req;
  const fileExtension = photo.originalname.split('.').pop();

  if (fileExtension !== 'jpg') {
    res.status(400).send({
      success: false,
      message: 'only use jpg',
    });
    return;
  }

  const userPhotosStorageRef = fireStorage.ref('/user_photo');
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
  const photo = req.file;
  const { uid } = req;
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

router.post('/description/update', async (req, res) => {
  const { description } = req.body;
  const { uid } = req;
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

router.post('/about/update', async (req, res) => {
  const { about } = req.body;
  const { uid } = req;
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

module.exports = router;