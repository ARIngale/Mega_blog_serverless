import express, { json } from 'express';
import mongoose from 'mongoose';
import dotenv from "dotenv";
dotenv.config();
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import aws from "aws-sdk";
// import { Blog } from './Schema/Blog.js';
// import { User } from './Schema/User.js';
// import { Notification } from './Schema/Notification.js';
// import { Comment } from './Schema/Comment.js';
import { User } from './Schema/User.js';
import { Blog } from './Schema/Blog.js';
import { Notification } from './Schema/Notification.js';
import { Comment } from './Schema/Comment.js';
import serverless from "serverless-http";


const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

const server = express();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});


server.use(express.json());
server.use(cors());

// mongoose.connect(process.env.DB_LOCATION, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//     autoIndex: true,
// });


mongoose.connect(process.env.DB_LOCATION, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: true,
})
.then(() => console.log('MongoDB Connected Successfully'))
.catch(err => console.error('MongoDB Connection Error:', err));


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


    Blog.countDocuments(findQuery)
        .then(count => {
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

server.post("/update-profile-img", verifyJWT, (req, res) => {

    let {url}=req.body;
    User.findOneAndUpdate({_id:req.user},{"personal_info.profile_img":url})
    .then(()=>{
        return res.status(200).json({profile_img:url})
    })
    .catch(err=>{
        return res.status(500).json({error:err.message})
    })
})

server.post("/update-profile", verifyJWT, (req, res) => {

    let {username,bio,social_links}=req.body;
    let biolimit=150;

    if(username.length < 3){
        return res.status(403).json({error:"Username should be at least 3 letters long"});
    }

    if(bio.length > biolimit){
        return res.status(403).json({error:`Bio should not be more than ${biolimit} characters`});
    }

    let socailLinkArr=Object.keys(social_links);

    try{
        for(let i=0;i<socailLinkArr.length;i++){
            if(social_links[socailLinkArr[i]].length){
                let hostname=new URL(social_links[socailLinkArr[i]]).hostname;

                if(!hostname.includes(`${socailLinkArr[i]}.com`) && socailLinkArr[i] !== 'website'){
                    return res.status(403).json({error:`${socailLinkArr[i]} link is invalid. You must enter a full links`});
                }
                
            }
        }
    }
    catch(err) {
        return res.status(500).json({error:"You must provide full socail links with http(s) included"})
    }

    let UpdateObj={
        "personal_info.username":username,
        "personal_info.bio":bio,
        social_links
    }

    User.findOneAndUpdate({_id:req.user},UpdateObj,{runValidators:true})
    .then(()=>{
        return res.status(200).json({username})
    })
    .catch(err=>{
        if(err.code === 11000){
            return res.status(409).json({error:"Username is alredy taken"})
        }
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

server.post('/get-blog', async (req, res) => {
    try {
        const { blog_id, draft, mode } = req.body;
        const incrementVal = mode !== 'edit' ? 1 : 0;

        // Update the blog's activity
        const blog = await Blog.findOneAndUpdate(
            { blog_id },
            { $inc: { "activity.total_reads": incrementVal } },
            { new: true }
        )
            .populate("author", "personal_info.fullname personal_info.username personal_info.profile_img")
            .select("title des content banner activity publishedAt blog_id tags");

        if (!blog) {
            // If blog is not found, return 404 and stop further execution
            return res.status(404).json({ error: "Blog not found" });
        }

        // Check if the blog is a draft and access is not allowed
        if (blog.draft && !draft) {
            return res.status(403).json({ error: "You cannot access draft blogs" });
        }

        // Update the author's total reads
        if (blog.author?.personal_info?.username) {
            await User.findOneAndUpdate(
                { "personal_info.username": blog.author.personal_info.username },
                { $inc: { "account_info.total_reads": incrementVal } }
            );
        }

        // Send back the blog data
        return res.status(200).json({ blog });
    } catch (err) {
        console.error("Error in /get-blog route:", err); // Log error for debugging
        return res.status(500).json({ error: "An internal server error occurred." });
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
    let {_id,comment,blog_author,replying_to,notification_id}=req.body;

    if(!comment.length){
        return res.status(403).json({error:'Write something to leave the comment'})
    }

    let commentObj={
        blog_id:_id,blog_author,comment,commented_by:user_id,
    }

    if(replying_to){
        commentObj.parent=replying_to;
        commentObj.isReply=true;
        
    }

    new Comment (commentObj).save().then ( async commentFile => {
        
        let {comment,commentedAt,children}=commentFile;

        Blog.findOneAndUpdate({_id},{$push:{"comments":commentFile._id},$inc:{"activity.total_comments":1},"activity.total_parent_comments":replying_to ? 0:1})
        .then(blog => {console.log('New Comment created')});
        
        let notificationObj={
            type:replying_to? "reply":"comment",
            blog:_id,
            notification_for:blog_author,
            user:user_id,
            comment:commentFile._id
        }

        if(replying_to){
            notificationObj.replied_on_comment=replying_to;

            await Comment.findOneAndUpdate({_id:replying_to},{$push:{children:commentFile._id}})
            .then(replyingToCommentDoc => {notificationObj.notification_for= replyingToCommentDoc.commented_by}) 

            if(notification_id){
                Notification.findOneAndUpdate({_id:notification_id},{reply: commentFile._id})
                .then(notification =>console.log('notification updated') ) 
            }

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
        return res.status(200).json(comments)
        
    })
    .catch(err => {
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


server.get("/new-notification", verifyJWT, (req, res) => {
    
        const user_id = req.user;

       Notification.exists({
            notification_for: user_id,
            seen: false,
            user: { $ne: user_id }
        })
        .then(result => {
            res.status(200).json({ new_notification_available:!!result });
            
        })
    .catch (err=> {
        res.status(500).json({ error: err.message });
    })
});

server.post('/notifications',verifyJWT,(req,res) => {
    let user_id=req.user;
    let {page,filter,deletedDocCount}=req.body;

    let maxLimit=10;

    let findQuery={notification_for:user_id,user:{$ne:user_id}};
    let skipsDocs=(page-1)*maxLimit;

    if(filter !== 'all'){
        findQuery.type=filter;
    } 
    if(deletedDocCount){
        skipsDocs-=deletedDocCount;
    }

    Notification.find(findQuery)
    .skip(skipsDocs)
    .limit(maxLimit)
    .populate("blog","title blog_id")
    .populate("user","personal_info.fullname personal_info.username personal_info.profile_img")
    .populate("comment","comment")
    .populate("replied_on_comment","comment")
    .populate("reply","comment")
    .sort({createdAt:-1})
    .select("createdAt type seen reply")
    .then(notifications => {

        Notification.updateMany(findQuery,{seen:true})
        .skip(skipsDocs)
        .limit(maxLimit)
        .then(notifications => console.log('notification seen'))


        return res.status(200).json({notifications});
    })
    .catch (err=> {
        res.status(500).json({ error: err.message });
    })

})

server.post("/all-notifications-count",verifyJWT,(req,res) => {
    let user_id=req.user;
    let {filter}=req.body;
    let findQuery={notification_for:user_id,user:{$ne:user_id}};

    if(filter !== 'all'){
        findQuery.type=filter;
    } 

    Notification.countDocuments(findQuery)
    .then(count => {
        return res.status(200).json({totalDocs:count});
    })
    .catch (err=> {
        res.status(500).json({ error: err.message });
    })
})


server.post("/get-replies",(req,res) => {
    let {_id,skip}=req.body;
    let maxlimit=5;

    Comment.findOne({_id})
    .populate({
        path:"children",
        option:{
            limit:maxlimit,
            skip:skip,
            sort:{'commentedAt':-1}
        },
        populate:{
            path:'commented_by',
            select:"personal_info.profile_img personal_info.fullname personal_info.username"
        },
        
    })
    .select("children")
    .then(doc => {
        return res.status(200).json({replies:doc.children});
    })
    .catch (err=> {
        res.status(500).json({ error: err.message });
    })

})

const deleteComments = async (_id) => {
    try {
        // Find and delete the comment
        const comment = await Comment.findOneAndDelete({ _id });

        if (!comment) {
            throw new Error("Comment not found");
        }

        // If the comment has a parent, remove it from the parent's children array
        if (comment.parent) {
            await Comment.findOneAndUpdate(
                { _id: comment.parent },
                { $pull: { children: _id } }
            );
        }

        // Delete related notifications
        await Notification.findOneAndDelete({ comment: _id });

        await Notification.findOneAndUpdate(
            { reply: _id },
            { $unset: { reply: 1 } }
        );

        // Remove the comment from the blog's comments and decrement total comments count
        await Blog.findOneAndUpdate(
            { _id: comment.blog_id },
            {
                $pull: { comments: _id },
                $inc: { "activity.total_comments": -1 },
            }
        );

        // Recursively delete child comments
        if (comment.children.length) {
            for (const childId of comment.children) {
                await deleteComments(childId);
            }
        }
    } catch (err) {
        throw err; // Propagate the error to the caller
    }
};


server.post("/delete-comment", verifyJWT, async (req, res) => {
    const user_id = req.user;
    const { _id } = req.body;

    try {
        // Find the comment
        const comment = await Comment.findOne({ _id });
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

    
        if (
            user_id === comment.commented_by.toString() ||
            user_id === comment.blog_author.toString()
        ) {
            // Call the deleteComments function
            await deleteComments(_id);
            return res.status(200).json({ status: "Comment deleted successfully" });
        } else {
            return res.status(403).json({ error: "You cannot delete this comment" });
        }
    } catch (err) {
        console.error("Error in /delete-comment route:", err.message);
        return res.status(500).json({ error: "An error occurred while deleting the comment" });
    }
});


server.post("/user-written-blogs",verifyJWT,(req,res) => {
    let user_id=req.user;
    let {page,draft,query,deletedDocCount}=req.body;
    let maxlimit=5;
    let skipDocs=(page-1)*maxlimit;

    if(deletedDocCount){
        skipDocs=deletedDocCount;
    }
    Blog.find({author:user_id,draft,title:new RegExp(query,'i')})
    .skip(skipDocs)
    .limit(maxlimit)
    .sort({publishedAt:-1})
    .select("title banner publishedAt blog_id activity des draft")
    .then(blogs => {
        return res.status(200).json({blogs})
    })
    .catch (err=> {
        return res.status(500).json({ error: err.message });
    }); 

})


server.post("/user-written-blogs-count",verifyJWT,(req,res) => {
    let user_id=req.user;
    let {draft,query}=req.body;

    Blog.countDocuments({author:user_id,draft,title:new RegExp(query,'i')})
    .then(count => {
        return res.status(200).json({totalDocs:count})
    })
    .catch(err =>{
        return res.status(500).json({error:err.message});
    })
})



// module.exports.handler = serverless(app);
export const handler = serverless(server);

