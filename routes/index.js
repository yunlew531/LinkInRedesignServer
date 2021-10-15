const express = require('express');
const router = express.Router();
const { fireDb } = require('../connections/firebase_connect');

const usersRef = fireDb.collection('users');

router.get('/', function(req, res, next) {
  res.send({
    success: false,
  });
});

router.get('/user/:id', async (req, res) => {
  const { id: uid } = req.params;

  try {
    const snapshot = await usersRef.doc(uid).get();
    if(!snapshot.exists) throw new Error('user not exist');
    const user = snapshot.data();
    const { name, photo, city, connections, brief_introduction, introduction, projects,
      skills, experience, education, description, background_cover, profile_views, about,
    } = user;
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
      description,
      background_cover,
      profile_views,
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
})

module.exports = router;
