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
    const [selectedCategories, setSelectedCategories] = useState([])
    const [tickerFilter, setTickerFilter] = useState("")

    const loadNews = useCallback(async ({ force = false, silent = false } = {}) => {
        try {
            setError("")
            if (!silent) setRefreshing(true)

            const qs = new URLSearchParams()
            if (force) qs.set("force", "1")
            qs.set("ts", Date.now().toString())

            const res = await fetch(`${API_URL}/api/market-news?${qs.toString()}`, {
                cache: "no-store",
            })
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
        loadNews({ silent: true })
        const intervalId = setInterval(() => loadNews({ silent: true }), 60000)
        return () => clearInterval(intervalId)
    }, [loadNews])

    const allCategories = useMemo(() => {
        const set = new Set()
        articles.forEach((a) => (a.categories || []).forEach((c) => set.add(c)))
        return Array.from(set).sort()
    }, [articles])

    const filteredArticles = useMemo(() => {
        return articles.filter((a) => {
            const hasCategory =
                selectedCategories.length === 0 ||
                (a.categories || []).some((c) => selectedCategories.includes(c))
            const tickerMatch =
                !tickerFilter.trim() ||
                (a.tickers || []).some((t) => t.toLowerCase().includes(tickerFilter.trim().toLowerCase()))
            return hasCategory && tickerMatch
        })
    }, [articles, selectedCategories, tickerFilter])

    const toggleCategory = (cat) => {
        setSelectedCategories((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        )
    }

    const content = useMemo(() => {
        const data = filteredArticles
        if (loading) {
            return <div className="news-placeholder">Loading the latest headlines...</div>
        }
        if (error) {
            return (
                <div className="news-placeholder error">
                    {error}
                    <button className="news-refresh" onClick={loadNews}>Try again</button>
                </div>
            )
        }
        if (!data.length) {
            return (
                <div className="news-placeholder">
                    No headlines match your filters. Try clearing them or check back shortly.
                </div>
            )
        }

        return (
            <div className="news-grid">
                {data.map((article, idx) => (
                    <article className="news-card" key={`${article.url || article.title}-${idx}`}>
                        <div className="news-card__meta">
                            <span className="pill">{article.source || "Unknown source"}</span>
                            <span className="timestamp">{formatRelative(article.publishedAt)}</span>
                        </div>
                        <h3 className="news-card__title">{article.title}</h3>
                        {article.summary && (
                            <p className="news-card__summary">{article.summary}</p>
                        )}
                        {(Array.isArray(article.tickers) && article.tickers.length > 0) || (article.categories?.length) ? (
                            <div className="news-card__chips">
                                {Array.isArray(article.tickers) && article.tickers.slice(0, 5).map((tkr) => (
                                    <span key={tkr} className="ticker-chip">{tkr}</span>
                                ))}
                                {(article.categories || []).map((cat) => (
                                    <span key={cat} className="category-chip">{cat}</span>
                                ))}
                            </div>
                        ) : null}
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
    }, [filteredArticles, error, loading, loadNews])

    return (
        <div className="news-page">
        <div className="news-hero">
            <div className="kicker kicker--live-style">Live market briefing</div>
            <h1>Market + Stock News</h1>
            <div className="news-actions__top">
                <div className="refresh-block">
                    <button
                        className={`news-refresh-icon ${refreshing ? "is-spinning" : ""}`}
                        onClick={() => loadNews({ force: true })}
                        aria-label="Refresh news"
                        title="Refresh now"
                    >
                        ↻
                    </button>
                    <div className="subtext refresh-subtext">
                        {lastUpdated ? (
                            <>Last updated {formatRelative(lastUpdated)} ({formatTimestamp(lastUpdated)})</>
                        ) : (
                            <>Last updated —</>
                        )}
                    </div>
                </div>
            </div>
            <div className="news-actions">
                <div className="news-actions__meta">
                    <span className="subtext">Auto-refreshes every 60 seconds</span>
                </div>
            </div>
        </div>
            <div className="news-filters">
                <div className="filter-group">
                    <span className="filter-label">Focus</span>
                    <div className="filter-chips">
                        <button
                            className={`filter-chip ${selectedCategories.length === 0 ? "active" : ""}`}
                            onClick={() => setSelectedCategories([])}
                        >
                            All
                        </button>
                        {allCategories.map((cat) => (
                            <button
                                key={cat}
                                className={`filter-chip ${selectedCategories.includes(cat) ? "active" : ""}`}
                                onClick={() => toggleCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="filter-group">
                    <span className="filter-label">Ticker</span>
                    <input
                        className="ticker-input"
                        placeholder="e.g., AAPL"
                        value={tickerFilter}
                        onChange={(e) => setTickerFilter(e.target.value)}
                    />
                </div>
            </div>
            {content}
        </div>
    )
}
