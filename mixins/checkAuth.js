const jwt = require('jsonwebtoken');

const checkAuth = async (req, res, next) => {
  const { authorization: token } = req.headers;
  try {
    const { uid } = jwt.verify(token, process.env.JWT_PRIVATE_KEY);
    if (uid) {
      req.uid = uid;
      next();
    } else throw new Error();
  } catch (err) {
    console.log();
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
    });
  }
};

module.exports = checkAuth;