import { Navbar } from "./Components/Navbar/navbar.jsx";
import { Outlet } from "react-router-dom";
    
export function Layout() {
    return (
        <>
            <Navbar/>
            <main className="page-content">
                <Outlet/>
            </main>
        </>
    )
}