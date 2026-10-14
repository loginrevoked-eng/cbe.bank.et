import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "./Config.jsx";

export const apiUrl = (path) => `${API_BASE_URL}${path}`;

async function requestJson(url, options = {}) {
  const response = await fetch(url, { credentials: "include", ...options });
  if (!response.ok) {
    let message = response.status === 404 ? "Not found" : `Request failed (${response.status})`;
    try {
      const error = await response.json();
      if (typeof error.detail === "string") {
        message = error.detail;
      } else if (Array.isArray(error.detail)) {
        message = error.detail
          .map((item) => `${(item.loc ?? []).filter((part) => part !== "body").join(".")}: ${item.msg}`)
          .join("\n");
      }
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new Error(message);
  }
  return response.json();
}

export const getJson = (url, signal) => requestJson(url, { signal });

export const postJson = (url, body, options = {}) => requestJson(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", ...options.headers },
  body: JSON.stringify(body),
  ...options,
});

export function useFetch(url) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) {
      setState({ data: null, loading: false, error: null });
      return undefined;
    }
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });

    getJson(url, controller.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (error.name !== "AbortError") {
          setState({ data: null, loading: false, error: error.message });
        }
      });

    return () => controller.abort();
  }, [url, attempt]);

  return { ...state, retry: () => setAttempt((count) => count + 1) };
}

export function usePost(url) {
  const [state, setState] = useState({ data: null, loading: false, error: null });
  const post = useCallback(async (body, requestUrl = url) => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await postJson(requestUrl, body);
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      setState({ data: null, loading: false, error: error.message });
      throw error;
    }
  }, [url]);
  const reset = useCallback(() => setState({ data: null, loading: false, error: null }), []);
  return { ...state, post, reset };
}
