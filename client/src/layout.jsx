<<<<<<< HEAD
import { Navbar } from "./Components/Navbar/navbar.jsx"
import { Outlet } from "react-router-dom"
=======
import { Navbar } from "./Components/Navbar/navbar.jsx";
import { Outlet } from "react-router-dom";
>>>>>>> Sprint1_Pradeep

export function Layout() {
    return (
        <>
            <Navbar/>
            <main style={{ paddingTop: "90px" }}>
                <Outlet/>
            </main>
        </>
    )
}