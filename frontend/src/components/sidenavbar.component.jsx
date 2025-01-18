import { useContext, useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { UserContext } from "../App";

const SideNav = () => {
    const { userAuth } = useContext(UserContext) || {};
    const access_token = userAuth?.access_token;
    const location = useLocation();

    const [pagestate, setPageState] = useState("");
    const [showSideNav, setShowSideNav] = useState(false);

    const activeTabLine = useRef();
    const sideBarIconTab = useRef();

    useEffect(() => {
        const currentPage = location.pathname.split("/")[2] || "dashboard";
        setPageState(currentPage.replace("-", " "));

        const activeButton = document.querySelector(`[data-page="${currentPage}"]`);
        if (activeButton && activeTabLine.current) {
            const { offsetWidth, offsetLeft } = activeButton;
            activeTabLine.current.style.width = `${offsetWidth}px`;
            activeTabLine.current.style.left = `${offsetLeft}px`;
        }
    }, [location.pathname]);

    const changePageState = (e) => {
        const { offsetWidth, offsetLeft } = e.target;

        if (activeTabLine.current) {
            activeTabLine.current.style.width = `${offsetWidth}px`;
            activeTabLine.current.style.left = `${offsetLeft}px`;
        }

        setShowSideNav(false); 
        setPageState(e.target.innerText);
    };

    const toggleSidebar = () => {
        setShowSideNav((prev) => !prev);
    };


    return (
        <section className="relative flex gap-10 py-0 m-0 max-md:flex-col">
            {/* Sidebar */}
            <div className={`sticky top-[80px] ${showSideNav ? "z-10" : ""}`}>
                {/* Mobile Sidebar Header */}
                <div className="md:hidden bg-white py-1 border-b border-grey flex flex-nowrap overflow-x-auto relative">
                    <button
                        ref={sideBarIconTab}
                        className="p-5 capitalize"
                        onClick={toggleSidebar}
                    >
                        <i className="fi fi-rr-bars-staggered pointer-events-none"></i>
                    </button>
                    <button className="p-5 capitalize">{pagestate}</button>
                    <hr
                        ref={activeTabLine}
                        className="absolute bottom-0 h-[2px] bg-black duration-500"
                    />
                </div>

                {/* Sidebar Content */}
                <div
                    className={`min-w-[200px] md:h-cover md:sticky top-24 overflow-y-auto p-6 md:pr-0 md:border-grey md:border-r absolute max-md:top-[64px] bg-white max-md:w-[calc(100%+80px)] max-md:px-16 max-md:-ml-7 duration-500 ${
                        showSideNav ? "block" : "hidden md:block"
                    }`}
                >
                    <h1 className="text-xl text-dark-grey mb-3">Dashboard</h1>
                    <hr className="border-grey -ml-6 mb-8 mr-6" />

                    <NavLink
                        to="/dashboard/blogs"
                        onClick={changePageState}
                        className="sidebar-link"
                        data-page="blogs"
                    >
                        <i className="fi fi-rr-document"></i>
                        Blogs
                    </NavLink>

                    <NavLink
                        to="/dashboard/notification"
                        onClick={changePageState}
                        className="sidebar-link"
                        data-page="notification"
                    >
                        <i className="fi fi-rr-bell"></i>
                        Notification
                    </NavLink>

                    <NavLink
                        to="/editor"
                        onClick={changePageState}
                        className="sidebar-link"
                        data-page="editor"
                    >
                        <i className="fi fi-rr-file-edit"></i>
                        Write
                    </NavLink>

                    <h1 className="text-xl text-dark-grey mb-3 mt-10">Settings</h1>
                    <hr className="border-grey -ml-6 mb-8 mr-6" />

                    <NavLink
                        to="/settings/edit-profile"
                        onClick={changePageState}
                        className="sidebar-link"
                        data-page="edit-profile"
                    >
                        <i className="fi fi-rr-user"></i>
                        Edit Profile
                    </NavLink>

                    <NavLink
                        to="/settings/change-password"
                        onClick={changePageState}
                        className="sidebar-link"
                        data-page="change-password"
                    >
                        <i className="fi fi-rr-lock"></i>
                        Change Password
                    </NavLink>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-md:-mt-8 mt-5 w-full">
                <Outlet />
            </div>
        </section>
    );
};

export default SideNav;
