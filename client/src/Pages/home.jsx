import { Link } from "react-router-dom"


export function Home() {
    
    return (
        <>
        <div class = 'header'>
            <h1 className='text-grey-500'>RankMyStocks</h1>
            <p class="text">Invest Smarter</p>
            {/* Needs a pop up window after and a function for how the questionair works */}
            <Link to="/questionair">
                <button>Create Portfolio</button>
            </Link>
        </div>
      
      
    
    
        </>
    )
}