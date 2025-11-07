import { Navbar } from "./Components/Navbar/navbar.jsx"
import { Outlet } from "react-router-dom"
import { Footer } from "./Components/Footer/footer.jsx"

export function Layout() {
    return (
        <>
            <Navbar/>
            <main className="page-content">
                <Outlet/>
            </main>
            <Footer/>
        </>
    )
}
