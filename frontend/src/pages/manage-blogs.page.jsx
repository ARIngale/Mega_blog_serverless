import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { UserContext } from "../App";
import { filterPaginationData } from "../common/filter-pagination-data";
import { Toaster,toast } from "react-hot-toast";
import InPageNavigation from "../components/inpage-navigation.component";
import Loader from "../components/loader.component";
import NoDataMessage from "../components/nodata.component";
import AnimationWrapper from "../common/page-animation";
import {ManagePublishedBlogCard,ManageDraftBlogCard} from "../components/manage-blogcard.component";

const ManageBlogs=()=>{

    const [blogs,setBlogs]=useState(null);
    const [drafts,setDrafts]=useState(null);
    const [query,setQuery]=useState("");

    const { userAuth } = useContext(UserContext) || {};
  const access_token = userAuth?.access_token;


    const getBlogs=({page,draft,deleteDocCount=0}) =>{
        axios.post(
        import.meta.env.VITE_SERVER_DOMAIN + "/user-written-blogs",{
            page,draft,query,deleteDocCount
        },{
            headers:{
                'Authorization':`Bearer ${access_token}`
            }
        })
        .then(async ({data}) => {
            let formatedData=await filterPaginationData({
                state:draft?drafts:blogs,
                data:data.blogs,
                page,
                user:access_token,
                counteRoute:"/user-written-blogs-count",
                data_to_send:{
                    draft,query
                }
            })
            if(draft){
                setDrafts(formatedData);
            }else{
                setBlogs(formatedData)
            }
        })
        .catch(err => {
            console.log(err);
        })
    }

    const handleChange=(e)=>{
        if(!e.target.value.length){
            setBlogs(null);
            setDrafts(null);
            setQuery("");
        }
    }


    const handleSearch=(e)=>{
        let searchQuery=e.target.value;

        if(e.keyCode === 13 && searchQuery.length){
            setBlogs(null);
            setDrafts(null);
        }
    }

    useEffect(() =>{
       if(access_token){
        if(blogs == null){
            getBlogs({page:1,draft:false})
        }
        if(drafts == null){
            getBlogs({page:1,draft:true})
        }
       }
    },[access_token,blogs,drafts,query])

    return (
        <>
            <h1 className="max-md:hidden">Manage Blogs</h1>
            <Toaster/>

            <div className="relative max-md:mt-5 md:mt-8 mb-10">
                <input type="search" className="w-full bg-grey p-4 pl-12 pr-6 rounded-full placeholder:text-dark-grey" placeholder="Search Blogs"
                onChange={handleChange}
                onKeyDown={handleSearch}/>
                <i className="fi fi-rr-search absolute right-[10%] md:pointer-events-none md:left-5 top-1/2 -translate-y-1/2 text-xl text-dark-grey"></i>
            </div>

            <InPageNavigation routes={["Published Blogs","Drafts"]}>
                {/* pulished blogs */}
                {
                    blogs === null ? <Loader/>:
                    blogs.results.length ? 
                    <>
                        {
                            blogs.results.map((blog,i) => {
                                return <AnimationWrapper key={i} transition={{delay:i*0.04}}>

                                    <ManagePublishedBlogCard blog={blog}/>
                                </AnimationWrapper>
                            })
                        }
                    </>
                    :<NoDataMessage message="No Publised Blogs"/>
                }
                 {/* draft blogs */}
                 {
                    drafts === null ? <Loader/>:
                    drafts.results.length ? 
                    <>
                        {
                            drafts.results.map((blog,i) => {
                                return <AnimationWrapper key={i} transition={{delay:i*0.04}}>

                                    <ManageDraftBlogCard blog={blog} index={i+1}/>
                                </AnimationWrapper>
                            })
                        }
                    </>
                    :<NoDataMessage message="No Draft Blogs"/>
                }
            </InPageNavigation>

        </>
    )
}

export default ManageBlogs;