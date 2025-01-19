const LoadMoreDataBtn=({state, fetchDataFun,additionalParams})=>{

    if(state !== null && state.totalDocs < state.results.length){
        return (
            <button 
            onClick={() => fetchDataFun({...additionalParams,page:state.page+1})}
            className="text-dark-grey p-2 px-5 hover:bg-grey/30 rounded-md flex items-ceter gap-2">
                Load More
            </button>
        )
    }
    
}

export default LoadMoreDataBtn;