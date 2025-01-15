import { useContext, useEffect, useState } from "react";
import { UserContext } from "../App";
import toast from "react-hot-toast";
import axios from "axios";
import { BlogContext } from "../pages/blog.page";

const CommentField=({action})=>{

    const [comment,setComment]=useState("");
    
    let {userAuth:{access_token,username,fullname,profile_img}}=useContext(UserContext);
    
    let {blog,blog:{_id,author:{_id:blog_author},comments,comments:{results:commentsArr},activity,activity:{total_comments,total_parent_comments}},setBlog,setTotalParentCommentsLoaded}=useContext(BlogContext)

    const handleComment=()=>{
        if(!access_token){
            return toast.error("logim first to leave a comment")
        }
        if(!comment.length){
            return toast.error("Write something to leave a comment.....")
        }
        axios.post(import.meta.env.VITE_SERVER_DOMAIN+"/add-comment",{_id,blog_author,comment},
           { headers:{
                'Authorization':`Bearer ${access_token}`
            }}
        )
        .then(({data}) => {
            setComment("");

            data.commented_by={personal_info:{username,profile_img,fullname}}

            let newCommentArr;

            data.childrenLevel=0;

            newCommentArr=[data,...commentsArr];
            let parentinc=1;
            setBlog({...blog,comments:{...comments,results:newCommentArr},activity:{...activity, total_comments:total_comments+1,total_parent_comments:total_parent_comments+parentinc}})

            setTotalParentCommentsLoaded(pre => pre + parentinc)

        })
        .catch(err => {
            console.log(err);
        })



    }


    return(
        <>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Leave a Comment..." className="input-box pl-5 placeholder:text-dark-grey resize-none h-[150px] overflow-auto"></textarea>
            <button 
                onClick={handleComment}
                className="btn-dark mt-5 px-10">{action}</button>
        </>
    )
}
export default CommentField;