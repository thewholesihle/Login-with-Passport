const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const nedb = require('nedb');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 3000;

let db = new nedb({
    autoload: true,
    filename: "database.db"
});

require('dotenv').config();

// Parse JSON bodies (as sent by API clients)
app.use(express.urlencoded({
    extended: true
}))
app.use(express.json());
app.set('view engine', 'ejs');
app.listen(port, console.log(`listening on ${port}`));

app.use(express.static('public'));

// ! GET
app.get('/dashboard', auth, (req, res) => {
    res.status(200).render('index'); // render the dashboard page
})

app.get('/', (req, res) => {
    res.render('login'); // render the login page
})

app.get('/signup', (req, res) => {
    res.render('signup'); // render the login page
})

app.get('/login', (req, res) => {
    console.log(req.query) // snag the query which was created when client tried to access the protected route(/dashboard)
    res.render('login'); // render the login page
})

//! POST REQUESTS
app.post('/register', (req, res) => {
    const data = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(data.password, 10);
        storeUser(db, data, hashedPassword);
        res.status(200).json('success')
    } catch (error) {
        res.status(500).json('Oops! something went wrong :(' + error);
    }
})

app.post('/login', (req, res) => {
    // todo: check if login is valid
    const data = req.body;
    db.findOne({
        email: data.email
    }, {}, (err, doc) => {
        console.log(doc)
        if (err) {
            throw new Error('Oops error on DB');
        }

        // if the user is found
        if (doc) {
            const passwordValid = bcrypt.compareSync(data.password, doc.password)
            // validate password
            if (passwordValid) {
                // token payload
                const payload = {
                    created: doc.created,
                    username: doc.username,
                    email: doc.email
                };

                //create token 
                const token = createToken(payload, process.env.JWT_SECRET);

                // everything went well, so respond with token 
                res.status(200).json({
                    message: 'success',
                    token,
                    status: 200
                });
            } else {
                // password is invalid
                res.status(200).json({
                    message: 'invalid password',
                    status: 200
                })
            }
        } else {
            // no user in database with the given email
            res.status(404).json({
                message: 'user with that email not found',
                status: 404
            })
        }
    })
})


function createToken(payload, secret, expiresIn = '1d') { // token expires in one day by default
    const token = jwt.sign(payload, secret, {
        algorithm: process.env.JWT_ALGO,
        expiresIn,
    });
    return token;
}

function getUserByEmail(email) {
    return db.findOne({
        email
    }, (err, doc) => {
        return doc
    })
}

function storeUser(db, data, hashedPassword) {
    // store to database
    db.insert({
        created: Date.now().toString(),
        username: data.name,
        email: data.email,
        password: hashedPassword
    }, (err) => {
        return 'error occured'
    })
}