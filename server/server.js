import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config'
import bcrypt from 'bcrypt';
import User from './Schema/User.js';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';

const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

const server = express();
const PORT = 4000;

server.use(express.json());

mongoose.connect(process.env.DB_LOCATION, {
    autoIndex:true
})

const generateUsername=async (email) => {
    let username=email.split("@")[0];
    let isUsernameNotUnique=await User.exists({"personal_info.username":username}).then((result) => result)
    
    isUsernameNotUnique ? username += nanoid().substring(0,5):"";

    return username;
}

const formatDatatoSend = (user) => {
    const access_token = jwt.sign({id:user.id},process.env.SECREAT_ACCESS_KEY)
    return {
        access_token,
        profile_img:user.personal_info.profile_img,
        username:user.personal_info.username,
        fullname:user.personal_info.fullname,
    }
}

server.post("/signup",(req,res) => {
    let {fullname,email,password}=req.body;
    
    if (!fullname.length) {
        return res.status(403).json({ error: 'Enter the name' });
    }
    if (!email.length) {
        return res.status(403).json({ error: 'Enter the email' });
    }
    if (!emailRegex.test(email)) {
        return res.status(403).json({ error: 'Email is invalid' });
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
            .then(u => {
                return res.status(200).json(formatDatatoSend(u));
            })
            .catch(err => {
                if(err.code === 11000){
                    return res.status(500).json({ "error": "Email already exist" });
                }
                return res.status(500).json({ "error": err.message });
            });


    })
})

server.post("/signin",(req,res) => {
    let {email,password}=req.body;
    
    User.findOne({"personal_info.email":email})
    
    .then((user) => {
        if(!user){
            return res.status(403).json({"error":"Email not found"});
        }
        
        bcrypt.compare(password,user.personal_info.password,(err,result) => {
            if(err){
                return res.status(403).json({"error":"Error occured while login please try again"})
            }
            if(!result){
                return res.status(403).json({ "error": "Incorrect Password" });
            }else{
                return res.status(200).json(formatDatatoSend(user))
            }
        })

    })
    .catch(err => {
        console.log(err);
        return res.status(500).json({"error":err.message})
    })
})


server.listen(PORT, () => {
    console.log('Listening on port -> ' + PORT);
});
