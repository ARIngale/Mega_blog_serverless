import express, { json } from 'express';
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
import { Notification } from './Schema/Notification.js';
import { Comment } from './Schema/Comment.js';

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

    let {tag,query,author,page,limit,eliminate_blog}=req.body;

    let findQuery;

    if(tag){
        findQuery={tags:tag,draft:false,blog_id:{$ne:eliminate_blog}};
    }
    else if(query){
        findQuery={draft:false,title:new RegExp(query,'i')};
    }else if(author){
        findQuery={author,draft:false}
    }

    let maxLimit=limit?limit:5;

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

    let {tag,author,query}=req.body;

    let findQuery;

    if(tag){
        findQuery={ tags: { $in: tag }, draft: false };
    }    
    else if(query){
        findQuery = { title: new RegExp(query, 'i'), draft: false };
    }
    else if(author){
        findQuery={author,draft:false}
    }


    // let findQuery = { tags: { $in: tags }, draft: false };
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

server.post("/search-users", (req,res) => {
    let {query}=req.body;

    User.find({"personal_info.username":new RegExp(query, 'i')})
    .limit(50)
    .select("personal_info.fullname personal_info.username personal_info.profile_img")
    .then(users => {
        return res.status(200).json({users})
    })
    .catch(err => {
        return res.status(500).json({error:err.message})
    })
})

server.post("/get-profile", (req,res) => {
    let {username}=req.body;

    User.find({"personal_info.username": username})
    .select("-personal_info.password -google_auth -updatedAt -blogs")
    .then(users => {
        return res.status(200).json({users})
    })
    .catch(err => {
        return res.status(500).json({error:err.message})
    })
})


server.post('/create-blog',verifyJWT,(req,res) => {
    let authorId=req.user;
    let {title,des,banner,tags,content,draft,id}=req.body;


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
    let blog_id = id ||  title.replace(/[^a-zA-Z0-9]/g,'').replace(/\s+/g,"-").trim()+nanoid();

    if(id){
        Blog.findOneAndUpdate({blog_id},{title,des,banner,content,tags,draft: draft ? draft:false})
        .then(() => {
            return res.status(200).json({id:blog_id});
        })
        .catch(err => {
            return res.status(500).json({ error: err.message });
        });
    }else{
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
    }
    
    

    // return res.json({status:'done'})
})

// get blogs

server.post('/get-blog', async (req, res) => {
    try {
        const { blog_id ,draft,mode} = req.body;
        const incrementVal =  mode !== 'edit' ? 1 : 0;

        // Update the blog's activity
        const blog = await Blog.findOneAndUpdate(
            { blog_id },
            { $inc: { "activity.total_reads": incrementVal } },
            { new: true }
        )
            .populate("author", "personal_info.fullname personal_info.username personal_info.profile_img")
            .select("title des content banner activity publishedAt blog_id tags");

        if (!blog) {
            return res.status(404).json({ error: "Blog not found" });
        }

        // Update the user's total_reads
        if (blog.author && blog.author.personal_info && blog.author.personal_info.username) {
            await User.findOneAndUpdate(
                { "personal_info.username": blog.author.personal_info.username },
                { $inc: { "account_info.total_reads": incrementVal } }
            );
        }
        if(blog.draft && !draft){
            return res.status(500).json({ error: 'you can not access the draft blogs' });
        }

        return res.status(200).json({ blog });

        
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }   
   

    
});

server.post("/liked-blog",verifyJWT,(req,res) => {
    let user_id=req.user;
    let {_id,islikedByUser}=req.body;
    let incremet=!islikedByUser ? 1 : -1;

    Blog.findOneAndUpdate({_id},{$inc:{"activity.total_likes":incremet}})
    .then(blog => {
        if(!islikedByUser){
            let like=new Notification({
                type:"like",
                blog:_id,
                notification_for:blog.author,
                user:user_id
            })
            like.save().then(notification => {
                return res.status(200).json({liked_by_user:true})
            })
        }
    })
})


server.post("/isliked-by-user",verifyJWT,(req,res) => {
    let user_id=req.user;
    let {_id}=req.body;

    Notification.exists({user:user_id,type:"like",blog:_id})
    .then(result => {
        return res.status(200).json({result})
    })
    .catch(err => {
        return res.status(500).json({error:err.message})
    })
})

server.post("/add-comment",verifyJWT,(req,res) => {
    let user_id=req.user;
    let {_id,comment,blog_author}=req.body;

    if(!comment.length){
        return res.status(403).json({error:'Write something to leave the comment'})
    }

    let commentObj=new Comment({
        blog_id:_id,blog_author,comment,commented_by:user_id,
    })

    commentObj.save().then(commentFile => {
        
        let {comment,commentedAt,children}=commentFile;

        Blog.findOneAndUpdate({_id},{$push:{"comments":commentFile._id},$inc:{"activity.total_comments":1},"activity.total_parent_comments":1})
        .then(blog => {console.log('New Comment created')});
        
        let notificationObj={
            type:"comment",
            blog:_id,
            notification_for:blog_author,
            user:user_id,
            comment:commentFile._id
        }

        new Notification(notificationObj).save().then(notification => console.log('new notification created'));
        return res.status(200).json({
            comment,commentedAt,_id:commentFile._id,user_id,children
        })
    })

})

server.post("/get-blog-comments",(req,res) => {
    let {blog_id,skip}=req.body;
    let maxlimit=5;

    Comment.find({blog_id})
    .populate("commented_by","personal_info.username personal_info.fullname personal_info.profile_img")
    .skip(skip)
    .limit(maxlimit)
    .sort({
        'commentedAt':-1
    })
    .then(comments => {
        console.log(comments);
        return res.status(200).json(comments)
        
    })
    .catch(err => {
        console.log(err.message);
        return res.status(500).json({error:err.message})
    })
})

server.post("/change-password",verifyJWT,(req,res) => {
    let {currentPassword, newPassword}=req.body;

    if(!passwordRegex.test(currentPassword) || !passwordRegex.test(newPassword)){
        return res.status(403).json({error:"Password should be 6 to 20 characters long with a numeric, 1 lowercase, and 1 uppercase letter"});
    }

    User.findOne({_id:req.user})
    .then((user) =>{
        if(user.google_auth){
            return res.status(403).json({error:"you cant change the accounts password because you logged in thorough google"});
        }

        bcrypt.compare(currentPassword,user.personal_info.password,(err,result) => {
            if(err){
                return res.status(500).json({error:"Some error occured while changing the password,please try again later"});
            }
            if(!result){
                return res.status(403).json({error:"Incorrect current Password"});
            }

            bcrypt.hash(newPassword,10,(err,hash_password) => {
                User.findOneAndUpdate({_id:req.user},{"personal_info.password":hash_password})

                .then((u) => {
                    return res.status(200).json({status:"Password Changed"})
                })
                .catch(err => {
                    return res.status(500).json({error:'Some error Occured while saving new password, please try again later'})
                })
            })
        })

    })

    .catch(err => {
        return res.status(500).json({error:'User not found'})
    })
})

// Start the Server
server.listen(PORT, () => {
    console.log(`Listening on port -> ${PORT}`);
});