import { Navbar } from "./Components/Navbar/navbar.jsx";
import { Outlet } from "react-router-dom";

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