import React, { useEffect, useState } from "react";
import axios from "axios";
import AnimationWrapper from "../common/page-animation";
import InPageNavigation from "../components/inpage-navigation.component";
import Loader from '../components/loader.component';
import BlogPostCard from "../components/blog-post.component";
import MinimalBlogPost from "../components/nobanner-blog-post.component";
import { activeTabRef } from "../components/inpage-navigation.component";
import NoDataMessage from "../components/nodata.component";

const HomePage = () => {
    const [blogs, setBlogs] = useState(null);
    const [treandingBlogs, setTreandingBlogs] = useState(null);
    const [pageState,setPageState]=useState("home");

    let categories =["programming","hollywood","film making","social media","cooking","tech","finance","travel"];

    const fetchLatestBlogs = () => {
        axios.get(`${import.meta.env.VITE_SERVER_DOMAIN}/latest-blog`)
            .then(({ data }) => {
                setBlogs(data.blogs);
            })
            .catch(err => {
                console.error("Error fetching latest blogs:", err);
            });
    }

    const fetchTreadingBlogs = () => {
        axios.get(`${import.meta.env.VITE_SERVER_DOMAIN}/treanding-blog`)
            .then(({ data }) => {
                setTreandingBlogs(data.blogs);
            })
            .catch(err => {
                console.error("Error fetching latest blogs:", err);
            });
    }

    const feactBlogsByCategory=()=>{
        axios.post(`${import.meta.env.VITE_SERVER_DOMAIN}/search-blogs`,{tag:pageState})
            .then(({ data }) => {
                setBlogs(data.blogs);
            })
            .catch(err => {
                console.error("Error fetching latest blogs:", err);
            });
    }
    
    

    const loadBlogByCategory = (e) => {
        let category=e.target.innerText.toLowerCase();
        setBlogs(null);

        if(pageState === category){
            setPageState("home");
            return;
        }
        setPageState(category);
    }

    useEffect(() => {
        activeTabRef.current.click();
        if(pageState === "home"){
            fetchLatestBlogs();
        }else{
            feactBlogsByCategory();
        }
        if(!treandingBlogs){
            fetchTreadingBlogs();
        }
    }, [pageState]);

    return (
        <AnimationWrapper>
            <section className="h-cover flex justify-center gap-10">
                {/* latest blogs */}
                <div style={{ marginBottom: '32px' }}>
                    <InPageNavigation routes={[pageState, "trending blogs"]} defaultHidden={["trending blogs"]}>
                            {blogs === null ? (
                                <Loader />
                            ) : (
                                blogs.length ?
                                blogs.map((blog, i) => (
                                    <AnimationWrapper key={i} transition={{ duration: 1, delay: i * 0.1 }}>
                                        <BlogPostCard content={blog} author={blog.author.personal_info} />
                                    </AnimationWrapper>
                                ))
                                :
                                <NoDataMessage message="No Blog Published"/>
                            )}
                            {treandingBlogs === null ? (
                                <Loader />
                            ) : (
                                treandingBlogs.length ?
                                treandingBlogs.map((blog, i) => (
                                    <AnimationWrapper key={i} transition={{ duration: 1, delay: i * 0.1 }}>
                                        <MinimalBlogPost blog={blog} index={i}/>
                                    </AnimationWrapper>
                                ))
                                :
                                <NoDataMessage message="No Trending Blogs"/>
                            )}
                    </InPageNavigation>
                </div>
                {/* filters and trending blogs */}
                <div className="min-w-[40%] lg:min-w-[400px] max-w-min border-1 border-grey pl-8 pt-5 max-md:hidden">
                    <div className="flex flex-col gap-10">
                        {/* filters */}
                       <div>
                            <h1 className="font-medium text-xl mb-8">Stories form all interests</h1>
                            <div className="flex gap-3 flex-wrap">
                                {
                                    categories.map((category,i) => {
                                        return <button onClick={loadBlogByCategory} className={`tag ${pageState === category ? "bg-black text-white":" "}`} key={i}>{category}</button>
                                    })
                                }
                            </div>
                       </div>
                       {/* treanding blogs */}
                        <div>
                            <h1 className="font-medium text-xl mb-8">Treanding <i className="fi fi-rr-arrow-trend-up"></i></h1>
                            {treandingBlogs === null ? (
                                    <Loader />
                                ) : (
                                    treandingBlogs.length ?
                                    treandingBlogs.map((blog, i) => (
                                        <AnimationWrapper key={i} transition={{ duration: 1, delay: i * 0.1 }}>
                                            <MinimalBlogPost blog={blog} index={i}/>
                                        </AnimationWrapper>
                                    ))
                                    :
                                <NoDataMessage message="No Trending Blogs"/>
                            )}
                        </div>
                </div>
            </div>
            </section>
        </AnimationWrapper>
    );
}

export default HomePage;
