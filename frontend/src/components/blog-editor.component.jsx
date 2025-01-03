import { Link } from "react-router-dom";
import logo from "../imgs/logo.png"
import AnimationWrapper from "../common/page-animation";
import defaultBanner from "../imgs/blog banner.png"
import { useContext, useEffect } from "react";
import { uploadImage } from "../common/aws";
import {toast, Toaster} from "react-hot-toast"
import { EditorContext } from "../pages/editor.pages";
import EditorJS from "@editorjs/editorjs"
import axios from "axios";
import {tools} from "../components/tools.component"
import { UserContext } from "../App";
import { useNavigate } from "react-router-dom";



const BlogEditor = () => {
    let {blog,blog:{title,banner,content, tags,des},setBlog,textEdiotr, setTextEdiotr,setEditoreState} = useContext(EditorContext);
    let {userAuth:{access_token}}=useContext(UserContext);
    const navigate = useNavigate();


    useEffect(() =>{

        if(!textEdiotr.isReady){
            setTextEdiotr(new EditorJS({
                holder: "textEditor",
                data:content,
                tools:tools,
                placeholder:"Let's write an awesome story"
            }))
        }
    },[])

    const handleBannerUpload = async (e) => {
        const img = e.target.files[0];
    
        if (img) {
            // Validate file type only jpeg are allowed due to our backend setup
            if (img.type !== "image/jpeg") {
                toast.error("Only JPEG images are allowed!");
                return;
            }
    
            const loadingToast = toast.loading("Uploading...");
    
            try {
                const url = await uploadImage(img);
    
                if (url) {
                    toast.dismiss(loadingToast);
                    toast.success("Uploaded successfully!");
                    setBlog({...blog,banner:url})
                } 
            } catch (err) {
                toast.dismiss(loadingToast);
                toast.error(`Error: ${err.message || "Something went wrong!"}`);
            }
        }
    };

    const handleTitleKeyDown = (e) => {
        if(e.keyCode === 13) //enter key
        {
            e.preventDefault();
        }
    }
    
    const hanadleTitleChange = (e)=>{
        let input=e.target;
        input.style.height='auto';
        input.style.height=input.scrollHeight+"px";
        
        setBlog({...blog, title:input.value})
    }

    const handleError = (e) => {
        let img=e.target;
        img.src=defaultBanner;
    }

    const handlePulishEvent = (e) => {
        if(!banner.length){
            return toast.error("Uplaod a blog Banner to publish it");
        }
        if(!title.length){
            return toast.error("Write the Title to publish it");
        }
        if(textEdiotr.isReady){
            textEdiotr.save().then(data => {
                if(data.blocks.length){
                    setBlog({...blog,content:data});
                    setEditoreState("publish")
                }else{
                    return toast.error("Write something in your blog to publish it")
                }
            })
            .catch((err) => {
                console.log(err);
            })
        }
    };

    const handleSaveDraft=(e)=>{
        if(e.target.className.includes("disable")){
            return;
        }
        if(!title.length){
            return toast.error("Write the Title before saving it as a draft");
        }


        let loadingToast=toast.loading("Saving Draft...");
        e.target.classList.add("disable");

        if(textEdiotr.isReady){
            textEdiotr.save().then(content => {
                let blogObj = {
                    title,banner,des,content,tags,draft:true
                }
                axios.post(import.meta.env.VITE_SERVER_DOMAIN+"/create-blog",blogObj,{
                    headers:{
                        'Authorization':`Bearer ${access_token}`
                    }
                })
                .then(() => {
                    e.target.classList.remove("disable");
                    toast.dismiss(loadingToast);
                    toast.success("Saved");
                
                    setTimeout(() => {
                        navigate("/");
                    }, 500);
                })        
                .catch(() => {
                    e.target.classList.remove("disable");
                    toast.dismiss(loadingToast);
                    return toast.error(response.data.error);
                })
            })
        }
        
    }
    

    
    return (
       <>
            <nav className="navbar"> 
                <Link to="/" className="flex-none w-10"><img src={logo}/></Link>
                <p className="max-md:hidden text-black line-clamp-1 w-full">{title.length ? title :"New Blog"}</p>
                <div className="flex gap-4 ml-auto">
                    <button className="btn-dark py-2" onClick={handlePulishEvent}>Publish</button>
                    <button className="btn-light py-2" onClick={handleSaveDraft}>Save Draft</button>
                </div>
            </nav>
            <Toaster/>
            <AnimationWrapper>
                <section>
                    <div className="mx-auto max-w-[900px] w-full">
                        <div className="relative aspect-video hover:opacity-80 bg-white border-4 border-grey">
                            <label htmlFor="uploadBanner">
                                <img 
                                    src={banner} 
                                    className="z-20"
                                    onError={handleError}
                                />
                                <input 
                                    id="uploadBanner"
                                    type="file"
                                    accept=".png, .jpg, .jpeg"
                                    hidden
                                    onChange={handleBannerUpload}
                                />
                            </label>
                        </div>
                    </div>
                    <textarea 
                        defaultValue={title}
                        placeholder="Blog Title"
                        className="text-4xl font-medium w-full h-20 outline-none resize-none mt-10 leading-tight placeholder:opacity-40"
                        onKeyDown={handleTitleKeyDown}
                        onChange={hanadleTitleChange}
                    ></textarea>
                    <hr className="w-full opacity-10 my-5" />

                    <div id="textEditor" className="font-gelasio"></div>
                </section>
            </AnimationWrapper>
       </>
    )
}

export default BlogEditor;