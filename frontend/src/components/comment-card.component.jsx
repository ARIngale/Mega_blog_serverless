import { getDay } from "../common/date";
import { useContext, useState } from "react";
import { UserContext } from "../App";
import toast from "react-hot-toast";
import CommentField from "./comment-field.component";
import { BlogContext } from "../pages/blog.page";
import axios from "axios";

const CommentCard = ({ commentData, level = 0 }) => {
  const { commented_by: { personal_info: { profile_img, fullname, username: commented_by_username } }, commentedAt, comment, _id, children } = commentData;

  const { userAuth: { access_token, username } } = useContext(UserContext);
  const { blog, setBlog, setTotalParentCommentsLoaded } = useContext(BlogContext);
  const { activity, activity: { total_parent_comments }, comments, comments: { results: commentsArr }, author: { personal_info: { username: blog_author } } } = blog;

  const [isReplying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);

  const handleReplyClick = () => {
    if (!access_token) {
      return toast.error("Login first to leave a reply");
    }
    setReplying(prev => !prev);
  };

  const loadReplies = () => {
    if (children.length && !showReplies) {
      axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/get-replies", { _id, skip: 0 })
        .then(({ data: { replies } }) => {
          setReplies(replies);
          setShowReplies(true);
        })
        .catch(err => {
          console.log(err);
        });
    } else {
      setShowReplies(!showReplies);
    }
  };

  const deleteComment = (e) => {
    e.target.setAttribute("disabled", true);
    axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/delete-comment", { _id }, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    })
      .then(() => {
        e.target.removeAttribute("disabled");
        const updatedComments = commentsArr.filter(comment => comment._id !== _id);
        setBlog({
          ...blog,
          comments: { ...comments, results: updatedComments },
          activity: { ...activity, total_comments: activity.total_comments - 1, total_parent_comments: level === 0 ? total_parent_comments - 1 : total_parent_comments }
        });
        if (level === 0) {
          setTotalParentCommentsLoaded(prev => prev - 1);
        }
      })
      .catch(err => {
        console.log(err);
      });
  };

  return (
    <div className={`w-full ${level > 0 ? 'pl-8 border-l border-grey mt-5' : 'mb-5'}`}>
      <div className="p-6 rounded-md border border-grey">
        <div className="flex gap-3 items-center">
          <img src={profile_img || "/placeholder.svg"} className="w-6 h-6 rounded-full" alt={fullname} />
          <p className="line-clamp-1">{fullname} @{commented_by_username}</p>
          <p className="min-w-fit">{getDay(commentedAt)}</p>
        </div>
        <p className="font-gelasio text-xl ml-3 mt-3">{comment}</p>

        <div className="flex gap-5 items-center mt-5">
          {level === 0 && children.length > 0 && (
            <button
              className="text-dark-grey p-2 px-3 hover:bg-grey/30 rounded-md flex items-center gap-2"
              onClick={loadReplies}
            >
              <i className="fi fi-ss-comment-dots"></i>
              {showReplies ? "Hide replies" : `${children.length} ${children.length === 1 ? "Reply" : "Replies"}`}
            </button>
          )}
          <button className="underline" onClick={handleReplyClick}>Reply</button>
          {(username === commented_by_username || username === blog_author) && (
            <button
              onClick={deleteComment}
              className="p-2 px-3 rounded-md border border-grey ml-auto hover:bg-red/30 hover:text-red flex items-center"
            >
              <i className="fi fi-rr-trash pointer-events-none"></i>
            </button>
          )}
        </div>
        
        {isReplying && (
          <div className="mt-8">
            <CommentField
              action="reply"
              replyingTo={_id}
              setReplying={setReplying}
              level={level + 1}
            />
          </div>
        )}
      </div>

      {showReplies && replies.map((reply) => (
        <CommentCard
          key={reply._id}
          commentData={reply}
          level={level + 1}
        />
      ))}
    </div>
  );
};

export default CommentCard;
