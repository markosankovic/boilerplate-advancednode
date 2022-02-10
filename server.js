'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const routes = require('./routes');
const auth = require('./auth');
const passport = require('passport');
const session = require('express-session');
const passportSocketIo = require('passport.socketio');
const MongoStore = require('connect-mongo')(session);
const cookieParser = require('cookie-parser');

const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);

io.use(
  passportSocketIo.authorize({
    cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail,
  }),
);

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

let currentUsers = 0;

io.on('connection', socket => {
  console.log('user ' + socket.request.user.name + ' connected');
  ++currentUsers;
  io.emit('user', {
    name: socket.request.user.name,
    currentUsers,
    connected: true,
  });
  socket.on('disconnect', () => {
    --currentUsers;
    io.emit('user', {
      name: socket.request.user.name,
      currentUsers,
      connected: false,
    });
  });
});

app.set('view engine', 'pug');

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
}));

app.use(passport.initialize());
app.use(passport.session());

myDB(async (client) => {
  const myDataBase = await client.db('database').collection('users');
  auth(app, myDataBase);
  routes(app, myDataBase);
}).catch((e) => {
  app.route('/').get((req, res) => {
    res.render('pug', { title: e, message: 'Unable to login' });
  });
});

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
