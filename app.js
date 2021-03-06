const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
require('dotenv').config();
const cors = require('cors');
const checkAuth = require('./mixins/checkAuth');

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://yunlew531.github.io',
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const indexRouter = require('./routes/index');
const signinRouter = require('./routes/signin');
const userRouter = require('./routes/user');
const selfRouter = require('./routes/self');

const app = express();

app.use(cors(corsOptions));
app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(cookieParser());

app.use('/', indexRouter);
app.use('/', signinRouter);
app.use('/user', userRouter);

// auth
app.use(checkAuth);
app.use('/self', selfRouter);

module.exports = app;
