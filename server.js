'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const routes = require('./routes');
const auth = require('./auth');

const app = express();

app.set('view engine', 'pug');

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
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
