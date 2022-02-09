const session = require('express-session');
const ObjectID = require('mongodb').ObjectID;
const LocalStrategy = require('passport-local');
const passport = require('passport');
const GitHubStrategy = require('passport-github').Strategy;

module.exports = function (app, myDataBase) {
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
        if (!bcrypt.compareSync(password, user.password)) {
          return done(null, false);
        }
        return done(null, user);
      });
    }
  ));

  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL,
  },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);
    }
  ));

  app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false },
  }));

  app.use(passport.initialize());
  app.use(passport.session());
}
