export const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8080" : window.location.origin);

export const getWSUrl = (pollId) => {
  const customWs = import.meta.env.VITE_WS_URL;
  if (customWs) {
    return `${customWs}/ws/polls/${pollId}`;
  }
  if (import.meta.env.VITE_API_URL) {
    const wsProto = import.meta.env.VITE_API_URL.startsWith("https") ? "wss:" : "ws:";
    const host = import.meta.env.VITE_API_URL.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `${wsProto}//${host}/ws/polls/${pollId}`;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  if (import.meta.env.DEV) {
    return `ws://localhost:8080/ws/polls/${pollId}`;
  }
  return `${protocol}//${window.location.host}/ws/polls/${pollId}`;
};

const getHeaders = () => {
  const headers = {
    "Content-Type": "application/json",
  };
  const token = localStorage.getItem("token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  async get(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  },

  async post(endpoint, body) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  },

  async delete(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  },

  async download(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, { headers: getHeaders() });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Download failed");
    }
    return res.blob();
  },

  async patch(endpoint, body) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  },
};
