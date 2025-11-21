import { useCallback, useEffect, useMemo, useState } from "react"
import "./news.css"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5002"

const formatRelative = (isoString) => {
    if (!isoString) return "Just now"
    const ts = new Date(isoString).getTime()
    if (Number.isNaN(ts)) return "Just now"
    const diffMinutes = Math.floor((Date.now() - ts) / 60000)
    if (diffMinutes < 1) return "Just now"
    if (diffMinutes === 1) return "1 min ago"
    if (diffMinutes < 60) return `${diffMinutes} mins ago`
    const hours = Math.floor(diffMinutes / 60)
    if (hours === 1) return "1 hr ago"
    if (hours < 24) return `${hours} hrs ago`
    const days = Math.floor(hours / 24)
    return days === 1 ? "1 day ago" : `${days} days ago`
}

const formatTimestamp = (isoString) => {
    if (!isoString) return "Time n/a"
    const date = new Date(isoString)
    if (Number.isNaN(date.getTime())) return "Time n/a"
    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
    })
}

export function News() {
    const [articles, setArticles] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [lastUpdated, setLastUpdated] = useState(null)
    const [refreshing, setRefreshing] = useState(false)

    const loadNews = useCallback(async () => {
        try {
            setError("")
            setRefreshing(true)
            const res = await fetch(`${API_URL}/api/market-news`)
            if (!res.ok) {
                throw new Error(`Request failed with ${res.status}`)
            }
            const payload = await res.json()
            setArticles(Array.isArray(payload.articles) ? payload.articles : [])
            setLastUpdated(payload.asOf || new Date().toISOString())
            setError(payload.error || "")
        } catch (err) {
            console.error("Error loading news:", err)
            setError("Unable to load news right now. Please try again.")
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        loadNews()
        const intervalId = setInterval(loadNews, 60000)
        return () => clearInterval(intervalId)
    }, [loadNews])

    const localTz = useMemo(() => {
        try {
            const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(new Date())
            return parts.find((p) => p.type === "timeZoneName")?.value || "local time"
        } catch {
            return "local time"
        }
    }, [])

    const content = useMemo(() => {
        if (loading) {
            return <div className="news-placeholder">Loading the latest headlines…</div>
        }
        if (error) {
            return (
                <div className="news-placeholder error">
                    {error}
                    <button className="news-refresh" onClick={loadNews}>Try again</button>
                </div>
            )
        }
        if (!articles.length) {
            return (
                <div className="news-placeholder">
                    No headlines to show yet. Please check back shortly.
                </div>
            )
        }

        return (
            <div className="news-grid">
                {articles.map((article, idx) => (
                    <article className="news-card" key={`${article.url || article.title}-${idx}`}>
                        <div className="news-card__meta">
                            <span className="pill">{article.source || "Unknown source"}</span>
                            <span className="timestamp">{formatRelative(article.publishedAt)}</span>
                        </div>
                        <h3 className="news-card__title">{article.title}</h3>
                        {article.summary && (
                            <p className="news-card__summary">{article.summary}</p>
                        )}
                        {Array.isArray(article.tickers) && article.tickers.length > 0 && (
                            <div className="news-card__tickers">
                                {article.tickers.slice(0, 5).map((tkr) => (
                                    <span key={tkr} className="ticker-chip">{tkr}</span>
                                ))}
                            </div>
                        )}
                        <div className="news-card__footer">
                            <span className="timestamp">{formatTimestamp(article.publishedAt)}</span>
                            {article.url && (
                                <a
                                    className="news-link"
                                    href={article.url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Read full story
                                </a>
                            )}
                        </div>
                    </article>
                ))}
            </div>
        )
    }, [articles, error, loading, loadNews])

    return (
        <div className="news-page">
            <div className="news-hero">
                <div className="kicker">Live market briefing</div>
                <h1>Market + Stock News</h1>
                <p className="lead">
                    Fresh headlines on equities, macro, and markets. Updates automatically every minute so you can react faster.
                </p>
                <div className="news-actions">
                    <span className="pill live">Live</span>
                    <span className="subtext">Auto-refreshes every 60 seconds</span>
                    {lastUpdated && (
                        <span className="subtext">Last updated {formatRelative(lastUpdated)}</span>
                    )}
                    <span className="subtext">Times shown in {localTz}</span>
                    <button className="news-refresh" onClick={loadNews} disabled={refreshing}>
                        {refreshing ? "Refreshing…" : "Refresh now"}
                    </button>
                </div>
            </div>
            {content}
        </div>
    )
}
