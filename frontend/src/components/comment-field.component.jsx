import { useContext, useState } from "react"
import { UserContext } from "../App"
import { toast, Toaster } from "react-hot-toast"
import axios from "axios"
import { BlogContext } from "../pages/blog.page"

const CommentField = ({ action, replyingTo, setReplying }) => {
  const [comment, setComment] = useState("")

  const {
    userAuth: { access_token, username, fullname, profile_img },
  } = useContext(UserContext)
  const {
    blog,
    blog: {
      _id,
      author: { _id: blog_author },
      comments,
      comments: { results: commentsArr },
      activity,
      activity: { total_comments, total_parent_comments },
    },
    setBlog,
    setTotalParentCommentsLoaded,
  } = useContext(BlogContext)

  const handleComment = () => {
    if (!access_token) {
      return toast.error("Login first to leave a comment")
    }
    if (!comment.length) {
      return toast.error("Write something to leave a comment.....")
    }

    axios
      .post(
        import.meta.env.VITE_SERVER_DOMAIN + "/add-comment",
        { _id, blog_author, comment, replying_to: replyingTo },
        { headers: { Authorization: `Bearer ${access_token}` } },
      )
      .then(({ data }) => {
        setComment("")

        const newComment = {
          ...data,
          commented_by: { personal_info: { username, profile_img, fullname } },
          children: [],
          replies: [],
        }

        let updatedComments
        if (replyingTo) {
          updatedComments = commentsArr.map((comment) => {
            if (comment._id === replyingTo) {
              return {
                ...comment,
                children: [...comment.children, data._id],
                replies: [...(comment.replies || []), newComment],
              }
            }
            return comment
          })
        } else {
          updatedComments = [newComment, ...commentsArr]
        }

        setBlog({
          ...blog,
          comments: { ...comments, results: updatedComments },
          activity: {
            ...activity,
            total_comments: total_comments + 1,
            total_parent_comments: replyingTo ? total_parent_comments : total_parent_comments + 1,
          },
        })

        if (!replyingTo) {
          setTotalParentCommentsLoaded((prev) => prev + 1)
        }

        if (setReplying) {
          setReplying(false)
        }
      })
      .catch((err) => {
        console.log(err)
      })
  }

  return (
    <>
      <Toaster />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Leave a Comment..."
        className="input-box pl-5 placeholder:text-dark-grey resize-none h-[150px] overflow-auto"
      ></textarea>
      <button onClick={handleComment} className="btn-dark mt-5 px-10">
        {action}
      </button>
    </>
  )
}

export default CommentField

