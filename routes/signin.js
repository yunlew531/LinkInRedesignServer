const express = require('express');
const router = express.Router();
const { fireAuth, fireDb } = require('../connections/firebase_connect');
const usersRef = fireDb.collection('users');
const { validationResult, checkSchema } = require('express-validator');
var jwt = require('jsonwebtoken');

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
  address: {
    in: ['body'],
    notEmpty: true,
    errorMessage: 'Address required',
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

  const { email, password, name, phone } = req.body;

  let loginToken = '';
  fireAuth.createUserWithEmailAndPassword(email, password)
    .then(({ user }) => {
      const { uid } = user;
      const userRef = usersRef.doc(uid);
      const pwToken = jwt.sign({ password }, process.env.JWT_PRIVATE_KEY);
      loginToken = jwt.sign({ uid }, process.env.JWT_PRIVATE_KEY, { expiresIn: '5 days' });

      return userRef.set({
        uid,
        email,
        password: pwToken,
        name,
        phone,
        address,
      });
    })
    .then(() => {
      res.send({
        success: true,
        message: 'Register success',
        token: loginToken,
        uid,
        expired: Date.now() + 60 * 60 * 24 * 5 * 1000,
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

router.post('/user/check', (req, res) => {
  let { authorization: token } = req.headers;

  try {
    token = jwt.verify(token, process.env.JWT_PRIVATE_KEY);

    res.send({
      success: true,
      message: 'Is login',
      uid: token.uid,
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

    res.send({
      success: false,
      message,
    })
  }
});

module.exports = router;