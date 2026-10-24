/**
 * CivicRoute API Configuration
 * Supports dynamic production backend URLs (e.g. Render) via VITE_API_URL
 * while defaulting to http://127.0.0.1:8000 for seamless local development.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/+$/, "")
    : "http://127.0.0.1:8000";

export default API_BASE_URL;

