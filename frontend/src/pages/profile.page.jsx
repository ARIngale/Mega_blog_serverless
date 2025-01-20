import { useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AnimationWrapper from "../common/page-animation";
import Loader from "../components/loader.component";
import { UserContext } from "../App";
import axios from "axios";
import AboutUser from "../components/about.component";
import { filterPaginationData } from "../common/filter-pagination-data";
import InPageNavigation from "../components/inpage-navigation.component";
import BlogPostCard from "../components/blog-post.component";
import NoDataMessage from "../components/nodata.component";
import LoadMoreDataBtn from "../components/load-more.component";


const ProfilePage = () => {
    const { id: profileId } = useParams();
    const { userAuth } = useContext(UserContext) || {};
    const loggedInUsername = userAuth?.username || ""; 

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [blogs, setBlogs] = useState(null);


    const fetchUserProfile = () => {
        axios
            .post(import.meta.env.VITE_SERVER_DOMAIN + "/get-profile", { username: profileId })
            .then(({ data }) => {
                const user = data.users[0];
                setProfile(user);
                getBlogs({user_id:user._id})
                setLoading(false);
            })
            .catch((err) => {
                setLoading(false);
            });
    };

    const getBlogs=({page=1,user_id})=>{
        user_id=user_id === undefined ? blogs.user_id:user_id;

        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs",{
            author:user_id,
            page
        })
        .then(async ({data}) => {
            let formatedData=await filterPaginationData({
                state:blogs,
                data:data.blogs,
                page,
                counteRoute:"/search-blogs-count",
                data_to_send:{author:user_id}
            })
            setBlogs(formatedData);
        })
    }
    useEffect(() => {
        resetState();
        fetchUserProfile();
    }, [profileId]);

    const resetState=()=>{
        setProfile(null);
        setLoading(true);
    }

    if (loading) return <Loader />;

    const { personal_info, account_info, social_links,joinedAt } = profile || {};
    const { fullname, username: profileUsername, profile_img, bio } = personal_info || {};
    const { total_posts, total_reads } = account_info || {};

    return (
        <AnimationWrapper>
            <section className="h-cover md:flex flex-row-reverse items-start gap-5 min-[1100px]:gap-12">
                <div className="flex flex-col max-md:items-center gap-5 min-w-[250px] md:w-32 md:pl-8 md:border-1 border-grey md:sticky md:top-[100px] md:py-10">
                    <img
                        src={profile_img}
                        alt={`${fullname}'s profile`}
                        className="w-48 h-48 bg-grey rounded-full md:w-32 md:h-32"
                    />
                    <h1 className="text-2xl font-medium">@ {profileUsername}</h1>
                    <p className="text-xl capitalize h-6">{fullname}</p>
                    <p>
                        {Number(total_posts).toLocaleString()} Blogs -{" "}
                        {Number(total_reads).toLocaleString()} Reads
                    </p>
                    <div className="flex gap-4 mt-2">
                        {profileId === loggedInUsername ? (
                            <Link to="/settings/edit-profile" className="btn-light rounded-md">
                                Edit Profile
                            </Link>
                        ) : ""}
                    </div>
                    <AboutUser className="max-md:hidden" bio={bio} social_links={social_links} joinedAt={joinedAt}/>
                </div>
                <div className="max-md:mt-12 w-full">
                <InPageNavigation routes={["Blogs Published", "About"]} defaultHidden={["About"]}>
                        <>
                            {blogs === null ? (
                                <Loader />
                            ) : (
                                blogs.results.length ?
                                blogs.results.map((blog, i) => (
                                    <AnimationWrapper key={i} transition={{ duration: 1, delay: i * 0.1 }}>
                                        <BlogPostCard content={blog} author={blog.author.personal_info} />
                                    </AnimationWrapper>
                                ))
                                :
                                <NoDataMessage message="No Blog Published"/>
                            )}
                            <LoadMoreDataBtn state={blogs} fetchDataFun={getBlogs}/>
                        </>
                        <AboutUser bio={bio} social_links={social_links} joinedAt={joinedAt}/>

                           
                    </InPageNavigation>
                </div>
            </section>
        </AnimationWrapper>
    );
};

export default ProfilePage;
