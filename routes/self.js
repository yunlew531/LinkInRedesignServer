const express = require('express');
const router = express();
const { fireDb } = require('../connections/firebase_connect');

const usersRef = fireDb.collection('users');

router.get('/profile', async (req, res) => {
  const { uid } = req.body;
  try {
    const snapshot = await usersRef.doc(uid).get();
    if(!snapshot.exists) throw new Error('user not exist');
    const user = snapshot.data();
    const { name, photo, city, connections, brief_introduction, introduction, projects,
      skills, experience, education } = user;
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

module.exports = router;