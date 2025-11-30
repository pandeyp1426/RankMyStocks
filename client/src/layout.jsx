import { useEffect, useState } from "react"
import { Navbar } from "./Components/Navbar/navbar.jsx"
import { Outlet } from "react-router-dom"
import { Footer } from "./Components/Footer/footer.jsx"
import { AnimatedBackground } from "./Components/MarketBackground/AnimatedBackground.jsx"

const getPreferredTheme = () => {
    if (typeof window === "undefined") return "dark"
    const stored = window.localStorage?.getItem("theme")
    if (stored === "dark" || stored === "light") {
        return stored
    }
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    return prefersDark ? "dark" : "light"
}

export function Layout() {
    const [theme, setTheme] = useState(getPreferredTheme)

    useEffect(() => {
        const classList = document.body.classList
        const nextClass = `theme-${theme}`
        classList.remove("theme-dark", "theme-light")
        classList.add(nextClass)
        window.localStorage?.setItem("theme", theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"))
    }

    return (
        <div className="layout-shell" data-theme={theme}>
            <AnimatedBackground/>
            <div className="layout-shell__content">
                <Navbar theme={theme} onToggleTheme={toggleTheme}/>
                <main className="page-content">
                    <Outlet/>
                </main>
                <Footer/>
            </div>
        </div>
    )
}
