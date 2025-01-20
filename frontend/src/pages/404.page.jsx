import { Link } from "react-router-dom";
import lightPageNotFoundImage from "../imgs/404-light.png"
import darkPageNotFoundImage from "../imgs/404-dark.png"
import darkFullLogo from "../imgs/full-logo-dark.png"
import lightFullLogo from "../imgs/full-logo-light.png"
import { useContext } from "react";
import { ThemeContext } from "../App";

const PageNotFound=()=>{

    let {theme} = useContext(ThemeContext);
    return (
        <section className="h-cover relative p-10 flex flex-col items-center gap-20 text-center">
            <img src={theme === "light"?darkPageNotFoundImage:lightPageNotFoundImage} className="select-none border-grey w-72 aspect-square object-cover rounded" />
            <h1 className="text-4xl font-gelasio leading-7">Page Not Found</h1>
            <p className="text-dark-grey text-xl leading-7 -mt-8">The Page you are looking for does not exists. Return Back to the <Link to="/" className="text-black underline">Home Page</Link> </p>

            <div className="mt-auto">
            <Link to="/"><img src={theme === "light" ? darkFullLogo : lightFullLogo} className="h-8 object-contain block mx-auto select-none"/></Link> 
                <p className="mt-5 text-dark-grey">Read millons of Stories around the world</p>
            </div>
        </section>
    )
}

export default PageNotFound;