'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const passport = require('passport');
const ObjectID = require('mongodb').ObjectID;
const LocalStrategy = require('passport-local');

const app = express();

app.set('view engine', 'pug');

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
}));

app.use(passport.initialize());
app.use(passport.session());

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

myDB(async (client) => {
  const myDataBase = await client.db('database').collection('users');

  app.route('/').get((req, res) => {
    res.render('pug', { title: 'Connected to Database', message: 'Please login', showLogin: true });
  });

  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc);
    });
  });

  passport.use(new LocalStrategy(
    function (username, password, done) {
      myDataBase.findOne({ username }, function (err, user) {
        console.log(`User ${username} attempted to log in.`);
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        if (password !== user.password) { return done(null, false); }
        return done(null, user);
      });
    }
  ));

  app.route('/login').post(
    passport.authenticate('local', { failureRedirect: '/', failureMessage: true }),
    function (req, res) {
      res.render('pug/profile', { user: req.user });
    },
  );

  app.route('/profile').get(
    ensureAuthenticated,
    (req, res) => {
      res.render(process.cwd() + '/views/pug/profile', { username: req.user.username });
    }
  );
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
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
