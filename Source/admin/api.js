// API client for admin site (token-based).
// Configure your backend base URL here (empty = same origin).
(function () {
  const BASE_URL_KEY = "backend_base_url";
  const cfgUrl = (window.APP_CONFIG && window.APP_CONFIG.backendBaseUrl) || "";
  const stored = localStorage.getItem(BASE_URL_KEY);
  const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  let BASE_URL = (isLocal && stored) ? stored : (cfgUrl || stored || "http://localhost:8080");
  const TOKEN_KEY = "admin_access_token";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function setToken(token) {
    if (!token) {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    localStorage.setItem(TOKEN_KEY, token);
  }

  async function request(path, options, _retry) {
    const url = `${BASE_URL}${path}`;
    const headers = Object.assign(
      { "Content-Type": "application/json" },
      (options && options.headers) || {}
    );
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      res = await fetch(url, { ...(options || {}), headers });
    } catch (err) {
      // Network error: try port fallback once
      if (!_retry) {
        const alt = BASE_URL.includes(":8080") ? BASE_URL.replace(":8080", ":8081")
          : BASE_URL.includes(":8081") ? BASE_URL.replace(":8081", ":8080")
            : null;
        if (alt) {
          BASE_URL = alt;
          localStorage.setItem(BASE_URL_KEY, BASE_URL);
          return await request(path, options, true);
        }
      }
      const netErr = new Error(
        "Không kết nối được backend. Hãy chạy Spring Boot (localhost:8080) rồi thử lại."
      );
      netErr.cause = err;
      throw netErr;
    }
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      const message = (data && data.message) ? data.message : `HTTP ${res.status}`;
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function normalizeLoginId(value) {
    let s = String(value || "").trim();
    if (!s) return "";
    if (s.includes("@")) return s.toLowerCase();
    s = s.replace(/[\s.\-()]/g, "");
    if (s.startsWith("+84")) s = "0" + s.slice(3);
    else if (s.startsWith("84") && s.length >= 11) s = "0" + s.slice(2);
    return s;
  }

  const AuthApi = {
    tokenKey: TOKEN_KEY,
    isLoggedIn() {
      return Boolean(getToken());
    },
    async login(username, password) {
      const id = normalizeLoginId(username) || String(username || "").trim();
      const data = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ role: "admin", username: id, password })
      });
      // expected: { token, user }
      if (data && data.token) setToken(data.token);
      return data;
    },
    async logout() {
      try {
        await request("/api/auth/logout", { method: "POST", body: JSON.stringify({ role: "admin" }) });
      } catch {
        // ignore network errors on logout
      } finally {
        setToken("");
      }
    },
    async me() {
      return await request("/api/me", { method: "GET" });
    },
    async updateMe(patch) {
      return await request("/api/me", { method: "PUT", body: JSON.stringify(patch || {}) });
    }
  };

  const PasswordApi = {
    async forgotPassword(identifier) {
      return await request("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ role: "admin", identifier })
      });
    },
    async resetPassword(token, newPassword) {
      return await request("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword })
      });
    }
  };

  const ProductsApi = {
    async list() {
      return await request("/api/products", { method: "GET" });
    },
    async create(payload) {
      return await request("/api/products", { method: "POST", body: JSON.stringify(payload || {}) });
    },
    async update(id, payload) {
      return await request(`/api/products/${encodeURIComponent(String(id))}`, {
        method: "PUT",
        body: JSON.stringify(payload || {})
      });
    },
    async remove(id) {
      return await request(`/api/products/${encodeURIComponent(String(id))}`, { method: "DELETE" });
    }
  };

  const OrdersApi = {
    async list(status) {
      const q = status ? `?status=${encodeURIComponent(status)}` : "";
      return await request(`/api/orders${q}`, { method: "GET" });
    },
    async get(id) {
      return await request(`/api/orders/${encodeURIComponent(String(id))}`, { method: "GET" });
    },
    async create(payload) {
      return await request("/api/orders", { method: "POST", body: JSON.stringify(payload || {}) });
    },
    async updateStatus(id, status) {
      return await request(`/api/orders/${encodeURIComponent(String(id))}/status`, {
        method: "PUT",
        body: JSON.stringify({ status })
      });
    }
  };

  const UploadsApi = {
    async uploadImage(file) {
      if (!file) throw new Error("Vui lòng chọn ảnh");
      const url = `${BASE_URL}/api/uploads`;
      const token = getToken();
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const fd = new FormData();
      fd.append("file", file);

      let res;
      try {
        res = await fetch(url, { method: "POST", headers, body: fd });
      } catch (err) {
        // try fallback once
        const alt = BASE_URL.includes(":8080") ? BASE_URL.replace(":8080", ":8081")
          : BASE_URL.includes(":8081") ? BASE_URL.replace(":8081", ":8080")
            : null;
        if (alt) {
          BASE_URL = alt;
          localStorage.setItem(BASE_URL_KEY, BASE_URL);
          return await UploadsApi.uploadImage(file);
        }
        throw err;
      }
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      if (!res.ok) {
        const message = (data && data.message) ? data.message : `HTTP ${res.status}`;
        const err = new Error(message);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    }
  };

  window.Api = {
    request,
    AuthApi,
    ProductsApi,
    OrdersApi,
    PasswordApi,
    UploadsApi,
    getBaseUrl() {
      return BASE_URL;
    },
    setBaseUrl(url) {
      BASE_URL = String(url || "").replace(/\/$/, "");
      localStorage.setItem(BASE_URL_KEY, BASE_URL);
    }
  };
})();

