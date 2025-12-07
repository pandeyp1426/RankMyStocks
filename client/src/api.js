const rawBase = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

// Always point requests at the API prefix. If VITE_API_URL is empty we fall back to same-origin /api.
const API_ROOT = `${rawBase}${rawBase.includes("/api") ? "" : "/api"}`;

export function apiUrl(path = "") {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${API_ROOT}${suffix}`;
}

export { API_ROOT };
