import { useContext, useState } from "react";
import { UserContext } from "../App";
import { Navigate } from "react-router-dom";
import BlogEditor from "../components/blog-editor.component";
import PublishForm from "../components/publish-form.component";
import { createContext } from "react";

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

    const [blog,setBlog]=useState(blogStructure);

    const { userAuth } = useContext(UserContext) || {};
    const access_token = userAuth?.access_token;

    const [editorState, setEditoreState]=useState("editor");
    const [textEdiotr, setTextEdiotr]=useState({isReady:false});


    return(
        <EditorContext.Provider value={{blog,setBlog,editorState,setEditoreState,textEdiotr, setTextEdiotr}}>
            {
                access_token === null ? <Navigate to="/signin"/>
                :
                editorState === "editor" ? <BlogEditor/>:<PublishForm/>
            }
        </EditorContext.Provider>
        

    )
}

export default Editor;