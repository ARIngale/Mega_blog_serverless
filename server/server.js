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
import aws from "aws-sdk";
import { Blog } from './Schema/Blog.js';

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

// setting up s3 bucket
const s3 = new aws.S3({
    region: 'ap-southeast-2',
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey:process.env.AWS_SECREAT_ACCESS_KEY
})

const generateUploadURL = async () => {
    const date=new Date();
    const imagename = `${nanoid()}-${date.getTime()}.jpeg`

   return await s3.getSignedUrlPromise('putObject', {
        Bucket:'mega-blog-web',
        Key: imagename,
        Expires:1000,
        ContentType:"image/jpeg"
    })
}

const generateUsername = async (email) => {
    let username = email.split('@')[0];
    const isUsernameNotUnique = await User.exists({ 'personal_info.username': username });

    if (isUsernameNotUnique) {
        username += nanoid().substring(0, 5);
    }

    return username;
};

const verifyJWT = (req,res,next) => {
    const authHeader=req.headers['authorization'];
    const token=authHeader && authHeader.split(" ")[1];

    if(token === null){
        return res.status(401).json({error:"No access token"})
    }

    jwt.verify(token,process.env.SECREAT_ACCESS_KEY,(err,user) =>{
        if(err) {
            return res.status(403).json({error:"Access token is invalid"})
        }
        req.user=user.id;
        next();
    })
}

const formatDatatoSend = (user) => {
    const access_token = jwt.sign({ id: user.id }, process.env.SECREAT_ACCESS_KEY);
    return {
        access_token,
        profile_img: user.personal_info.profile_img,
        username: user.personal_info.username,
        fullname: user.personal_info.fullname,
    };
};

//upload image url route

server.get('/get-upload-url', (req,res) => {
    generateUploadURL().then(url => res.status(200).json({uploadURL:url}))
    .catch(err => {
        console.log(err.message)
        return res.status(500).json({error:err.message})
    })
})

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

server.post('/latest-blog',(req,res) => {
    let maxLimit=5;

    let {page}=req.body;

    Blog.find({draft:false})
    .populate("author","personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({"publishedAt":-1})
    .select("blog_id title des banner activity tags publishedAt -_id")
    .skip((page-1) * maxLimit)
    .limit(maxLimit)
    .then(blogs => {
        return res.status(200).json({blogs})
    })
    .catch(err => {
        return res.status(500).json({error:err.message})
    })
});

server.post("/all-latest-blogs-count",(req,res) => {
    Blog.countDocuments({draft:false})
    .then(count => {
        return res.status(200).json({totalDocs:count})
    })
    .catch(err => {
        console.log(err.message);
        return res.status(500).json({error:err.message})
    })
});

server.get('/treanding-blog',(req,res) => {
    let maxLimit=5;

    Blog.find({draft:false})
    .populate("author","personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({"activity.total_reads":-1,"activity.total_likes":-1})
    .select("blog_id title publishedAt -_id")
    .limit(maxLimit)
    .then(blogs => {
        return res.status(200).json({blogs})
    })
    .catch(err => {
        return res.status(500).json({error:err.message})
    })
});


server.post('/search-blogs',(req,res) => {
    let {tag,page}=req.body;
    let findQuery={tags:tag,draft:false};
    let maxLimit=5;
    Blog.find(findQuery)
    .populate("author","personal_info.profile_img personal_info.username personal_info.fullname -_id")
    .sort({"publishedAt":-1})
    .select("blog_id title des banner activity tags publishedAt -_id")
    .skip((page-1)*maxLimit)
    .limit(maxLimit)
    .then(blogs => {
        return res.status(200).json({blogs})
    })
    .catch(err => {
        return res.status(500).json({error:err.message})
    })
})

server.post('/search-blogs-count', (req, res) => {

    let { tags } = req.body;
    // console.log("Extracted tags:", tags);

    // if (!tags || !Array.isArray(tags)) {
    //     return res.status(400).json({ error: "Invalid or missing 'tags' field. It should be an array." });
    // }

    let findQuery = { tags: { $in: tags }, draft: false };
    // console.log("Find query:", findQuery);

    Blog.countDocuments(findQuery)
        .then(count => {
            // console.log("Count:", count);
            return res.status(200).json({ totalDocs: count });
        })
        .catch(err => {
            // console.error("Error:", err);
            return res.status(500).json({ error: err.message });
        });
});



server.post('/create-blog',verifyJWT,(req,res) => {
    let authorId=req.user;
    let {title,des,banner,tags,content,draft}=req.body;


    if(!title.length){
        return res.status(403).json({error:"You must provide a title"})
    }

    if(!draft){
        if(!des.length || des.length > 200){
            return res.status(403).json({error:"You must provide a blog description undere 200 characters"})
        }
        if(!banner.length){
            return res.status(403).json({error:"You must provide a blog banner to publish the blog"})
        }
        if(!content.blocks.length){
            return res.status(403).json({error:"There must be some blog content to publish it"})
        }
        if(!tags.length || tags.length > 10){
            return res.status(403).json({error:"Provide tags in order to publish the blog, Maximum 10"})
        }
    }
  

    tags=tags.map(tag => tag.toLowerCase());
    let blog_id = title.replace(/[^a-zA-Z0-9]/g,'').replace(/\s+/g,"-").trim()+nanoid();

    let blog = new Blog({
        title, des, banner, tags, content, author: authorId, blog_id, draft: Boolean(draft),
    });    
    
    blog.save()
        .then(blog => {
            let incrementVal = draft ? 0 : 1;
    

User.findOneAndUpdate(
    { _id: authorId },
    {
        $inc: { "account_info.total_posts": incrementVal },
        $push: { "blogs": blog._id },

    },
    { new: true, upsert: false }
)
    .then(user => {
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        return res.status(200).json({ id: blog.blog_id });
    })
    .catch(err => {
        console.error("Error updating user:", err);
        return res.status(500).json({
            error: "Failed to update total posts numbers",
            details: err.message,
        });
    });

            
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
    

    // return res.json({status:'done'})
})

// Start the Server
server.listen(PORT, () => {
    console.log(`Listening on port -> ${PORT}`);
});
