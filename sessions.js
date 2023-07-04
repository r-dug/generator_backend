const CONNECTION_STRING = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const app = express()

const sessionStore = MongoStore.create({
    mongoUrl: CONNECTION_STRING,
    collectionName: "sessions",
    ttl: 3600
})
// session middleware
app.use(
    session({
      secret: SECRET, // Set a secret key for session signing (replace 'your-secret-key' with your own secret)
      resave: false, // Disable session resaving on each request
      saveUninitialized: false, // Do not save uninitialized sessions
      store: sessionStore,
      cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true, // Prevent client-side JavaScript from accessing cookies
        maxAge: 1000*60*30, // Session expiration time (in milliseconds)
      },
    })
  )
