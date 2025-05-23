import { useContext, useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import darkLogo from "../imgs/logo-dark.png";
import lightLogo from "../imgs/logo-light.png";
import { ThemeContext, UserContext } from "../App";
import UserNavigationPanel from "./user-navigation.component";
import axios from "axios";
import { storeInSession } from "../common/session";

const Navbar = () => {
  const [searchBoxVisibility, setSearchBoxVisibility] = useState(false);
  const [userNavPanel,setUserNavPanel]=useState(false);

  const { userAuth,setUserAuth } = useContext(UserContext) || {};
  const access_token = userAuth?.access_token;
  const profile_img = userAuth?.profile_img;
  const new_notification_available=userAuth?.new_notification_available;

  let {theme, setTheme}=useContext(ThemeContext);

  let navigate=useNavigate();

  const toggleSearchBox = () => {
    setSearchBoxVisibility((currentVal) => !currentVal);
  };
  
  const handleUserNavPanel= () => {
    setUserNavPanel((currentVal) => !currentVal);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setUserNavPanel(false);
    },200);

  };

  const changeTheme=()=>{
      let newTheme=theme === "light" ? "dark":"light";
      setTheme(newTheme);

      document.body.setAttribute('data-theme',newTheme);

      storeInSession("theme",newTheme);
  }


  const handleSearch=(e) => {
    let query=e.target.value;
    if(e.keyCode == 13 && query.length){
      navigate(`/search/${query}`)
    }
  }

  useEffect(() => {
    if(access_token){
      axios.get(import.meta.env.VITE_SERVER_DOMAIN+"/new-notification",{
        headers:{
          'Authorization':`Bearer ${access_token}`
        }
      })
      .then(({data}) => {
        setUserAuth({...userAuth,...data});
      })
      .catch(err => {
        console.log(err);
      })
    }
  },[])

  return (
    <>
      <nav className="navbar flex items-center py-4 px-6 bg-white shadow-md z-50">
        <Link to="/" className="flex-none w-14">
          <img src={theme === "light" ? darkLogo : lightLogo} alt="logo" className="w-full" />
        </Link>
        

        <div
          className={`absolute bg-white w-full left-0 top-full mt-1 border-b border-gray-200 py-4 px-[5vw] md:border-0 md:block md:relative md:inset-0 md:p-0 md:w-auto ${
            searchBoxVisibility ? "block" : "hidden"
          }`}
        >
          <input
            type="text"
            placeholder="Search"
            className="w-full md:w-auto bg-gray-100 p-4 pl-6 pr-[12%] md:pr-6 rounded-full placeholder-gray-500 md:pl-12"
            onKeyDown={handleSearch}
          />
          <i className="fi fi-rr-search absolute right-[10%] md:pointer-events-none md:left-5 top-1/2 -translate-y-1/2 text-xl text-gray-500"></i>
        </div>

        <div className="flex items-center gap-3 md:gap-6 ml-auto">
        <button
            className={`md:hidden w-12 h-12 rounded-full flex items-center justify-center ${
              theme === "light" ? "bg-gray-100" : "bg-gray-200"
            }`}
            onClick={toggleSearchBox}
          >
            <i
              className={`fi fi-rr-search text-xl ${
                theme === "light" ? "text-black" : "text-white"
              }`}
            ></i>
          </button>


          <Link to="/editor" className=" gap-2 link hidden md:flex pl-8 py-4 Profile">
              <i className="fi fi-rr-file-edit"></i>
              <p>Write</p>
          </Link>

          <button className="w-12 h-12 rounded-full bg-grey relative hover:bg-black/10" onClick={changeTheme}>
                  <i className={"fi fi-rr-"+(theme === "light" ?"moon-stars":"sun")+" text-2xl"}></i>
            </button>

          {access_token ? (
            <>
              <Link to="/dashboard/notifications">
                <button className="w-12 h-12 rounded-full bg-grey relative hover:bg-black/10">
                  <i className="fi fi-rr-bell text-2xl block mt-1"></i>
                  {
                    new_notification_available ? 
                    <span className="bg-red w-3 h-3 rounded-full absolute z-10 top-2 right-2"></span>:""
                  }
                                      

                </button>
              </Link>
              <div className="relative" onClick={handleUserNavPanel} onBlur={handleBlur}
              >
              <button className="w-12 h-12 mt-1">
                  <img src={profile_img} className="w-full h-full object-cover rounded-full" />
              </button>

              {userNavPanel ? <UserNavigationPanel/> :""}

              </div>
            </>
          ) : (
            <>
              <Link className="btn-dark py-2 px-4 rounded-full text-white bg-blue-600" to="/signin">
                Sign In
              </Link>
              <Link
                className="btn-light py-2 px-4 rounded-full hidden md:block text-blue-600 border border-blue-600"
                to="/signup"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
      <Outlet />
    </>
  );
};

export default Navbar;
