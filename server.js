// environment variable declaration n shit. 
// DOTENC mod only for local env. fallbacks in case.
require('dotenv').config()
const EXPRESS_PORT = process.env.PORT || 8000
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const SECRET = process.env.SECRET
const CONNECTION_STRING = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
const FRONT_END = process.env.FRONT_END || "http://localhost:3000"
console.log(`key${CONNECTION_STRING}\nExpress port: ${EXPRESS_PORT}\nTalking to: ${FRONT_END}`)

// express modules
const express = require('express')
const session = require('express-session')
const cors = require('cors')
const morgan = require('morgan')

// Mongo Modules
const {MongoClient, ServerApiVersion, ObjectId} = require('mongodb')
const MongoStore = require('connect-mongo')

// encryption modules
const bcrypt = require('bcrypt')

// local imports
const fetchAndParse = require('./util/scraper.js')
const validateUrl = require('./util/UrlCheck.js')
const jobDescription = require('./util/GetJobDescription')

// MongoDB client object
const client = new MongoClient(CONNECTION_STRING, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
})
// MongoDB connection establishment
async function run() {
    try {
      // Connect the client to the server
      await client.connect();
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!")
    }catch(error){
        console.error(error)
    }
  }
  run().catch(console.dir)

// database variable declared empty globally
let db = ''
let users = {}

// session storage on mongo
const sessionStore = MongoStore.create({
    mongoUrl: `${CONNECTION_STRING}`,
    collectionName: "sessions",
    ttl: 3600
})

// global express middleware
const app = express()
    .set("trust proxy", 1)
    .use(session({
            store: sessionStore,
            proxy: true,
            secret: SECRET, // Set a secret key for session signing (replace 'your-secret-key' with your own secret)
            resave: false, // Disable session resaving on each request
            saveUninitialized: false, // Do not save uninitialized sessions
            unset: 'destroy',
            cookie: {
                proxy: true,
                sameSite: 'none', // cross-site
                secure: true, // Set to true if using HTTPS
                httpOnly: false, // Prevent client-side JavaScript from accessing cookies
                maxAge: 1000*60*30, // Session expiration time (in milliseconds)
                domain: process.env.COOKIE_ALLOW,
                path: "/"
    }}))
    .use(express.json())
    .use(cors({
        credentials: true,
        origin: FRONT_END
    }))
    .use(morgan('tiny'))


// API endpoints
// why not. a little fun html output in case someone navigates to my server url
app.get("/", (req, res) => {
    res.send("What are you doing here?\nI didn't want you to see me naked!")
})
app.post('/registration', async (req, res) => {
    // our database and collection as variables
    const db = client.db('resGen')
    const collection = db.collection('users')
    try {
        // map request body elements to valiables for readability. 
        const {firstName, lastName, email, username, password} = req.body
        // Hash the password before saving in the database
        const hashedPassword =  await bcrypt.hash(password, 10)
        // store to object
        const user = {
            firstName,
            lastName,
            username,
            password: hashedPassword,
            email: email.toLowerCase()
        }
        // look for a username and email corresponding with the ones in the request body
        // if exists, reject registration
        const existingUser = await collection.findOne({ username: username })
        const existingEmail = await collection.findOne({ email: email })
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists.' })
        } else if (existingEmail) {
            return res.status(400).json({ message: 'Email already in use.' })
        }
        // insert new user into the user db collection
        let newUser = await collection.insertOne(user)

        console.log(req.session)
        console.log(newUser.insertedId.toString())
        res.header('Access-Control-Allow-Origin', FRONT_END);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.cookie("session", newUser.insertedId.toString(), {
            proxy: true,
            sameSite: 'none', // cross-site
            secure: true, // Set to true if using HTTPS
            httpOnly: false, // Prevent client-side JavaScript from accessing cookies
            maxAge: 60*30*1000, // Session expiration time (in milliseconds)
            domain: process.env.COOKIE_ALLOW,
            path: "/"
        })
        // return to the front end
        console.log(res.cookie)
        return res.status(200).json({ 
            message: 'User created'
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'OH NO! something went wrong!', error })
    }
})
app.post('/login', async (req, res) => {
    let db = client.db('resGen')
    let collection = db.collection('users') 
    try {
        const {username, password} = req.body
        // check to see if usename in database
        const existingUser = await collection.findOne({ 
            username: username
        })
        // obscure rejection
        if (!existingUser) {
            return res.status(403).json({
                message: 'invalid credentials' 
            })
        }
        // password check using bcrypt
        const correctPass = await bcrypt.compare(password, existingUser.password)
        // obscure rejection
        if (!correctPass) {
            return res.status(403).json({ message: 'invalid credentials' })
        } else {

            req.session.isAuth = existingUser._id.toString()
            console.log(process.env.COOKIE_ALLOW)
            const expires = req.session.cookie.expires
            res.header('Access-Control-Allow-Origin', FRONT_END);
            res.header('Access-Control-Allow-Credentials', 'true');
            res.cookie("session", existingUser._id.toString(), {
                proxy: true,
                sameSite: 'none', // cross-site
                secure: true, // Set to true if using HTTPS
                httpOnly: false, // Prevent client-side JavaScript from accessing cookies
                maxAge: 60*30*1000, // Session expiration time (in milliseconds)
                domain: process.env.COOKIE_ALLOW,
                path: "/"
            })

            return res.status(200).json({
                message: "Login Successful"
            })
        }
    }catch (error){
        console.error(error)
    } 
})
app.post('/logout', async (req, res) => {
    console.log(req.headers.cookies)
    let cookies = req.headers.cookies.split(';')
    try{
        for (let cookie of cookies) { 
        console.log(cookie)
        let split = cookie.split("=")
        let cookieName = split[0]
        console.log(cookieName)
        res.header('Access-Control-Allow-Origin', FRONT_END);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.clearCookie(cookieName, {
            proxy: true,
            sameSite: 'none', // cross-site
            secure: true, // Set to true if using HTTPS
            httpOnly: false, // Prevent client-side JavaScript from accessing cookies
            // maxAge: 0, // Session expiration time (in milliseconds)
            domain: process.env.COOKIE_ALLOW,
            path: "/"
        })}
    }catch (error){
        console.error(error)
    }
    return res.send({message:"logout Successful"})
})
app.post('/historyPost', async (req, res) => {
    const db = client.db('resGen')
    const document = req.body
    // document['"date"'] = new Date(document.date)
    console.log("ID Here:", req.headers.id)
    const collection = db.collection('history')
    try {
        await collection.insertOne(document)
        res.json({ message: 'History data stored successfully' })
        console.log("History data sent to server.", document)
    } catch (error) {
        console.error(`Error occurred while inserting document: ${error}`, "\n\nREQUEST BODY:\n\n",req.body)
        res.status(500).json({ message: 'An error occurred' })
    }
})
app.get('/historyGet', async (req, res) => {
    const db = client.db('resGen');
    try {
        const collection = db.collection('history');

        const data = await collection.find({userid: req.headers.id}).toArray();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
})
app.post('/handleFile', async (req, res) => {
    console.log(req)
})
app.post('/completions', async (req, res) => {
    const options = {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "content-Type": "application/json"
        },
        body: JSON.stringify({
            model:"gpt-3.5-turbo",
            messages: [{role:"system",content:"You are to respond to requests for polished resume's and cover letters, helping job seekers match these documents to job descriptions they also provide you."},{role: "user", content: req.body.prompt}],
            temperature: 0.5,
            max_tokens: 2000,
        })
    }
    console.log("error on server before fetch", options)
    try{
        options.body["stream"] = true
        const response = await fetch("https://api.openai.com/v1/chat/completions", options)
        const data = await response.json()
        res.send(data)
        console.log("nice! this user made an API request")
    }catch(error){
        console.log(error)
        console.log(`these were your options: ${options}`)
    }
})
// this is a reconstruction of the input handling and 
// subsequent api requests to gpt for completions
app.post('/completions2', async (req, res) => {
    // top level vars for 
    
    const job = jobDescription(req, OPENAI_API_KEY)
    console.log(job)
})
// socket configuration
// const { Server } = require("socket.io");

// const io = new Server({ /* options */ });

// io.on("connection", (socket) => {
//   // ...
//   console.log("connection made")
// });

// io.listen(8002);
app.listen(EXPRESS_PORT, () => console.log(`Listening on ${EXPRESS_PORT}`));

