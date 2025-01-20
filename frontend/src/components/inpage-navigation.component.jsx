import { useEffect, useRef, useState } from "react"

export let aciveTabLineRef;
export let activeTabRef;

const InPageNavigation = ({routes,defaultHidden = [],defaultActiveIndex = 0,children})=>{
     aciveTabLineRef=useRef();
     activeTabRef=useRef();

    let [InPageNavIndex,setInPageNavIndex]=useState(defaultActiveIndex);

    const changePageState = (btn,i) => {
        let {offsetWidth,offsetLeft}=btn;
        aciveTabLineRef.current.style.width=offsetWidth+"px";
        aciveTabLineRef.current.style.left=offsetLeft+"px";
        
        setInPageNavIndex(i);

    }
    useEffect(() => {
        changePageState(activeTabRef.current,defaultActiveIndex)
    },[]);

    return (
        <>
            <div className="relative mb-8 bg-white border-b border-grey flex flex-nowrap overflow-x-hidden px-3">
                {
                    routes.map((route,i) => {
                        return(
                            <button
                                ref={i == defaultActiveIndex ? activeTabRef:null}
                                key={i}
                                className={`p-4 px-5 capitalize ${InPageNavIndex === i ? "text-black" : "text-dark-grey"} ${defaultHidden.includes(route) ? "md:hidden":" "}`}
                                onClick={(e) =>  {changePageState(e.target,i)}}
                            >
                                {route}
                            </button>
                           
                        )
                    })
                }
                <hr ref={aciveTabLineRef} className="absolute bottom-0 duration-300 border-dark-grey"/>

            </div>
            {
                Array.isArray(children) ? children[InPageNavIndex] : children
            }

        </>
    )

}

export default InPageNavigation;