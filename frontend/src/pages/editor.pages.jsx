import { useContext, useEffect, useState } from "react";
import { UserContext } from "../App";
import { Navigate, useParams } from "react-router-dom";
import BlogEditor from "../components/blog-editor.component";
import PublishForm from "../components/publish-form.component";
import { createContext } from "react";
import Loader from "../components/loader.component";
import axios from "axios";

const blogStructure = {
    title:'',
    banner:'',
    content:[],
    tags:[],
    des:'',
    author:{personal_info:{}}
}

export const EditorContext=createContext({});

const Editor = () => {

    let {blog_id}=useParams();

    const [blog,setBlog]=useState(blogStructure);

    const { userAuth } = useContext(UserContext) || {};
    const access_token = userAuth?.access_token;

    const [editorState, setEditoreState]=useState("editor");
    const [textEdiotr, setTextEdiotr]=useState({isReady:false});
    const [loading,setLoading]=useState(true);

    useEffect(() => {
        if(!blog_id) return setLoading(false);
        axios.post(import.meta.env.VITE_SERVER_DOMAIN+"/get-blog",{blog_id,draft:true,mode:'edit'})
        .then(({data:{blog}}) =>{
            setBlog(blog);
            setLoading(false);
        })
        .catch(err =>{
            console.log(err);
            setLoading(false);
        })
    },[])

    return(
        <EditorContext.Provider value={{blog,setBlog,editorState,setEditoreState,textEdiotr, setTextEdiotr}}>
            {   
                access_token === null ? <Navigate to="/signin"/>
                :
                loading ? <Loader/>:
                editorState === "editor" ? <BlogEditor/>:<PublishForm/>
            }
        </EditorContext.Provider>
        

    )
}

export default Editor;