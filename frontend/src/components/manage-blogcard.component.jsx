import { Link } from "react-router-dom";
import { getDay } from "../common/date";
import { useState } from "react";

const BlogStats = ({ stats }) => {
    return (
        <div className="flex gap-2 max-lg:mb-6 max-lg:pb-6 border-grey max-lg:border-b">
            {
                Object.keys(stats).map((key, i) => {

                    const statValue = stats[key];

                        return (
                            !key.includes("parent") ?
                            <div key={i} className={"flex flex-col items-center w-full h-full justify-center p-4 px-6"+(i !== 0 ? "border-grey border-1":"")}>
                                <h1 className="text-xl lg:text-2xl mb-2">{statValue.toLocaleString()}</h1>
                                <p className="max-lg:text-dark-grey capitalize">{key}</p>
                            </div>:""
                        );

                })
            }
        </div>
    );
};


export const ManagePublishedBlogCard=({blog})=>{

    let {banner,blog_id,title,publishedAt,activity}=blog;

    let [showStats,setShowStats]=useState(false);
    

    return (
        <>
            <div className="flex gap-10 border-b mb-6 max-md:px-4 border-grey pb-6 items-center">
                <img src={banner} className="max-md:hidden lg:hidden xl:block w-28 h-28 flex-none bg-grey object-cover"/>
                <div className="flex flex-col justify-between py-2 w-full min-w-[300px]">
                    <div>
                        <Link to={`/blog/${blog_id}`} className="blog-title mb-4 hover:underline">{title}</Link>
                        <p className="line-clamp-1">Published on {getDay(publishedAt)}</p>
                    </div>
                    <div className="flex gap-6 mt-3">
                        <Link className="pr-4 py-2 underline" to={`/editor/${blog_id}`}>Edit</Link>
                        
                        <button className="md:hidden pr-4 py-2 underline" onClick={() => setShowStats(pre => !pre)}>Stats</button>

                        <button className="pr-4 py-2 underline">Delete</button>
                    </div>
                </div>
                <div className="max-lg:hidden">
                    <BlogStats stats={activity}/>
                </div>
            </div>
            {
                showStats ? <div className="lg:hidden"><BlogStats stats={activity}/></div>:""
            }
        </>
    )
}

export const ManageDraftBlogCard=({blog,index})=>{
    let {title,des,blog_id}=blog;
    return (
        <div className="flex gap-5 lg:gap-10 pb-6 border-b mb-6 border-grey">
            <h1 className="blog-index text-center pl-4 md:pl-6 flex-none">{index < 10 ? "0"+index:index}</h1>

            <div>
                <h1 className="blog-title mb-3">{title}</h1>
                <p className="line-clamp-2 font-gelasio">{des.length?des:"No Description"}</p>
                <div className="flex gap-6 mt-3">
                    <Link to={`/editor/${blog_id}`} className="pr-4 py-2 underline">Edit</Link>
                    <button className="pr-4 py-2 underline">Delete</button>
                </div>
            </div>
        </div>

    )
}