import { Link } from "react-router-dom";
import { getFullDay } from "../common/date";
const AboutUser= ({className,bio,social_links, joinedAt}) => {
    return(
        <div className={"md:w-[90%] md:mt-7"+className}>
            <p className="text-xl leading-7">{bio.length ? bio :"Nothing to read more"}</p>

            <div className="flex gap-x-7 gap-y-2 flex-wrap my-7 items-center text-dark-grey">
            {
  Object.keys(social_links).map((key) => {
    let link = social_links[key];
    let icon = null;

    // Determine the icon based on the key
    switch (key) {
      case "facebook":
        icon = "fi fi-brands-facebook";
        break;
      case "github":
        icon = "fi fi-brands-github";
        break;
      case "instagram":
        icon = "fi fi-brands-instagram text-2xl";
        break;
      case "twitter":
        icon = "fi fi-brands-twitter text-2xl";
        break;
      case "youtube":
        icon = "fi fi-brands-youtube text-2xl";
        break;
      case "website":
        icon = "fi fi-rr-globe text-2xl";
        break;
      default:
        icon = null;
    }

    
        return link ? (
        <Link to={link} key={key} target="_blank" className="flex items-center gap-2 hover:text-black">
            <i className={icon}></i> {/* Render the icon */}
            <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span> {/* Display the capitalized key */}
        </Link>
        ) : null;
    })
}

            </div>
            <p className="text-xl leading-7 text-dark-grey">Joined on {getFullDay(joinedAt)}</p>
        </div>
    )
}
export default AboutUser;