import { Navbar } from "./Components/navbar.jsx"
import { Outlet } from "react-router-dom"

export function Layout() {
    return (
        <>
            <Navbar/>
            <main>
                <Outlet/>
            </main>
        </>
    )
}