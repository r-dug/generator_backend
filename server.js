require('dotenv').config()
const EXPRESS_PORT = process.env.PORT
const HTTP_PORT = process.env.WS_PORT 
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const SECRET = process.env.SECRET
const CONNECTION_STRING = process.env.MONGODB_URI
const FRONT_END = process.env.FRONT_END
console.log(`key${CONNECTION_STRING}\n${EXPRESS_PORT}\n${HTTP_PORT}\n${SECRET}\n${FRONT_END}`)
const express = require('express')
const path = require('path');
const session = require('express-session')
const cors = require('cors')
const {MongoClient, ServerApiVersion, ObjectId} = require('mongodb')
const bodyParser = require('body-parser')
const bcrypt = require('bcrypt')
const morgan = require('morgan')
// const server = express()
//     .use(cors())
//     .use(morgan('tiny'))
//     .listen(HTTP_PORT, () => console.log(`Listening on ${HTTP_PORT}`));


console.log(FRONT_END)
const app = express()
    .use(express.json())
    .use(cors())
    .use(morgan('tiny'))



// app.use(
//     session({
//       secret: SECRET, // Set a secret key for session signing (replace 'your-secret-key' with your own secret)
//       resave: false, // Disable session resaving on each request
//       saveUninitialized: false, // Do not save uninitialized sessions
//       cookie: {
//         secure: false, // Set to true if using HTTPS
//         httpOnly: true, // Prevent client-side JavaScript from accessing cookies
//         maxAge: 1800000, // Session expiration time (in milliseconds)
//       },
//     })
//   )



// MongoDB connection
const client = new MongoClient(CONNECTION_STRING, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
})
// connection establish and log error or success
async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }catch(error){
        console.error(error)
    }
  }
  run().catch(console.dir);
// database variable declared empty globally
let db = client.db('resGen')
let users = {}



// MIDDLEWARE function to protect certain endpoints
// const isAuthenticated = (req, res, next) => {

//     if (req.session.user) {
//       // User is authenticated, proceed to the next middleware or route handler
//       next();
//     } else {
//       // User is not authenticated, redirect to the login page or send an error response
//       res.redirect(`${FRONT_END}/login`);
//     }
//   };

// Set up socket connection


// Multer configuration for file validation. 
// const upload = multer({
//     dest: 'uploads/', // Temporary storage location
//     fileFilter: (req, file, cb) => {
//       // Validate file type
//       if (file.mimetype == 'text/plain' || file.mimetype == 'application/pdf' || file.mimetype == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
//         // Accept file
//         cb(null, true);
//       } else {
//         // Reject file
//         cb(null, false);
//         cb(new Error('Only .txt, .pdf and .docx format allowed!'));
//       }
//     }
//   });
  
// request paths
// Route to handle file upload
// server.post('/upload', upload.single('file'), (req, res) => {
//     if (!req.file) {
//       // No file was uploaded, or wrong file type
//       return res.status(400).send('Invalid file type. Only .png, .jpg and .jpeg are allowed');
//     }
  
//     // File was uploaded & validated. Now we insert its data into the MongoDB database.
//     const fileData = {
//       originalName: req.file.originalname,
//       mimeType: req.file.mimetype,
//       size: req.file.size,
//       path: req.file.path,
//       uploadDate: new Date(),
//     }
  
//     db.collection('uploads').insertOne(fileData, (err, result) => {
//       if (err) {
//         console.error('Error inserting document into MongoDB', err);
//         return res.status(500).send('Error occurred while saving file data')
//       }
  
//       console.log('Successfully inserted document into MongoDB', result);
//       res.send('File uploaded and data stored successfully')
//     })
//     })

    //   let data = await collection.find({}).toArray();
    //   res.json(data);

app.post('/registration', async (req, res) => {
    const db = client.db('resGen')
    const collection = db.collection('users')
    try {
        const existingUser = await collection.findOne({ username: req.body.username })

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' })
        }
    
        const existingEmail = await collection.findOne({ email: req.body.email })

        if (existingEmail) {
            return res.status(400).json({ message: 'this Email is already in use.' })
        }
    // Hash the password before saving in the database
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const user = {
        // user_id: reversed and hashed username?
        username: req.body.username,
        password: hashedPassword,
        email: req.body.email
    }
    
    let result = await collection.insertOne(user);
    res.status(201).json({ message: 'User created', userId: result.insertedId })
    } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'app error', error })
    }
})
 
app.post('/login', async (req, res) => {
    console.log("session:", req.session)
    const db = client.db('resGen')
    const collection = db.collection('users') 
    const document = req.body
    console.log(res.status)
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const existingUser = await collection.findOne({ username: document.username })
    const correctPass = await bcrypt.compare(document.password, hashedPassword)
    let userpass = await collection.findOne({ username: document.username })
    console.log(existingUser)
    if (!existingUser) {
        return res.status(400).json({ message: 'Incorrect Uname' })
    } else if (!correctPass) {
        return res.status(400).json({ message: 'Incorrect Password' })
    } else {
        return res.status(200).json({message: "Login Successful", user: userpass._id})
    }
    
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

// this should maybe be in a seperate class than any tasks that have to do with the database. maybe an externalApi class or something
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
            temperature: 0.1,
            max_tokens: 2000,
        })
    }
    console.log("error on server before fetch", options)
    try{
        options.body["stream"] = true
        const response = await fetch("https://api.openai.com/v1/chat/completions", options)
        const data = await response.json()
        res.send(data)
        console.log(data)
    }catch(error){
        console.log(error)
        console.log(`these were your options: ${options}`)
    }
})

app.listen(EXPRESS_PORT, () => console.log(`Listening on ${EXPRESS_PORT}`));

// const { Server } = require('ws')
// const wss = new Server({ app })
// wss.on('connection', (ws) => {
//     console.log('A connection has been made');
  
//     // Event listener for the 'login' event
//     ws.on('login', (userId) => {
//         console.log(`User ${userId} logged in`);
        // users[userId] = ws; // Associate this ws with the user

        // // Example code for watching changes in a MongoDB collection
        // const userIdHex = new ObjectId(userId); // Convert userId to ObjectId
        // // console.log(userIdHex)
        // // Replace 'historyCollection' with your actual collection name
        // const historyCollection = db.collection('history');
        // // console.log(historyCollection)
        // // Start listening to changes
        // const changeStream = historyCollection.watch({ $match: { 'fullDocument.userId': userIdHex } });

        // changeStream.on('change', (change) => {
        //     console.log(`Detected change in ${userId}'s history:`, change);
        //     // Emit the change to the client
        //     ws.emit('historyChange', change);
        //     });
    
        // Clean up the change stream when user disconnects
        ws.on('logout', (userId) => {
            console.log(`User ${userId} disconnected`);
            changeStream.close();
            delete users[userId]; // Remove this user's ws
            });
        ws.on('close', () => console.log('Client disconnected'))
    });
  });

// GPT suggestions:
// Readability: The code is readable and follows a consistent coding style with proper indentation and naming conventions. The use of separate sections for different functionality (e.g., server setup, routes, ws connection) improves code organization.

// Performance improvements:

//     Connection Handling: The ws.io connection is established inside the io.on('connection') event listener. It's important to note that the event listener is invoked for each new connection. To avoid creating multiple connections for each user, you should move the socket connection setup outside of the event listener to ensure a single connection is used.

//     Database Connection: Currently, the database connection is established twice: once using client.connect and then again using client.db. You can remove the first client.connect call since the connection is already established when creating the MongoClient instance.

//     Error Handling: Error handling in the route handlers could be improved. Instead of console logging the error and sending a generic error response, you can provide more specific error messages and appropriate HTTP status codes based on the error type.

//     Environment Configuration: Instead of hardcoding the server URL (http://localhost:3000) and MongoDB connection details (mongodb://127.0.0.1:27017), consider using environment variables or configuration files to make these values configurable based on the deployment environment.

//     Middleware Usage: The body-parser middleware is not required in Express 4.16+ as it is included by default. You can remove the line app.use(bodyParser.json()).

//     File Upload: The code related to file upload using Multer is commented out. If file upload functionality is required, you can uncomment and configure it appropriately.

//     Error Handling Middleware: It would be beneficial to add an error handling middleware to handle any uncaught errors and provide appropriate responses to the client.

//     Security: Consider implementing security measures such as input validation, sanitization, and user authentication/authorization depending on your application's requirements.

// These are general suggestions, and the actual performance improvements will depend on the specific requirements and performance bottlenecks of your application.