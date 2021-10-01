const express = require('express');
const router = express.Router();
const { fireAuth, fireDb } = require('../connections/firebase_connect');
const usersRef = fireDb.collection('users');
const blackListRef = fireDb.collection('blacklist');
const { validationResult, checkSchema } = require('express-validator');
const jwt = require('jsonwebtoken');
const cron = require("node-cron");

// clean up blacklist for more than 7days every wednesday
cron.schedule('* * * * * 3', async () => {
  const sevenDays = Date.now() - 60 * 60 * 7 * 24 * 1000;
  
  try {
    const snapshots = await blackListRef.where('timestamp', '<', sevenDays).get();
    if (!snapshots.empty) {
      const batch = fireDb.batch();
      snapshots.forEach(doc => {
        batch.delete(doc.ref)
      });
      await batch.commit();
    }
  } catch (err) {
    console.log(err);
  }
});

const emailCheck = {
  in: ['body'],
  isEmail: true,
  errorMessage: 'Invalid email',
};

const passwordCheck = {
  in: ['body'],
  isLength: {
    errorMessage: 'Password should be at least 6 chars long',
    options: { min: 6 },
  },
};

const registerCheck = {
  email: emailCheck,
  password: passwordCheck,
  name: {
    in: ['body'],
    notEmpty: true,
    errorMessage: 'Name required',
  },
  phone: {
    in: ['body'],
    custom: {
      options: (value) => /^09[0-9]{8}$/.test(value),
    },
    errorMessage: 'Invalid Phone. must be 10 chars.',
  },
  city: {
    in: ['body'],
    notEmpty: true,
    errorMessage: 'City required',
  },
};

router.post('/signin',
  checkSchema({ email: emailCheck, password: passwordCheck }),
  (req, res) => {
    const { email, password } = req.body;

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

    fireAuth.signInWithEmailAndPassword(email, password)
      .then(({ user }) => {
        const { uid } = user;
        const token = jwt.sign({ uid }, process.env.JWT_PRIVATE_KEY, { expiresIn: '5 days' });

        res.send({
          success: true,
          message: 'signin success',
          uid,
          token,
          expired: Date.now() + 60 * 60 * 24 * 5 * 1000,
        });
      })
      .catch((error) => {
        const { code } = error;
        console.log(error);
        let message = '';

        switch (code) {
          case 'auth/user-disabled':
            message = 'user disabled';
            break;
          case 'auth/user-not-found':
            message = 'user not exist';
            break;
          case 'auth/wrong-password':
            message = 'wrong password';
            break;
          default:
            message = 'Error';
            break;
        }

        res.status(400).send({
          success: false,
          message,
        });
      });
});

router.post('/register',
  checkSchema(registerCheck),
  (req, res) => {

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

  const { email, password, name, phone, city } = req.body;

  let loginToken = '';
  let uid = '';
  fireAuth.createUserWithEmailAndPassword(email, password)
    .then(({ user }) => {
      ({ uid } = user);
      const userRef = usersRef.doc(uid);
      loginToken = jwt.sign({ uid }, process.env.JWT_PRIVATE_KEY, { expiresIn: '5 days' });

      return userRef.set({
        uid,
        email,
        name,
        phone,
        city,
      });
    })
    .then(() => {
      const expired = Date.now() + 60 * 60 * 24 * 5 * 1000;

      res.send({
        success: true,
        message: 'Register success',
        token: loginToken,
        uid,
        expired,
      });
    })
    .catch((err) => {
      const { code } = err;
      let message = '';

      switch (code) {
        case 'auth/email-already-in-use':
          message = 'Email already in use';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email';
          break;
        case 'auth/weak-password':
          message = 'Password should be at least 6 chars long';
          break;
        default:
          message = 'Error';
          break;
      }

      res.status(400).send({
        success: false,
        message,
        errors: [ message ],
      })
    });
});

router.post('/logout', async (req, res) => {
  const { authorization: token } = req.headers;

  try {
    if (!token) throw new Error('no login');
    await blackListRef.add({
      token,
      timestamp: Date.now(),
    });

    res.send({
      success: true,
      message: 'logout success',
    });
  } catch (err) {
    const { message: code } = err;
    let message = '';

    switch (code) {
      case 'no login':
        message = 'no login';
        break;
      default:
        message = 'Error';
        break;
    }

    res.status(400).send({
      success: false,
      message,
    });
  }
});

router.post('/user/check', async (req, res) => {
  const { authorization: token } = req.headers;

  try {
    const { uid } = jwt.verify(token, process.env.JWT_PRIVATE_KEY);

    const snapshot = await blackListRef.where('token', '==', token).get();

    if (!snapshot.empty) throw new Error('invalid token');

    res.send({
      success: true,
      message: 'Is login',
      uid,
    })
  } catch (err) {
    const { message: code } = err;
    let message = '';

    switch (code) {
      case 'invalid token':
        message = 'the header or payload could not be parsed';
        break;
      case 'jwt signature is required':
        message = 'jwt signature is required';
        break;
      case 'invalid signature':
        message = 'invalid signature';
        break;
      default:
        message = 'Error';
        break;
    }

    res.status(403).send({
      success: false,
      message,
    })
  }
});

module.exports = router;