import React, { useContext, useRef } from "react";
import { Link, Navigate } from "react-router-dom"; // Added Navigate import
import InputBox from "../components/input.component";
import googleIcon from "../imgs/google.png";
import AnimationWrapper from "../common/page-animation";
import { toast, Toaster } from "react-hot-toast";
import axios, { formToJSON } from "axios";
import { storeInSession } from "../common/session";
import { UserContext } from "../App";
import { authWithGoogle } from "../common/firebase";

const UserAuthForm = ({ type }) => {
  const authForm = useRef();
  const { userAuth, setUserAuth } = useContext(UserContext);
  const access_token = userAuth?.access_token;

  const userAuthThroughServer = (serverRoute, formData) => {
    axios
      .post(import.meta.env.VITE_SERVER_DOMAIN + serverRoute, formData)
      .then(({ data }) => {
        storeInSession("user", JSON.stringify(data));
        setUserAuth(data);
      })
      .catch(({ response }) => {
        toast.error(response.data.error);
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  
    // Check if authForm is correctly attached
    if (!authForm.current) {
      toast.error("Form not found.");
      return;
    }
  
    const serverRoute = type === "sign-in" ? "/signin" : "/signup";
  
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
  
    const form = new FormData(authForm.current); // Ensure the ref is attached and valid
    const formData = Object.fromEntries(form.entries());
  
    const { fullname, email, password } = formData;
  
    if (fullname && fullname.length === 0) {
      toast.error("Enter the name");
      return;
    }
    if (!email || !emailRegex.test(email)) {
      toast.error("Enter a valid email");
      return;
    }
    if (!passwordRegex.test(password)) {
      toast.error(
        "Password should be 6 to 20 characters long with a numeric, 1 lowercase, and 1 uppercase letter"
      );
      return;
    }
  
    userAuthThroughServer(serverRoute, formData);
  };
  


  const handleGoogleAuth = (e) => {
    e.preventDefault();

    authWithGoogle().then((user) => {
      let serverRoute="/google-auth";
      let formData = {
        access_token: user.accessToken
      }
      userAuthThroughServer(serverRoute,formData)
    })
    .catch(err => {
      toast.error('trouble login through google');
      return console.log(err);
    })
  }

  return access_token ? (
    <Navigate to="/" />
  ) : (
    <AnimationWrapper keyValue={type}>
      <section className="h-cover flex items-center justify-center">
        <Toaster />
        <form ref={authForm} className="w-[80%] max-w-[400px] space-y-6">
          <h1 className="text-4xl font-gelasio capitalize text-center mb-24">
            {type === "sign-in" ? "Welcome back" : "Join us today"}
          </h1>
          {type !== "sign-in" && (
            <InputBox
              name="fullname"
              type="text"
              placeholder="Enter full name"
              icon="fi-rr-user"
            />
          )}
          <InputBox
            name="email"
            type="email"
            placeholder="Enter Email"
            icon="fi-rr-envelope"
          />
          <InputBox
            name="password"
            type="password"
            placeholder="Enter Password"
            icon="fi-rr-key"
          />
          <button
            className="btn-dark center mt-6"
            type="submit"
            onClick={handleSubmit}
          >
            {type.replace("-", "")}
          </button>
          <div className="relative w-full flex items-center gap-2 my-8 opacity-10 uppercase text-black font-bold">
            <hr className="w-1/2 border-black" />
            <p>or</p>
            <hr className="w-1/2 border-black" />
          </div>
          <button className="btn-dark flex items-center justify-center gap-4 w-[90%] center" onClick={handleGoogleAuth}>
            <img src={googleIcon} alt="google" className="w-5" />
            continue with google
          </button>

          {type === "sign-in" ? (
            <p className="mt-6 text-dark-grey text-xl text-center">
              Don't have an account?
              <Link to="/signup" className="underline text-black text-xl ml-1">
                Join us Today
              </Link>
            </p>
          ) : (
            <p className="mt-6 text-dark-grey text-xl text-center">
              Already a member?
              <Link to="/signin" className="underline text-black text-xl ml-1">
                Sign in here
              </Link>
            </p>
          )}
        </form>
      </section>
    </AnimationWrapper>
  );
};

export default UserAuthForm;
