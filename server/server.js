import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { User } from './Schema/User.js';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

const server = express();
const PORT = 4000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


server.use(express.json());
server.use(cors());

mongoose.connect(process.env.DB_LOCATION, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: true,
});

const generateUsername = async (email) => {
    let username = email.split('@')[0];
    const isUsernameNotUnique = await User.exists({ 'personal_info.username': username });

    if (isUsernameNotUnique) {
        username += nanoid().substring(0, 5);
    }

    return username;
};

const formatDatatoSend = (user) => {
    const access_token = jwt.sign({ id: user.id }, process.env.SECREAT_ACCESS_KEY);
    return {
        access_token,
        profile_img: user.personal_info.profile_img,
        username: user.personal_info.username,
        fullname: user.personal_info.fullname,
    };
};

// Signup Route
server.post('/signup', (req, res) => {
    const { fullname, email, password } = req.body;

    if (!fullname) {
        return res.status(403).json({ error: 'Enter the name' });
    }
    if (!email || !emailRegex.test(email)) {
        return res.status(403).json({ error: 'Enter a valid email' });
    }
    if (!passwordRegex.test(password)) {
        return res.status(403).json({
            error: 'Password should be 6 to 20 characters long with a numeric, 1 lowercase, and 1 uppercase letter',
        });
    }

    bcrypt.hash(password, 10, async (err, hash_password) => {
        const username = await generateUsername(email);

        const user = new User({
            personal_info: { fullname, email, password: hash_password, username },
        });

        user.save()
            .then((u) => res.status(200).json(formatDatatoSend(u)))
            .catch((err) => {
                if (err.code === 11000) {
                    return res.status(500).json({ error: 'Email already exists' });
                }
                return res.status(500).json({ error: err.message });
            });
    });
});

// Sign-in Route
server.post('/signin', (req, res) => {
    const { email, password } = req.body;

    User.findOne({ 'personal_info.email': email })
        .then((user) => {
            if (!user) {
                return res.status(403).json({ error: 'Email not found' });
            }

            if (!user.google_auth) {
                bcrypt.compare(password, user.personal_info.password, (err, result) => {
                    if (err || !result) {
                        return res.status(403).json({ error: 'Incorrect Password' });
                    }
                    return res.status(200).json(formatDatatoSend(user));
                });
            } else {
                return res.status(403).json({ error: 'Account created with Google. Use Google Sign-In.' });
            }
        })
        .catch((err) => res.status(500).json({ error: err.message }));
});

// Google Auth Route
server.post('/google-auth', async (req, res) => {
    const { access_token } = req.body;

    getAuth()
        .verifyIdToken(access_token)
        .then(async (decodedUser) => {
            const { email, name, picture } = decodedUser;

            let user = await User.findOne({ 'personal_info.email': email });
            if (!user) {
                const username = await generateUsername(email);
                user = new User({
                    personal_info: { fullname: name, email, username },
                    google_auth: true,
                });
                await user.save();
            }

            return res.status(200).json(formatDatatoSend(user));
        })
        .catch(() => res.status(500).json({ error: 'Failed to authenticate with Google. Try another account.' }));
});

// Start the Server
server.listen(PORT, () => {
    console.log(`Listening on port -> ${PORT}`);
});
