/* =====================================================================
 * IS207 Admin — Bảng điều khiển quản trị
 *
 * Cấu trúc:
 *  1) Helpers (format, color, escapeHtml...)
 *  2) State + caches (products, orders, customers, reports)
 *  3) Routing / Navigation
 *  4) Auth (login, profile, forgot password)
 *  5) Products module (CRUD + import CSV/XLSX)
 *  6) Orders module (table, filter, status update, detail modal)
 *  7) Customers module (aggregate from orders, detail modal)
 *  8) Reports module (KPIs + SVG charts: line+bar, donut, h-bar)
 *  9) Dashboard module (KPIs với so sánh hôm qua, mini chart)
 * 10) Notifications (poll đơn pending)
 * 11) Init
 * ===================================================================== */

document.addEventListener("DOMContentLoaded", () => {

  /* =========== 1) HELPERS ============================================ */

  const PAGE_STORAGE_KEY = "admin_active_page";
  const VALID_PAGES = ["dashboard", "products", "orders", "customers", "reports"];

  const FALLBACK_PRODUCT_IMAGES = {
    ao: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop",
    quan: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=300&fit=crop",
    vay: "https://images.unsplash.com/photo-1595777453558-2b9c6b0c5c0e?w=400&h=300&fit=crop",
    "ao-khoac": "https://images.unsplash.com/photo-1551028711-00167b16eac5?w=400&h=300&fit=crop"
  };

  const STATUS_LABEL = {
    pending: "Đang xử lý",
    shipping: "Đang giao",
    completed: "Hoàn thành",
    cancelled: "Đã hủy"
  };

  // Dùng hex trực tiếp vì SVG attribute fill không hỗ trợ CSS var()
  const STATUS_COLORS = {
    pending: "#F59E0B",
    shipping: "#3B82F6",
    completed: "#10B981",
    cancelled: "#EF4444"
  };

  const CHART_COLORS = {
    primary: "#5c4033",
    accent: "#b8956c",
    grid: "#e0d5c8",
    text: "#3d2e24",
    textSecondary: "#8a7566"
  };

  const STATUS_BADGE = {
    pending: "warning",
    shipping: "info",
    completed: "success",
    cancelled: "danger"
  };

  function formatCurrency(amount) {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency", currency: "VND", maximumFractionDigits: 0
    }).format(Number(amount) || 0);
  }

  function formatCompact(n) {
    const v = Number(n) || 0;
    if (Math.abs(v) >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "Tỷ";
    if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "Tr";
    if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + "K";
    return String(v);
  }

  function formatNumber(n) {
    return new Intl.NumberFormat("vi-VN").format(Number(n) || 0);
  }

  function formatPercent(n) {
    const v = Number(n) || 0;
    return (v >= 0 ? "+" : "") + v.toFixed(1) + "%";
  }

  function formatOrderDate(iso) {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString("vi-VN"); } catch { return String(iso); }
  }

  function formatShortDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
    } catch { return String(iso); }
  }

  function productImage(p) {
    if (p && p.image) return p.image;
    return FALLBACK_PRODUCT_IMAGES[p?.category] || FALLBACK_PRODUCT_IMAGES.ao;
  }

  function productImgOnError(category) {
    const url = FALLBACK_PRODUCT_IMAGES[category] || FALLBACK_PRODUCT_IMAGES.ao;
    return `this.onerror=null;this.src='${url}'`;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function mapCategory(code) {
    switch (code) {
      case "ao": return "Áo";
      case "quan": return "Quần";
      case "vay": return "Váy";
      case "ao-khoac": return "Áo khoác";
      default: return code || "Khác";
    }
  }

  function parseCommaList(str) {
    return String(str || "").split(",").map(s => s.trim()).filter(Boolean);
  }

  function parseStockBySize(str) {
    const out = {};
    for (const p of String(str || "").split(",")) {
      const [k, v] = p.split(":").map(x => (x || "").trim());
      if (!k) continue;
      out[k] = Number.isFinite(Number(v)) ? Number(v) : 0;
    }
    return out;
  }

  function sumStock(stockBySize) {
    if (!stockBySize) return 0;
    return Object.values(stockBySize).reduce((s, n) => s + (Number(n) || 0), 0);
  }

  function isPendingOrder(o) {
    const s = String(o && o.status ? o.status : "").toLowerCase();
    return s === "pending" || s === "processing" || s === "dang-xu-ly";
  }

  function isRevenueOrder(o) {
    // Doanh thu chỉ tính đơn ĐÃ HOÀN THÀNH (loại trừ pending/shipping/cancelled)
    return String(o && o.status || "").toLowerCase() === "completed";
  }

  function getInitial(name) {
    const s = String(name || "").trim();
    if (!s) return "?";
    const parts = s.split(/\s+/);
    return ((parts[parts.length - 1] || s)[0] || "?").toUpperCase();
  }

  function customerKey(o) {
    // Ưu tiên customerId, fallback về phone, rồi tên
    if (o && o.customerId) return "id:" + o.customerId;
    if (o && o.customerPhone) return "phone:" + o.customerPhone;
    if (o && o.customerName) return "name:" + o.customerName;
    return null;
  }

  function buildDateBuckets(fromDate, toDate) {
    // Trả về Map<YYYY-MM-DD, 0>
    const out = new Map();
    const d = new Date(fromDate);
    d.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(0, 0, 0, 0);
    while (d.getTime() <= end.getTime()) {
      out.set(localDateKey(d), 0);
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  function localDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  /* =========== TOAST ================================================= */

  const toastEl = (() => {
    const el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
    return el;
  })();

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 2000);
  }

  /* =========== 2) STATE ============================================== */

  let currentAdmin = null;
  let productsCache = [];
  let ordersCache = [];
  let notifyPollTimer = null;

  /* =========== 3) NAVIGATION ========================================= */

  const navItems = document.querySelectorAll(".nav-item");
  const pages = document.querySelectorAll(".page");
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  const globalSearchInput = document.getElementById("globalSearchInput");

  function getPageFromUrl() {
    const hash = (location.hash || "").replace(/^#/, "").trim();
    if (hash && VALID_PAGES.includes(hash)) return hash;
    const stored = sessionStorage.getItem(PAGE_STORAGE_KEY);
    if (stored && VALID_PAGES.includes(stored)) return stored;
    return "dashboard";
  }

  function navigateToPage(pageId, options) {
    const opts = options || {};
    const save = opts.save !== false;
    const skipAuthCheck = Boolean(opts.skipAuthCheck);

    if (!VALID_PAGES.includes(pageId)) pageId = "dashboard";
    if (!skipAuthCheck && !requireAdmin()) return false;

    navItems.forEach(nav => nav.classList.remove("active"));
    pages.forEach(page => page.classList.remove("active"));

    const navEl = document.querySelector(`.nav-item[data-page="${pageId}"]`);
    const pageEl = document.getElementById(pageId);
    if (navEl) navEl.classList.add("active");
    if (pageEl) pageEl.classList.add("active");

    if (save) {
      sessionStorage.setItem(PAGE_STORAGE_KEY, pageId);
      const newHash = `#${pageId}`;
      if (location.hash !== newHash) history.replaceState(null, "", newHash);
    }

    if (pageId === "dashboard") refreshDashboard();
    else if (pageId === "products") renderProductsTable();
    else if (pageId === "orders") refreshOrders();
    else if (pageId === "customers") renderCustomers();
    else if (pageId === "reports") renderReports();

    if (window.innerWidth <= 768 && sidebar) sidebar.classList.remove("active");
    return true;
  }

  navItems.forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      navigateToPage(item.getAttribute("data-page") || "dashboard");
    });
  });

  window.addEventListener("hashchange", () => {
    navigateToPage(getPageFromUrl(), { save: false, skipAuthCheck: true });
  });

  if (menuToggle) {
    menuToggle.addEventListener("click", () => sidebar.classList.toggle("active"));
  }

  document.addEventListener("click", e => {
    if (window.innerWidth <= 768) {
      if (sidebar && !sidebar.contains(e.target) && menuToggle && !menuToggle.contains(e.target)) {
        sidebar.classList.remove("active");
      }
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768 && sidebar) sidebar.classList.remove("active");
  });

  /* =========== 4) AUTH =============================================== */

  const adminUserToggle = document.getElementById("adminUserToggle");
  const adminUserName = document.getElementById("adminUserName");
  const adminAvatar = document.getElementById("adminAvatar");
  const adminAuthModal = document.getElementById("adminAuthModal");
  const adminAuthClose = document.getElementById("adminAuthClose");
  const adminLoginForm = document.getElementById("adminLoginForm");
  const adminUsernameInput = document.getElementById("adminUsername");
  const adminPasswordInput = document.getElementById("adminPassword");
  const adminProfileBox = document.getElementById("adminProfileBox");
  const adminFullName = document.getElementById("adminFullName");
  const adminPhone = document.getElementById("adminPhone");
  const adminEmail = document.getElementById("adminEmail");
  const adminAddress = document.getElementById("adminAddress");
  const adminLogoutBtn = document.getElementById("adminLogoutBtn");
  const adminSaveProfileBtn = document.getElementById("adminSaveProfileBtn");
  const adminForgotLink = document.getElementById("adminForgotLink");
  const adminResetModal = document.getElementById("adminResetModal");
  const adminResetClose = document.getElementById("adminResetClose");
  const adminForgotStep1 = document.getElementById("adminForgotStep1");
  const adminForgotForm = document.getElementById("adminForgotForm");
  const adminForgotIdentifier = document.getElementById("adminForgotIdentifier");
  const adminForgotMessage = document.getElementById("adminForgotMessage");
  const adminTokenBox = document.getElementById("adminTokenBox");
  const adminResetTokenDisplay = document.getElementById("adminResetTokenDisplay");
  const adminCopyTokenBtn = document.getElementById("adminCopyTokenBtn");
  const adminResetForm = document.getElementById("adminResetForm");
  const adminResetToken = document.getElementById("adminResetToken");
  const adminResetNewPassword = document.getElementById("adminResetNewPassword");
  const adminForgotBackBtn = document.getElementById("adminForgotBackBtn");
  const adminResetBackLogin = document.getElementById("adminResetBackLogin");
  const adminFpStatus = document.getElementById("adminFpStatus");
  const adminFpSendBtn = document.getElementById("adminFpSendBtn");
  const adminFpSendBtnText = document.getElementById("adminFpSendBtnText");

  function openModal(el) { if (el) el.classList.add("active"); }
  function closeModal(el) { if (el) el.classList.remove("active"); }

  async function refreshMe() {
    if (!window.Api?.AuthApi?.isLoggedIn()) {
      currentAdmin = null;
      return null;
    }
    try { currentAdmin = await window.Api.AuthApi.me(); }
    catch { currentAdmin = null; }
    return currentAdmin;
  }

  function applyAdminProfileToUI(u) {
    if (!u) return;
    const name = u.fullName || u.profile?.fullName || u.username || "Admin";
    if (adminUserName) adminUserName.textContent = name;
    if (adminAvatar) adminAvatar.textContent = getInitial(name);
    if (adminFullName) adminFullName.value = u.fullName || u.profile?.fullName || "";
    if (adminPhone) adminPhone.value = u.phone || u.profile?.phone || "";
    if (adminEmail) adminEmail.value = u.email || u.profile?.email || "";
    if (adminAddress) adminAddress.value = u.address || u.profile?.address || "";
  }

  function syncAdminUI() {
    const loggedIn = window.Api?.AuthApi?.isLoggedIn();
    if (!loggedIn) {
      currentAdmin = null;
      if (adminUserName) adminUserName.textContent = "Chưa đăng nhập";
      if (adminAvatar) adminAvatar.textContent = "?";
      if (adminLoginForm) adminLoginForm.style.display = "";
      if (adminProfileBox) adminProfileBox.style.display = "none";
      return;
    }
    if (adminLoginForm) adminLoginForm.style.display = "none";
    if (adminProfileBox) adminProfileBox.style.display = "";
    if (currentAdmin) {
      applyAdminProfileToUI(currentAdmin);
    } else {
      if (adminUserName) adminUserName.textContent = "Đang tải...";
      refreshMe().then(() => { if (currentAdmin) applyAdminProfileToUI(currentAdmin); });
    }
  }

  function requireAdmin() {
    if (window.Api?.AuthApi?.isLoggedIn()) return true;
    openModal(adminAuthModal);
    refreshMe().finally(syncAdminUI);
    return false;
  }

  if (adminUserToggle) {
    adminUserToggle.addEventListener("click", () => { openModal(adminAuthModal); syncAdminUI(); });
  }
  if (adminAuthClose) {
    adminAuthClose.addEventListener("click", () => {
      if (!currentAdmin) return;
      closeModal(adminAuthModal);
    });
  }
  if (adminAuthModal) {
    adminAuthModal.addEventListener("click", e => {
      if (e.target === adminAuthModal && currentAdmin) closeModal(adminAuthModal);
    });
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", e => {
      e.preventDefault();
      (async () => {
        try {
          const data = await window.Api.AuthApi.login(
            (adminUsernameInput.value || "").trim(),
            (adminPasswordInput.value || "").trim()
          );
          adminPasswordInput.value = "";
          currentAdmin = data?.user || null;
          if (!currentAdmin) await refreshMe();
          syncAdminUI();
          await refreshAll();
          startNotificationPolling();
          closeModal(adminAuthModal);
          toast("Đăng nhập admin thành công");
        } catch (err) {
          alert(err?.message || "Đăng nhập thất bại");
        }
      })();
    });
  }

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", () => {
      (async () => {
        try { await window.Api?.AuthApi?.logout(); }
        finally {
          currentAdmin = null;
          productsCache = [];
          ordersCache = [];
          syncAdminUI();
          openModal(adminAuthModal);
          toast("Đã đăng xuất");
        }
      })();
    });
  }

  if (adminSaveProfileBtn) {
    adminSaveProfileBtn.addEventListener("click", async () => {
      try {
        await window.Api.AuthApi.updateMe({
          fullName: adminFullName.value.trim(),
          phone: adminPhone.value.trim(),
          email: adminEmail.value.trim(),
          address: adminAddress.value.trim()
        });
        await refreshMe();
        syncAdminUI();
        closeModal(adminAuthModal);
        toast("Đã lưu thông tin admin");
      } catch (err) {
        alert(err?.message || "Lưu thất bại");
      }
    });
  }

  /* === Forgot password === */
  function setAdminFpStatus(message, type) {
    if (!adminFpStatus) return;
    if (!message) {
      adminFpStatus.textContent = "";
      adminFpStatus.className = "fp-status hidden";
      return;
    }
    adminFpStatus.textContent = message;
    adminFpStatus.className = "fp-status fp-status--" + (type || "info");
  }
  function setAdminForgotSending(s) {
    if (adminFpSendBtn) adminFpSendBtn.disabled = s;
    if (adminFpSendBtnText) adminFpSendBtnText.textContent = s ? "Đang gửi..." : "Gửi mã đặt lại";
  }
  function resetAdminForgotModal() {
    if (adminForgotIdentifier) adminForgotIdentifier.value = "";
    if (adminResetToken) adminResetToken.value = "";
    if (adminResetNewPassword) adminResetNewPassword.value = "";
    if (adminResetTokenDisplay) adminResetTokenDisplay.value = "";
    if (adminForgotMessage) adminForgotMessage.textContent = "";
    if (adminTokenBox) adminTokenBox.classList.add("hidden");
    if (adminForgotStep1) adminForgotStep1.classList.remove("hidden");
    if (adminResetForm) adminResetForm.classList.add("hidden");
    setAdminFpStatus("");
    setAdminForgotSending(false);
  }
  function openAdminResetModal() {
    resetAdminForgotModal();
    closeModal(adminAuthModal);
    openModal(adminResetModal);
  }
  if (adminForgotLink) adminForgotLink.addEventListener("click", openAdminResetModal);
  if (adminResetClose) adminResetClose.addEventListener("click", () => { closeModal(adminResetModal); openModal(adminAuthModal); });
  if (adminResetBackLogin) adminResetBackLogin.addEventListener("click", () => { closeModal(adminResetModal); openModal(adminAuthModal); });
  if (adminResetModal) adminResetModal.addEventListener("click", e => {
    if (e.target === adminResetModal) { closeModal(adminResetModal); openModal(adminAuthModal); }
  });
  if (adminForgotBackBtn) adminForgotBackBtn.addEventListener("click", () => {
    if (adminResetToken) adminResetToken.value = "";
    if (adminResetNewPassword) adminResetNewPassword.value = "";
    if (adminForgotStep1) adminForgotStep1.classList.remove("hidden");
    if (adminResetForm) adminResetForm.classList.add("hidden");
  });
  if (adminCopyTokenBtn) adminCopyTokenBtn.addEventListener("click", async () => {
    const text = adminResetTokenDisplay?.value || adminResetToken?.value || "";
    if (!text) return;
    try { await navigator.clipboard.writeText(text); toast("Đã sao chép mã"); }
    catch { toast("Hãy copy mã thủ công"); }
  });
  if (adminForgotForm) {
    adminForgotForm.addEventListener("submit", e => {
      e.preventDefault();
      (async () => {
        try {
          const identifier = (adminForgotIdentifier?.value || "").trim();
          if (!identifier) { setAdminFpStatus("Vui lòng nhập tài khoản admin.", "error"); return; }
          setAdminForgotSending(true);
          setAdminFpStatus("Đang gửi mã...", "info");
          const res = await window.Api.PasswordApi.forgotPassword(identifier);
          const msg = res?.message || "Nếu tài khoản tồn tại, mã đã được gửi.";
          if (adminForgotMessage) adminForgotMessage.textContent = msg;
          if (res?.resetToken) {
            if (adminResetToken) adminResetToken.value = res.resetToken;
            if (adminResetTokenDisplay) adminResetTokenDisplay.value = res.resetToken;
            if (adminTokenBox) adminTokenBox.classList.remove("hidden");
          } else {
            if (adminResetToken) adminResetToken.value = "";
            if (adminTokenBox) adminTokenBox.classList.add("hidden");
          }
          if (adminForgotStep1) adminForgotStep1.classList.add("hidden");
          if (adminResetForm) adminResetForm.classList.remove("hidden");
          setAdminFpStatus("");
          toast(res?.resetToken ? "Mã hiển thị trên màn hình" : "Đã gửi — kiểm tra email");
        } catch (err) {
          const text = err?.message || "Gửi yêu cầu thất bại";
          setAdminFpStatus(text, "error");
          alert(text);
        } finally { setAdminForgotSending(false); }
      })();
    });
  }
  if (adminResetForm) {
    adminResetForm.addEventListener("submit", e => {
      e.preventDefault();
      (async () => {
        try {
          const token = (adminResetToken?.value || "").trim();
          const newPassword = (adminResetNewPassword?.value || "").trim();
          if (!token) { alert("Vui lòng nhập mã đặt lại"); return; }
          if (newPassword.length < 6) { alert("Mật khẩu mới phải có ít nhất 6 ký tự"); return; }
          const res = await window.Api.PasswordApi.resetPassword(token, newPassword);
          toast(res?.message || "Đã đổi mật khẩu thành công");
          closeModal(adminResetModal);
          openModal(adminAuthModal);
          resetAdminForgotModal();
        } catch (err) {
          alert(err?.message || "Đổi mật khẩu thất bại");
        }
      })();
    });
  }

  /* =========== 5) PRODUCTS =========================================== */

  const addProductBtn = document.getElementById("addProductBtn");
  const productModal = document.getElementById("productModal");
  const productModalTitle = document.getElementById("productModalTitle");
  const closeProductModalBtn = document.getElementById("closeModal");
  const cancelBtn = document.getElementById("cancelBtn");
  const productForm = document.getElementById("productForm");
  const productsTbody = document.getElementById("productsTbody");

  const pfName = document.getElementById("pfName");
  const pfCategory = document.getElementById("pfCategory");
  const pfSku = document.getElementById("pfSku");
  const pfPrice = document.getElementById("pfPrice");
  const pfBrand = document.getElementById("pfBrand");
  const pfMaterial = document.getElementById("pfMaterial");
  const pfColors = document.getElementById("pfColors");
  const pfSizes = document.getElementById("pfSizes");
  const pfStockBySize = document.getElementById("pfStockBySize");
  const pfImage = document.getElementById("pfImage");
  const pfImageFile = document.getElementById("pfImageFile");
  const uploadImageBtn = document.getElementById("uploadImageBtn");
  const uploadHint = document.getElementById("uploadHint");

  const productsCategoryFilter = document.getElementById("productsCategoryFilter");
  const productsStatusFilter = document.getElementById("productsStatusFilter");
  const productsSearchInput = document.getElementById("productsSearchInput");

  let editingId = null;

  async function refreshProducts() {
    try {
      const data = await window.Api.ProductsApi.list();
      productsCache = Array.isArray(data) ? data : (data?.items || []);
    } catch (e) {
      productsCache = [];
      console.error(e);
      toast("Không tải được sản phẩm.");
    }
  }

  function openProductModal(mode, product) {
    if (!requireAdmin()) return;
    openModal(productModal);
    if (mode === "edit") {
      editingId = Number(product.id);
      productModalTitle.textContent = "Cập nhật sản phẩm";
      pfName.value = product.name || "";
      pfCategory.value = product.category || "ao";
      pfSku.value = product.sku || "";
      pfPrice.value = product.price || 0;
      pfBrand.value = product.brand || "";
      pfMaterial.value = product.material || "";
      pfColors.value = (product.colors || []).join(", ");
      pfSizes.value = (product.sizes || []).join(", ");
      pfStockBySize.value = Object.entries(product.stockBySize || {}).map(([k, v]) => `${k}:${v}`).join(", ");
      pfImage.value = product.image || "";
      if (pfImageFile) pfImageFile.value = "";
      if (uploadHint) uploadHint.textContent = "";
    } else {
      editingId = null;
      productModalTitle.textContent = "Thêm sản phẩm mới";
      productForm.reset();
      pfCategory.value = "ao";
      pfBrand.value = "IS207";
      pfImage.value = "";
      if (pfImageFile) pfImageFile.value = "";
      if (uploadHint) uploadHint.textContent = "";
    }
  }

  if (addProductBtn) addProductBtn.addEventListener("click", () => openProductModal("add"));
  if (closeProductModalBtn) closeProductModalBtn.addEventListener("click", () => closeModal(productModal));
  if (cancelBtn) cancelBtn.addEventListener("click", () => closeModal(productModal));
  if (productModal) productModal.addEventListener("click", e => { if (e.target === productModal) closeModal(productModal); });

  async function uploadSelectedImage() {
    if (!requireAdmin()) return;
    if (!pfImageFile?.files?.[0]) { toast("Vui lòng chọn ảnh"); return; }
    try {
      if (uploadHint) uploadHint.textContent = "Đang upload...";
      const res = await window.Api.UploadsApi.uploadImage(pfImageFile.files[0]);
      if (res?.url) {
        pfImage.value = res.url;
        toast("Upload ảnh thành công");
        if (uploadHint) uploadHint.textContent = "Đã upload ✓";
      } else {
        if (uploadHint) uploadHint.textContent = "";
        toast("Upload ảnh thất bại");
      }
    } catch (err) {
      if (uploadHint) uploadHint.textContent = "";
      alert(err?.message || "Upload thất bại");
    }
  }

  if (uploadImageBtn) uploadImageBtn.addEventListener("click", uploadSelectedImage);
  if (pfImageFile) pfImageFile.addEventListener("change", () => {
    if (uploadHint) uploadHint.textContent = pfImageFile.files?.[0]?.name || "";
  });

  function renderProductsTable() {
    if (!productsTbody) return;
    const kw = String(productsSearchInput?.value || "").trim().toLowerCase();
    const category = productsCategoryFilter?.value || "";
    const statusF = productsStatusFilter?.value || "";

    let products = productsCache.slice();
    if (category) products = products.filter(p => p.category === category);
    if (statusF) {
      products = products.filter(p => {
        const ts = sumStock(p.stockBySize);
        if (statusF === "in") return ts > 5;
        if (statusF === "low") return ts > 0 && ts <= 5;
        if (statusF === "out") return ts <= 0;
        return true;
      });
    }
    if (kw) {
      products = products.filter(p =>
        String(p.name || "").toLowerCase().includes(kw) ||
        String(p.sku || "").toLowerCase().includes(kw)
      );
    }

    if (!products.length) {
      const total = productsCache.length;
      const hint = total === 0
        ? "Chưa có sản phẩm. Bấm Thêm sản phẩm hoặc Import để thêm dữ liệu."
        : "Không có sản phẩm khớp bộ lọc.";
      productsTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-secondary)">${hint}</td></tr>`;
      return;
    }

    productsTbody.innerHTML = products.map(p => {
      const totalStock = sumStock(p.stockBySize);
      let status, badge;
      if (totalStock <= 0) { status = "Hết hàng"; badge = "danger"; }
      else if (totalStock <= 5) { status = "Sắp hết"; badge = "warning"; }
      else { status = "Còn hàng"; badge = "success"; }

      const attrs = [
        p.material ? `Chất liệu: ${escapeHtml(p.material)}` : null,
        (p.colors?.length) ? `Màu: ${escapeHtml(p.colors.slice(0, 3).join(", "))}${p.colors.length > 3 ? "..." : ""}` : null,
        (p.sizes?.length) ? `Size: ${escapeHtml(p.sizes.slice(0, 5).join(", "))}${p.sizes.length > 5 ? "..." : ""}` : null
      ].filter(Boolean).join("<br/>");

      return `
        <tr>
          <td><img src="${productImage(p)}" alt="" onerror="${productImgOnError(p.category)}"></td>
          <td>
            <div style="font-weight:600">${escapeHtml(p.name || "")}</div>
            <div style="font-size:12px; color: var(--text-secondary)">SKU: ${escapeHtml(p.sku || "")} • ${escapeHtml(p.brand || "")}</div>
          </td>
          <td>${escapeHtml(mapCategory(p.category))}</td>
          <td><strong>${formatCurrency(p.price)}</strong></td>
          <td style="font-size:12px; color: var(--text-secondary)">${attrs || "-"}</td>
          <td>${totalStock}</td>
          <td><span class="badge ${badge}">${status}</span></td>
          <td>
            <button class="btn-icon" data-edit="${p.id}" title="Sửa"><i class="fas fa-edit"></i></button>
            <button class="btn-icon danger" data-del="${p.id}" title="Xóa"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`;
    }).join("");

    productsTbody.querySelectorAll("[data-edit]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = Number(btn.getAttribute("data-edit"));
        const p = productsCache.find(x => Number(x.id) === id);
        if (p) openProductModal("edit", p);
      });
    });
    productsTbody.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.getAttribute("data-del"));
        if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;
        try {
          await window.Api.ProductsApi.remove(id);
          await refreshProducts();
          renderProductsTable();
          refreshDashboard();
          toast("Đã xóa sản phẩm");
        } catch (err) {
          alert(err?.message || "Xóa thất bại");
        }
      });
    });
  }

  if (productForm) {
    productForm.addEventListener("submit", e => {
      e.preventDefault();
      if (!requireAdmin()) return;

      const sizes = parseCommaList(pfSizes.value);
      const stockBySize = parseStockBySize(pfStockBySize.value);
      for (const s of sizes) if (stockBySize[s] == null) stockBySize[s] = 0;

      const payload = {
        name: (pfName.value || "").trim(),
        category: pfCategory.value,
        sku: (pfSku.value || "").trim(),
        price: Number(pfPrice.value || 0),
        brand: (pfBrand.value || "").trim(),
        material: (pfMaterial.value || "").trim(),
        colors: parseCommaList(pfColors.value),
        sizes,
        stockBySize,
        image: (pfImage.value || "").trim()
      };

      (async () => {
        try {
          if (editingId != null) await window.Api.ProductsApi.update(editingId, payload);
          else await window.Api.ProductsApi.create(payload);
          closeModal(productModal);
          await refreshProducts();
          renderProductsTable();
          refreshDashboard();
          toast(editingId != null ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm");
        } catch (err) {
          alert(err?.message || "Lưu thất bại");
        }
      })();
    });
  }

  /* === Import CSV/XLSX === */
  const IMPORT_TEMPLATE_CSV =
    "\uFEFFname,category,sku,price,brand,material,colors,sizes,stockBySize,image\n" +
    "Áo thun basic,ao,ATN001,250000,IS207,Cotton,Trắng;Đen,S;M;L,S:10;M:8;L:5,\n" +
    "Quần jean slim,quan,QJ002,450000,IS207,Jean,Đen,S;M;L;XL,S:5;M:12;L:10;XL:3,\n";

  const importModal = document.getElementById("importModal");
  const closeImportModalBtn = document.getElementById("closeImportModal");
  const importProductBtn = document.getElementById("importProductBtn");
  const downloadImportTemplateBtn = document.getElementById("downloadImportTemplateBtn");
  const importFileInput = document.getElementById("importFileInput");
  const importPickFileBtn = document.getElementById("importPickFileBtn");
  const importModalTemplateBtn = document.getElementById("importModalTemplateBtn");
  const importFileName = document.getElementById("importFileName");
  const importProgress = document.getElementById("importProgress");
  const importProgressFill = document.getElementById("importProgressFill");
  const importProgressText = document.getElementById("importProgressText");
  const importResult = document.getElementById("importResult");
  const importStartBtn = document.getElementById("importStartBtn");

  let importRowsPending = [];

  function downloadImportTemplate() {
    const blob = new Blob([IMPORT_TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "mau_san_pham.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function parseImportList(str) {
    const s = String(str || "").trim();
    if (!s) return [];
    const sep = s.includes(";") ? ";" : ",";
    return s.split(sep).map(x => x.trim()).filter(Boolean);
  }
  function parseImportStock(str) {
    const out = {};
    const s = String(str || "").trim();
    if (!s) return out;
    const sep = s.includes(";") ? ";" : ",";
    for (const part of s.split(sep)) {
      const chunk = part.trim();
      if (!chunk) continue;
      const delim = chunk.includes(":") ? ":" : "=";
      const [k, v] = chunk.split(delim).map(x => x.trim());
      if (!k) continue;
      out[k] = Number.isFinite(Number(v)) ? Number(v) : 0;
    }
    return out;
  }
  function normalizeHeader(h) {
    return String(h || "").trim().toLowerCase().replace(/\s+/g, "_").replace(/[^\w]/g, "");
  }
  const IMPORT_HEADER_MAP = {
    name: "name", ten: "name", tensanpham: "name",
    category: "category", danhmuc: "category", loai: "category",
    sku: "sku", ma: "sku", masku: "sku",
    price: "price", gia: "price", giaban: "price",
    brand: "brand", thuonghieu: "brand",
    material: "material", chatlieu: "material",
    colors: "colors", mau: "colors", mausac: "colors",
    sizes: "sizes", size: "sizes", kichco: "sizes",
    stockbysize: "stockBySize", tonkho: "stockBySize", stock: "stockBySize",
    image: "image", hinhanh: "image", url: "image", anh: "image"
  };
  function rowsToProducts(rows) {
    if (!rows || rows.length < 2) return [];
    const headers = rows[0].map(normalizeHeader);
    const keys = headers.map(h => IMPORT_HEADER_MAP[h] || h);
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => !String(c || "").trim())) continue;
      const obj = {};
      keys.forEach((k, idx) => { if (k && row[idx] != null) obj[k] = String(row[idx]).trim(); });
      const name = (obj.name || "").trim();
      const sku = (obj.sku || "").trim();
      if (!name && !sku) continue;
      const category = (obj.category || "ao").trim().toLowerCase();
      const price = Number(String(obj.price || "0").replace(/[^\d]/g, "")) || 0;
      const colors = parseImportList(obj.colors);
      const sizes = parseImportList(obj.sizes);
      let stockBySize = parseImportStock(obj.stockBySize);
      for (const s of sizes) if (stockBySize[s] == null) stockBySize[s] = 0;
      const image = (obj.image || "").trim() ||
        FALLBACK_PRODUCT_IMAGES[category] || FALLBACK_PRODUCT_IMAGES.ao;
      out.push({
        name: name || sku, category, sku: sku || `IMP${Date.now()}${i}`, price,
        brand: (obj.brand || "IS207").trim(), material: (obj.material || "").trim(),
        colors, sizes, stockBySize, image, _row: i + 1
      });
    }
    return out;
  }
  function parseCsvText(text) {
    const rows = []; let row = []; let cell = ""; let inQ = false;
    const s = String(text || "").replace(/^\uFEFF/, "");
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (inQ) {
        if (ch === "\"") { if (s[i + 1] === "\"") { cell += "\""; i++; } else inQ = false; }
        else cell += ch;
      } else if (ch === "\"") inQ = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && s[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += ch;
    }
    row.push(cell);
    if (row.length > 1 || row[0]) rows.push(row);
    return rows;
  }
  async function readImportFile(file) {
    const name = (file.name || "").toLowerCase();
    if (name.endsWith(".csv")) return rowsToProducts(parseCsvText(await file.text()));
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      if (typeof XLSX === "undefined") throw new Error("Thư viện Excel chưa tải.");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
      return rowsToProducts(rows);
    }
    throw new Error("Chỉ hỗ trợ file .csv, .xlsx, .xls");
  }
  function openImportModal() {
    if (!requireAdmin()) return;
    importRowsPending = [];
    if (importFileInput) importFileInput.value = "";
    if (importFileName) importFileName.textContent = "";
    if (importProgress) importProgress.hidden = true;
    if (importResult) { importResult.hidden = true; importResult.innerHTML = ""; }
    if (importStartBtn) importStartBtn.disabled = true;
    openModal(importModal);
  }
  async function onImportFileSelected(file) {
    if (!file) return;
    try {
      importRowsPending = await readImportFile(file);
      if (importFileName) importFileName.textContent = `${file.name} — ${importRowsPending.length} sản phẩm hợp lệ`;
      if (importStartBtn) importStartBtn.disabled = importRowsPending.length === 0;
      if (importRowsPending.length === 0) toast("File không có dòng dữ liệu hợp lệ");
    } catch (err) {
      importRowsPending = [];
      if (importStartBtn) importStartBtn.disabled = true;
      alert(err?.message || "Đọc file thất bại");
    }
  }
  async function runProductImport() {
    if (!requireAdmin() || !importRowsPending.length) return;
    const total = importRowsPending.length;
    let ok = 0, fail = 0;
    if (importProgress) importProgress.hidden = false;
    if (importResult) { importResult.hidden = false; importResult.innerHTML = ""; }
    if (importStartBtn) importStartBtn.disabled = true;
    for (let i = 0; i < total; i++) {
      const p = importRowsPending[i];
      const pct = Math.round(((i + 1) / total) * 100);
      if (importProgressFill) importProgressFill.style.width = `${pct}%`;
      if (importProgressText) importProgressText.textContent = `Đang import ${i + 1}/${total}: ${p.name}`;
      const payload = {
        name: p.name, category: p.category, sku: p.sku, price: p.price,
        brand: p.brand, material: p.material, colors: p.colors,
        sizes: p.sizes, stockBySize: p.stockBySize, image: p.image
      };
      try {
        await window.Api.ProductsApi.create(payload);
        ok++;
        if (importResult) importResult.innerHTML += `<div class="ok">Dòng ${p._row}: OK — ${escapeHtml(p.sku)}</div>`;
      } catch (err) {
        fail++;
        const msg = err?.message || "Lỗi";
        if (importResult) importResult.innerHTML += `<div class="err">Dòng ${p._row}: ${escapeHtml(msg)}</div>`;
      }
    }
    await refreshProducts();
    renderProductsTable();
    refreshDashboard();
    if (importProgressText) importProgressText.textContent = `Hoàn tất: ${ok} thành công, ${fail} lỗi`;
    toast(`Import xong: ${ok}/${total} sản phẩm`);
    if (importStartBtn) importStartBtn.disabled = false;
    importRowsPending = [];
  }
  if (importProductBtn) importProductBtn.addEventListener("click", openImportModal);
  if (downloadImportTemplateBtn) downloadImportTemplateBtn.addEventListener("click", downloadImportTemplate);
  if (importModalTemplateBtn) importModalTemplateBtn.addEventListener("click", downloadImportTemplate);
  if (closeImportModalBtn) closeImportModalBtn.addEventListener("click", () => closeModal(importModal));
  if (importModal) importModal.addEventListener("click", e => { if (e.target === importModal) closeModal(importModal); });
  if (importPickFileBtn && importFileInput) importPickFileBtn.addEventListener("click", () => importFileInput.click());
  if (importFileInput) importFileInput.addEventListener("change", () => {
    const f = importFileInput.files?.[0]; if (f) onImportFileSelected(f);
  });
  if (importStartBtn) importStartBtn.addEventListener("click", runProductImport);

  if (productsCategoryFilter) productsCategoryFilter.addEventListener("change", renderProductsTable);
  if (productsStatusFilter) productsStatusFilter.addEventListener("change", renderProductsTable);
  if (productsSearchInput) productsSearchInput.addEventListener("input", renderProductsTable);

  if (globalSearchInput) {
    globalSearchInput.addEventListener("input", () => {
      const kw = String(globalSearchInput.value || "").trim();
      if (productsSearchInput) productsSearchInput.value = kw;
      navigateToPage("products", { skipAuthCheck: true });
    });
  }

  /* =========== 6) ORDERS ============================================= */

  const ordersTbody = document.getElementById("ordersTbody");
  const ordersStatusFilter = document.getElementById("ordersStatusFilter");
  const ordersSearchInput = document.getElementById("ordersSearchInput");
  const ordersDateFrom = document.getElementById("ordersDateFrom");
  const ordersDateTo = document.getElementById("ordersDateTo");

  // Order detail modal
  const orderDetailModal = document.getElementById("orderDetailModal");
  const orderDetailClose = document.getElementById("orderDetailClose");
  const odCode = document.getElementById("odCode");
  const odCreatedAt = document.getElementById("odCreatedAt");
  const odCustomerName = document.getElementById("odCustomerName");
  const odCustomerPhone = document.getElementById("odCustomerPhone");
  const odShippingAddress = document.getElementById("odShippingAddress");
  const odNote = document.getElementById("odNote");
  const odStatus = document.getElementById("odStatus");
  const odSource = document.getElementById("odSource");
  const odSubtotal = document.getElementById("odSubtotal");
  const odShippingFee = document.getElementById("odShippingFee");
  const odTotal = document.getElementById("odTotal");
  const odItemsTbody = document.getElementById("odItemsTbody");
  const odStatusActions = document.getElementById("odStatusActions");

  if (orderDetailClose) orderDetailClose.addEventListener("click", () => closeModal(orderDetailModal));
  if (orderDetailModal) orderDetailModal.addEventListener("click", e => {
    if (e.target === orderDetailModal) closeModal(orderDetailModal);
  });

  async function refreshOrders() {
    if (!window.Api?.OrdersApi) return;
    try {
      const status = ordersStatusFilter?.value || "";
      ordersCache = await window.Api.OrdersApi.list(status || undefined);
      if (!Array.isArray(ordersCache)) ordersCache = [];
      renderOrdersTable();
      refreshDashboard();
      await refreshNotifications();
    } catch (e) {
      console.error(e);
      if (ordersTbody) {
        ordersTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-secondary)">Không tải được đơn hàng</td></tr>`;
      }
    }
  }

  function filterOrdersForTable() {
    const status = ordersStatusFilter?.value || "";
    const kw = String(ordersSearchInput?.value || "").trim().toLowerCase();
    const dFrom = ordersDateFrom?.value ? new Date(ordersDateFrom.value) : null;
    const dTo = ordersDateTo?.value ? new Date(ordersDateTo.value) : null;
    if (dTo) dTo.setHours(23, 59, 59, 999);

    return ordersCache.filter(o => {
      if (status) {
        const s = String(o.status || "").toLowerCase();
        if (s !== status.toLowerCase()) return false;
      }
      if (kw) {
        const hay = `${o.orderCode || ""} ${o.customerName || ""} ${o.customerPhone || ""}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      if (dFrom || dTo) {
        const t = o.createdAt ? new Date(o.createdAt).getTime() : 0;
        if (dFrom && t < dFrom.getTime()) return false;
        if (dTo && t > dTo.getTime()) return false;
      }
      return true;
    });
  }

  function renderOrdersTable() {
    if (!ordersTbody) return;
    const list = filterOrdersForTable();
    if (!list.length) {
      ordersTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-secondary)">Không có đơn hàng nào phù hợp</td></tr>`;
      return;
    }
    ordersTbody.innerHTML = list.map(o => {
      const sk = String(o.status || "").toLowerCase();
      return `
        <tr>
          <td><strong>${escapeHtml(o.orderCode || ("#" + o.id))}</strong></td>
          <td>
            <div class="cust-cell">
              <div class="cust-avatar">${escapeHtml(getInitial(o.customerName))}</div>
              <div>
                <div class="cust-cell-name">${escapeHtml(o.customerName || "—")}</div>
                <div style="font-size:12px;color:var(--text-secondary)">${escapeHtml(o.customerPhone || "—")}</div>
              </div>
            </div>
          </td>
          <td>${formatOrderDate(o.createdAt)}</td>
          <td style="max-width:260px">${escapeHtml(o.itemsSummary || "-")}</td>
          <td><strong>${formatCurrency(o.total)}</strong></td>
          <td><span class="badge ${STATUS_BADGE[sk] || "muted"}">${escapeHtml(o.statusLabel || STATUS_LABEL[sk] || o.status || "")}</span></td>
          <td>
            <button class="btn-icon" data-order-view="${o.id}" title="Xem chi tiết"><i class="fas fa-eye"></i></button>
          </td>
        </tr>`;
    }).join("");

    ordersTbody.querySelectorAll("[data-order-view]").forEach(btn => {
      btn.addEventListener("click", () => openOrderDetail(Number(btn.getAttribute("data-order-view"))));
    });
  }

  async function openOrderDetail(id) {
    try {
      const o = await window.Api.OrdersApi.get(id);
      const sk = String(o.status || "").toLowerCase();
      odCode.textContent = o.orderCode || ("Đơn #" + o.id);
      odCreatedAt.textContent = `Đặt lúc ${formatOrderDate(o.createdAt)}`;
      odCustomerName.textContent = o.customerName || "—";
      odCustomerPhone.textContent = o.customerPhone || "—";
      odShippingAddress.textContent = o.shippingAddress || "—";
      odNote.textContent = o.note || "—";
      odStatus.innerHTML = `<span class="badge ${STATUS_BADGE[sk] || "muted"}">${escapeHtml(o.statusLabel || STATUS_LABEL[sk] || o.status || "")}</span>`;
      odSource.textContent = (o.createdByRole === "admin") ? "Tại quầy / Admin" : "Khách hàng (online)";
      odSubtotal.textContent = formatCurrency(o.subtotal);
      odShippingFee.textContent = formatCurrency(o.shippingFee);
      odTotal.textContent = formatCurrency(o.total);

      const items = Array.isArray(o.items) ? o.items : [];
      odItemsTbody.innerHTML = items.length
        ? items.map(i => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  ${i.image ? `<img src="${escapeHtml(i.image)}" alt="">` : ""}
                  <span>${escapeHtml(i.productName || "—")}</span>
                </div>
              </td>
              <td>${escapeHtml(i.sku || "—")}</td>
              <td>${escapeHtml(i.size || "—")} / ${escapeHtml(i.color || "—")}</td>
              <td>${i.qty}</td>
              <td>${formatCurrency(i.unitPrice)}</td>
              <td><strong>${formatCurrency(i.lineTotal)}</strong></td>
            </tr>`).join("")
        : `<tr><td colspan="6" style="text-align:center;color:var(--text-secondary)">Không có sản phẩm</td></tr>`;

      const statusFlow = ["pending", "shipping", "completed", "cancelled"];
      odStatusActions.innerHTML = statusFlow.map(s => `
        <button data-set-status="${s}" data-order-id="${o.id}" class="${s === sk ? "active" : ""}" ${s === sk ? "disabled" : ""}>
          ${STATUS_LABEL[s]}
        </button>`).join("");
      odStatusActions.querySelectorAll("[data-set-status]").forEach(btn => {
        btn.addEventListener("click", async () => {
          const next = btn.getAttribute("data-set-status");
          const oid = Number(btn.getAttribute("data-order-id"));
          if (!confirm(`Đổi trạng thái sang “${STATUS_LABEL[next]}”?`)) return;
          try {
            await window.Api.OrdersApi.updateStatus(oid, next);
            toast("Đã cập nhật trạng thái");
            closeModal(orderDetailModal);
            await refreshOrders();
          } catch (err) {
            alert(err?.message || "Cập nhật thất bại");
          }
        });
      });

      openModal(orderDetailModal);
    } catch (err) {
      alert(err?.message || "Không tải được chi tiết đơn");
    }
  }

  if (ordersStatusFilter) ordersStatusFilter.addEventListener("change", refreshOrders);
  if (ordersSearchInput) ordersSearchInput.addEventListener("input", renderOrdersTable);
  if (ordersDateFrom) ordersDateFrom.addEventListener("change", renderOrdersTable);
  if (ordersDateTo) ordersDateTo.addEventListener("change", renderOrdersTable);

  /* =========== 7) CUSTOMERS ========================================== */

  const customersTbody = document.getElementById("customersTbody");
  const customersSearchInput = document.getElementById("customersSearchInput");
  const customersSortBy = document.getElementById("customersSortBy");
  const custTotal = document.getElementById("custTotal");
  const custReturning = document.getElementById("custReturning");
  const custAvgSpent = document.getElementById("custAvgSpent");
  const custLast30 = document.getElementById("custLast30");

  // customer detail modal
  const customerDetailModal = document.getElementById("customerDetailModal");
  const customerDetailClose = document.getElementById("customerDetailClose");
  const cdName = document.getElementById("cdName");
  const cdPhone = document.getElementById("cdPhone");
  const cdOrders = document.getElementById("cdOrders");
  const cdSpent = document.getElementById("cdSpent");
  const cdAov = document.getElementById("cdAov");
  const cdLast = document.getElementById("cdLast");
  const cdOrdersTbody = document.getElementById("cdOrdersTbody");

  if (customerDetailClose) customerDetailClose.addEventListener("click", () => closeModal(customerDetailModal));
  if (customerDetailModal) customerDetailModal.addEventListener("click", e => {
    if (e.target === customerDetailModal) closeModal(customerDetailModal);
  });

  function aggregateCustomers() {
    const map = new Map();
    for (const o of ordersCache) {
      const key = customerKey(o);
      if (!key) continue;
      const rec = map.get(key) || {
        key,
        name: o.customerName || "Khách",
        phone: o.customerPhone || "",
        orders: [],
        totalSpent: 0,
        completedSpent: 0,
        lastAt: null,
        firstAt: null
      };
      rec.orders.push(o);
      const isPaid = isRevenueOrder(o);
      const total = Number(o.total) || 0;
      rec.totalSpent += total;
      if (isPaid) rec.completedSpent += total;
      const at = o.createdAt ? new Date(o.createdAt).getTime() : 0;
      if (!rec.lastAt || at > rec.lastAt) rec.lastAt = at;
      if (!rec.firstAt || at < rec.firstAt) rec.firstAt = at;
      if (o.customerName && !rec.name) rec.name = o.customerName;
      if (o.customerPhone && !rec.phone) rec.phone = o.customerPhone;
      map.set(key, rec);
    }
    return Array.from(map.values());
  }

  function renderCustomers() {
    if (!customersTbody) return;
    if (!window.Api?.AuthApi?.isLoggedIn()) {
      customersTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-secondary)">Đăng nhập admin để xem danh sách khách hàng.</td></tr>`;
      return;
    }

    const list = aggregateCustomers();

    // KPI summary
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const totalAll = list.length;
    const returning = list.filter(c => c.orders.length > 1).length;
    const totalSpent = list.reduce((s, c) => s + c.completedSpent, 0);
    const last30 = list.filter(c => c.lastAt && (now - c.lastAt) <= thirtyDays).length;

    if (custTotal) custTotal.textContent = formatNumber(totalAll);
    if (custReturning) custReturning.textContent = formatNumber(returning);
    if (custAvgSpent) custAvgSpent.textContent = formatCurrency(totalAll ? totalSpent / totalAll : 0);
    if (custLast30) custLast30.textContent = formatNumber(last30);

    // Sort + search
    const kw = String(customersSearchInput?.value || "").trim().toLowerCase();
    const sortKey = customersSortBy?.value || "spent";
    let display = list.slice();
    if (kw) display = display.filter(c =>
      String(c.name).toLowerCase().includes(kw) ||
      String(c.phone).toLowerCase().includes(kw)
    );
    display.sort((a, b) => {
      if (sortKey === "orders") return b.orders.length - a.orders.length;
      if (sortKey === "recent") return (b.lastAt || 0) - (a.lastAt || 0);
      if (sortKey === "name") return String(a.name).localeCompare(String(b.name), "vi");
      return b.completedSpent - a.completedSpent;
    });

    if (!display.length) {
      customersTbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-secondary)">Chưa có khách hàng. Khi có đơn hàng đầu tiên, dữ liệu sẽ tự cập nhật.</td></tr>`;
      return;
    }

    customersTbody.innerHTML = display.map(c => {
      const aov = c.orders.length ? Math.round(c.totalSpent / c.orders.length) : 0;
      return `
        <tr>
          <td>
            <div class="cust-cell">
              <div class="cust-avatar">${escapeHtml(getInitial(c.name))}</div>
              <div class="cust-cell-name">${escapeHtml(c.name)}</div>
            </div>
          </td>
          <td>${escapeHtml(c.phone || "—")}</td>
          <td><strong>${c.orders.length}</strong></td>
          <td><strong>${formatCurrency(c.completedSpent)}</strong>
              <div style="font-size:12px;color:var(--text-secondary)">Tổng (mọi đơn): ${formatCurrency(c.totalSpent)}</div></td>
          <td>${formatCurrency(aov)}</td>
          <td>${c.lastAt ? formatOrderDate(new Date(c.lastAt)) : "—"}</td>
          <td>
            <button class="btn-icon" data-cust="${encodeURIComponent(c.key)}" title="Xem chi tiết"><i class="fas fa-eye"></i></button>
          </td>
        </tr>`;
    }).join("");

    customersTbody.querySelectorAll("[data-cust]").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = decodeURIComponent(btn.getAttribute("data-cust"));
        const c = list.find(x => x.key === key);
        if (c) openCustomerDetail(c);
      });
    });
  }

  function openCustomerDetail(c) {
    cdName.textContent = c.name;
    cdPhone.textContent = c.phone || "Chưa có số điện thoại";
    cdOrders.textContent = formatNumber(c.orders.length);
    cdSpent.textContent = formatCurrency(c.completedSpent);
    cdAov.textContent = formatCurrency(c.orders.length ? c.totalSpent / c.orders.length : 0);
    cdLast.textContent = c.lastAt ? formatShortDate(new Date(c.lastAt)) : "—";

    const sorted = [...c.orders].sort((a, b) =>
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    cdOrdersTbody.innerHTML = sorted.map(o => {
      const sk = String(o.status || "").toLowerCase();
      return `
        <tr>
          <td><strong>${escapeHtml(o.orderCode || ("#" + o.id))}</strong></td>
          <td>${formatOrderDate(o.createdAt)}</td>
          <td style="max-width:260px">${escapeHtml(o.itemsSummary || "-")}</td>
          <td>${formatCurrency(o.total)}</td>
          <td><span class="badge ${STATUS_BADGE[sk] || "muted"}">${escapeHtml(o.statusLabel || STATUS_LABEL[sk] || o.status)}</span></td>
          <td><button class="btn-icon" data-cd-view="${o.id}" title="Xem"><i class="fas fa-eye"></i></button></td>
        </tr>`;
    }).join("");
    cdOrdersTbody.querySelectorAll("[data-cd-view]").forEach(btn => {
      btn.addEventListener("click", () => {
        closeModal(customerDetailModal);
        openOrderDetail(Number(btn.getAttribute("data-cd-view")));
      });
    });

    openModal(customerDetailModal);
  }

  if (customersSearchInput) customersSearchInput.addEventListener("input", renderCustomers);
  if (customersSortBy) customersSortBy.addEventListener("change", renderCustomers);

  /* =========== 8) REPORTS ============================================ */

  const reportRangeTabs = document.getElementById("reportRangeTabs");
  const reportRangeCustom = document.getElementById("reportRangeCustom");
  const reportDateFrom = document.getElementById("reportDateFrom");
  const reportDateTo = document.getElementById("reportDateTo");
  const reportApplyCustom = document.getElementById("reportApplyCustom");

  const rpRevenue = document.getElementById("rpRevenue");
  const rpRevenueTrend = document.getElementById("rpRevenueTrend");
  const rpCompleted = document.getElementById("rpCompleted");
  const rpCompletedTrend = document.getElementById("rpCompletedTrend");
  const rpCancelRate = document.getElementById("rpCancelRate");
  const rpAov = document.getElementById("rpAov");
  const rpDailySub = document.getElementById("rpDailySub");

  let reportRangeDays = 30;
  let reportCustomFrom = null;
  let reportCustomTo = null;

  function setRangeTabActive(value) {
    if (!reportRangeTabs) return;
    reportRangeTabs.querySelectorAll("button").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-range") === value);
    });
  }

  if (reportRangeTabs) {
    reportRangeTabs.addEventListener("click", e => {
      const btn = e.target.closest("button[data-range]");
      if (!btn) return;
      const val = btn.getAttribute("data-range");
      setRangeTabActive(val);
      if (val === "custom") {
        reportRangeCustom?.classList.remove("hidden");
        const now = new Date();
        const from = new Date(); from.setDate(from.getDate() - 30);
        if (!reportDateFrom.value) reportDateFrom.value = localDateKey(from);
        if (!reportDateTo.value) reportDateTo.value = localDateKey(now);
      } else {
        reportRangeCustom?.classList.add("hidden");
        reportRangeDays = Number(val) || 30;
        reportCustomFrom = null;
        reportCustomTo = null;
        renderReports();
      }
    });
  }

  if (reportApplyCustom) {
    reportApplyCustom.addEventListener("click", () => {
      if (!reportDateFrom.value || !reportDateTo.value) {
        toast("Chọn cả 2 ngày"); return;
      }
      reportCustomFrom = new Date(reportDateFrom.value);
      reportCustomTo = new Date(reportDateTo.value);
      reportCustomTo.setHours(23, 59, 59, 999);
      renderReports();
    });
  }

  function getReportRange() {
    if (reportCustomFrom && reportCustomTo) {
      return { from: reportCustomFrom, to: reportCustomTo, days: Math.max(1, Math.round((reportCustomTo - reportCustomFrom) / 86400000) + 1) };
    }
    const to = new Date(); to.setHours(23, 59, 59, 999);
    const from = new Date(); from.setDate(from.getDate() - (reportRangeDays - 1));
    from.setHours(0, 0, 0, 0);
    return { from, to, days: reportRangeDays };
  }

  function ordersInRange(from, to) {
    return ordersCache.filter(o => {
      const t = o.createdAt ? new Date(o.createdAt).getTime() : 0;
      return t >= from.getTime() && t <= to.getTime();
    });
  }

  function renderReports() {
    const { from, to, days } = getReportRange();
    const inRange = ordersInRange(from, to);
    const completed = inRange.filter(isRevenueOrder);
    const cancelled = inRange.filter(o => String(o.status || "").toLowerCase() === "cancelled");
    const revenue = completed.reduce((s, o) => s + (Number(o.total) || 0), 0);

    // Previous period for trend
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - (days - 1));
    prevFrom.setHours(0, 0, 0, 0);
    const prevInRange = ordersInRange(prevFrom, prevTo);
    const prevCompleted = prevInRange.filter(isRevenueOrder);
    const prevRevenue = prevCompleted.reduce((s, o) => s + (Number(o.total) || 0), 0);

    if (rpRevenue) rpRevenue.textContent = formatCurrency(revenue);
    setTrendText(rpRevenueTrend, revenue, prevRevenue);
    if (rpCompleted) rpCompleted.textContent = formatNumber(completed.length);
    setTrendText(rpCompletedTrend, completed.length, prevCompleted.length);
    const cancelRate = inRange.length ? (cancelled.length / inRange.length) * 100 : 0;
    if (rpCancelRate) rpCancelRate.textContent = cancelRate.toFixed(1) + " %";
    const aov = completed.length ? revenue / completed.length : 0;
    if (rpAov) rpAov.textContent = formatCurrency(aov);

    if (rpDailySub) {
      rpDailySub.textContent = `${formatShortDate(from)} → ${formatShortDate(to)} (${days} ngày)`;
    }

    renderChartRevenueDaily(inRange, from, to);
    renderChartOrderStatus(inRange);
    renderChartByCategory(completed);
    renderChartTopProducts(completed);
    renderChartTopCustomers(completed);
    renderChartByHour(inRange);
  }

  function setTrendText(el, current, prev) {
    if (!el) return;
    if (!prev) {
      el.textContent = "— so với kỳ trước";
      el.className = "kpi-trend muted";
      return;
    }
    const pct = ((current - prev) / prev) * 100;
    el.textContent = `${formatPercent(pct)} so với kỳ trước`;
    el.className = "kpi-trend " + (pct >= 0 ? "positive" : "negative");
  }

  /* === Chart: Doanh thu + số đơn theo ngày (line + bar combo) === */
  function renderChartRevenueDaily(orders, from, to) {
    const host = document.getElementById("chartRevenueDaily");
    if (!host) return;
    const buckets = buildDateBuckets(from, to);
    const revBuckets = new Map(buckets);
    const countBuckets = new Map(buckets);
    for (const o of orders) {
      if (!o.createdAt) continue;
      const k = localDateKey(new Date(o.createdAt));
      if (countBuckets.has(k)) {
        countBuckets.set(k, countBuckets.get(k) + 1);
        if (isRevenueOrder(o)) revBuckets.set(k, revBuckets.get(k) + (Number(o.total) || 0));
      }
    }
    const keys = Array.from(buckets.keys());
    const revVals = keys.map(k => revBuckets.get(k));
    const cntVals = keys.map(k => countBuckets.get(k));
    if (!revVals.some(v => v > 0) && !cntVals.some(v => v > 0)) {
      host.innerHTML = `<p class="empty-state">Không có dữ liệu trong khoảng này</p>`;
      return;
    }

    const W = 720, H = 280;
    const padL = 60, padR = 50, padT = 20, padB = 40;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const maxRev = Math.max(1, ...revVals);
    const maxCnt = Math.max(1, ...cntVals);

    const barW = innerW / keys.length * 0.6;
    const stepX = innerW / (keys.length - 1 || 1);
    const xOf = i => padL + (keys.length === 1 ? innerW / 2 : i * stepX);
    const yRev = v => padT + innerH - (v / maxRev) * innerH;
    const yCnt = v => padT + innerH - (v / maxCnt) * innerH;

    // Grid lines
    const gridLines = [];
    for (let i = 0; i <= 4; i++) {
      const y = padT + (innerH / 4) * i;
      const val = maxRev * (1 - i / 4);
      gridLines.push(`<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" class="chart-grid-line"/>`);
      gridLines.push(`<text x="${padL - 8}" y="${y + 4}" text-anchor="end" class="chart-axis-label">${formatCompact(val)}</text>`);
      // right axis (count)
      const valC = maxCnt * (1 - i / 4);
      gridLines.push(`<text x="${W - padR + 8}" y="${y + 4}" text-anchor="start" class="chart-axis-label">${formatCompact(valC)}</text>`);
    }

    // Bars (revenue)
    const bars = keys.map((k, i) => {
      const v = revVals[i];
      const x = xOf(i) - barW / 2;
      const y = yRev(v);
      const h = innerH - (y - padT);
      return `<rect class="chart-bar" x="${x}" y="${y}" width="${barW}" height="${Math.max(0, h)}" fill="${CHART_COLORS.primary}" rx="3">
                <title>${k}\nDoanh thu: ${formatCurrency(v)}\nĐơn: ${cntVals[i]}</title>
              </rect>`;
    }).join("");

    // Line (count)
    const linePath = keys.map((k, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yCnt(cntVals[i])}`).join(" ");
    const dots = keys.map((k, i) => `<circle cx="${xOf(i)}" cy="${yCnt(cntVals[i])}" r="3" fill="${CHART_COLORS.accent}"/>`).join("");

    // X labels
    const labelStep = Math.max(1, Math.ceil(keys.length / 10));
    const xLabels = keys.map((k, i) => {
      if (i % labelStep !== 0 && i !== keys.length - 1) return "";
      const [, m, d] = k.split("-");
      return `<text x="${xOf(i)}" y="${padT + innerH + 18}" text-anchor="middle" class="chart-axis-label">${d}/${m}</text>`;
    }).join("");

    host.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        ${gridLines.join("")}
        ${bars}
        <path d="${linePath}" fill="none" stroke="${CHART_COLORS.accent}" stroke-width="2"/>
        ${dots}
        ${xLabels}
      </svg>`;
  }

  /* === Chart: Donut trạng thái đơn === */
  function renderChartOrderStatus(orders) {
    const host = document.getElementById("chartOrderStatus");
    if (!host) return;
    const counts = { pending: 0, shipping: 0, completed: 0, cancelled: 0 };
    for (const o of orders) {
      const s = String(o.status || "").toLowerCase();
      if (counts[s] != null) counts[s]++;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (!total) {
      host.innerHTML = `<p class="empty-state">Không có đơn nào trong khoảng này</p>`;
      return;
    }
    const entries = Object.entries(counts).filter(([, v]) => v > 0);
    const W = 280, H = 240, cx = W / 2, cy = H / 2 - 10, R = 88, r = 56;
    let angle = -Math.PI / 2;
    const arcs = entries.map(([k, v]) => {
      const slice = (v / total) * Math.PI * 2;
      const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle);
      const x2 = cx + R * Math.cos(angle + slice), y2 = cy + R * Math.sin(angle + slice);
      const xi1 = cx + r * Math.cos(angle + slice), yi1 = cy + r * Math.sin(angle + slice);
      const xi2 = cx + r * Math.cos(angle), yi2 = cy + r * Math.sin(angle);
      const large = slice > Math.PI ? 1 : 0;
      const path = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${r} ${r} 0 ${large} 0 ${xi2} ${yi2} Z`;
      angle += slice;
      return `<path d="${path}" fill="${STATUS_COLORS[k]}" class="chart-bar">
                <title>${STATUS_LABEL[k]}: ${v} đơn (${((v / total) * 100).toFixed(1)}%)</title>
              </path>`;
    }).join("");

    const legend = entries.map(([k, v]) => `
      <div class="donut-legend-item">
        <span class="donut-legend-color" style="background:${STATUS_COLORS[k]}"></span>
        <span class="donut-legend-label">${STATUS_LABEL[k]}</span>
        <span class="donut-legend-value">${v} (${((v / total) * 100).toFixed(0)}%)</span>
      </div>`).join("");

    host.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="max-width:280px;margin:0 auto;display:block">
        ${arcs}
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="22" font-weight="700" fill="${CHART_COLORS.text}">${total}</text>
        <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="11" fill="${CHART_COLORS.textSecondary}">Tổng đơn</text>
      </svg>
      <div class="donut-legend">${legend}</div>`;
  }

  /* === Chart: Doanh thu theo danh mục === */
  function renderChartByCategory(completedOrders) {
    const host = document.getElementById("chartByCategory");
    if (!host) return;
    const map = new Map();
    for (const o of completedOrders) {
      for (const it of (o.items || [])) {
        const p = productsCache.find(x => Number(x.id) === Number(it.productId));
        const cat = p?.category || "khac";
        map.set(cat, (map.get(cat) || 0) + (Number(it.lineTotal) || 0));
      }
    }
    const arr = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    if (!arr.length) {
      host.innerHTML = `<p class="empty-state">Không có dữ liệu</p>`;
      return;
    }
    const max = Math.max(...arr.map(x => x[1])) || 1;
    host.innerHTML = arr.map(([cat, v]) => `
      <div class="bar-row">
        <div class="bar-row-label">${escapeHtml(mapCategory(cat))}</div>
        <div class="bar-row-track">
          <div class="bar-row-fill" style="width:${(v / max * 100).toFixed(1)}%"></div>
        </div>
        <div class="bar-row-value">${formatCurrency(v)}</div>
      </div>`).join("");
  }

  /* === Chart: Top sản phẩm bán chạy === */
  function renderChartTopProducts(completedOrders) {
    const host = document.getElementById("chartTopProducts");
    if (!host) return;
    const map = new Map();
    for (const o of completedOrders) {
      for (const it of (o.items || [])) {
        const key = it.productName || ("#" + it.productId);
        const rec = map.get(key) || { qty: 0, revenue: 0 };
        rec.qty += Number(it.qty) || 0;
        rec.revenue += Number(it.lineTotal) || 0;
        map.set(key, rec);
      }
    }
    const arr = Array.from(map.entries()).sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
    if (!arr.length) {
      host.innerHTML = `<p class="empty-state">Không có dữ liệu</p>`;
      return;
    }
    const max = arr[0][1].qty || 1;
    host.innerHTML = arr.map(([name, rec]) => `
      <div class="bar-row">
        <div class="bar-row-label" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
        <div class="bar-row-track">
          <div class="bar-row-fill" style="width:${(rec.qty / max * 100).toFixed(1)}%"></div>
        </div>
        <div class="bar-row-value">${rec.qty} sp · ${formatCompact(rec.revenue)}đ</div>
      </div>`).join("");
  }

  /* === Chart: Top khách hàng === */
  function renderChartTopCustomers(completedOrders) {
    const host = document.getElementById("chartTopCustomers");
    if (!host) return;
    const map = new Map();
    for (const o of completedOrders) {
      const key = customerKey(o);
      if (!key) continue;
      const rec = map.get(key) || { name: o.customerName || "Khách", spent: 0, count: 0 };
      rec.spent += Number(o.total) || 0;
      rec.count += 1;
      if (o.customerName) rec.name = o.customerName;
      map.set(key, rec);
    }
    const arr = Array.from(map.values()).sort((a, b) => b.spent - a.spent).slice(0, 10);
    if (!arr.length) {
      host.innerHTML = `<p class="empty-state">Không có dữ liệu</p>`;
      return;
    }
    const max = arr[0].spent || 1;
    host.innerHTML = arr.map(rec => `
      <div class="bar-row">
        <div class="bar-row-label" title="${escapeHtml(rec.name)}">${escapeHtml(rec.name)}</div>
        <div class="bar-row-track">
          <div class="bar-row-fill" style="width:${(rec.spent / max * 100).toFixed(1)}%"></div>
        </div>
        <div class="bar-row-value">${formatCurrency(rec.spent)} · ${rec.count} đơn</div>
      </div>`).join("");
  }

  /* === Chart: Phân tích theo giờ === */
  function renderChartByHour(orders) {
    const host = document.getElementById("chartByHour");
    if (!host) return;
    const buckets = new Array(24).fill(0);
    for (const o of orders) {
      if (!o.createdAt) continue;
      const h = new Date(o.createdAt).getHours();
      buckets[h]++;
    }
    if (!buckets.some(v => v > 0)) {
      host.innerHTML = `<p class="empty-state">Không có dữ liệu</p>`;
      return;
    }
    const max = Math.max(...buckets) || 1;
    const W = 720, H = 200;
    const padL = 36, padR = 16, padT = 20, padB = 32;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const barW = innerW / 24 * 0.7;
    const xOf = h => padL + (innerW / 24) * h + (innerW / 24 - barW) / 2;

    // Grid
    const grid = [0, 0.25, 0.5, 0.75, 1].map(t => {
      const y = padT + innerH * t;
      const v = Math.round(max * (1 - t));
      return `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" class="chart-grid-line"/>
              <text x="${padL - 6}" y="${y + 4}" text-anchor="end" class="chart-axis-label">${v}</text>`;
    }).join("");

    const bars = buckets.map((v, h) => {
      const x = xOf(h);
      const bh = (v / max) * innerH;
      const y = padT + innerH - bh;
      return `<rect class="chart-bar" x="${x}" y="${y}" width="${barW}" height="${bh}" fill="${CHART_COLORS.accent}" rx="2">
                <title>${String(h).padStart(2, "0")}h: ${v} đơn</title>
              </rect>`;
    }).join("");

    const xLabels = buckets.map((_, h) => {
      if (h % 3 !== 0 && h !== 23) return "";
      const x = xOf(h) + barW / 2;
      return `<text x="${x}" y="${padT + innerH + 16}" text-anchor="middle" class="chart-axis-label">${String(h).padStart(2, "0")}h</text>`;
    }).join("");

    host.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        ${grid}
        ${bars}
        ${xLabels}
      </svg>`;
  }

  /* =========== 9) DASHBOARD ========================================== */

  const dashRevenueEl = document.getElementById("dashRevenue");
  const dashRevenueTrend = document.getElementById("dashRevenueTrend");
  const dashOrdersToday = document.getElementById("dashOrdersToday");
  const dashOrdersTrend = document.getElementById("dashOrdersTrend");
  const dashPending = document.getElementById("dashPending");
  const dashLowStock = document.getElementById("dashLowStock");
  const dashboardOrdersTbody = document.getElementById("dashboardOrdersTbody");
  const dashboardProductList = document.getElementById("dashboardProductList");
  const dashboardViewOrders = document.getElementById("dashboardViewOrders");
  const dashboardViewProducts = document.getElementById("dashboardViewProducts");
  const dashboardRefreshBtn = document.getElementById("dashboardRefreshBtn");

  function isOnDate(iso, base) {
    if (!iso) return false;
    const d = new Date(iso);
    return d.getFullYear() === base.getFullYear()
      && d.getMonth() === base.getMonth()
      && d.getDate() === base.getDate();
  }

  function refreshDashboard() {
    const products = productsCache;
    const orders = ordersCache;
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);

    // Revenue today (đơn completed tạo trong hôm nay)
    const revToday = orders.filter(o => isOnDate(o.createdAt, today) && isRevenueOrder(o))
      .reduce((s, o) => s + (Number(o.total) || 0), 0);
    const revYesterday = orders.filter(o => isOnDate(o.createdAt, yesterday) && isRevenueOrder(o))
      .reduce((s, o) => s + (Number(o.total) || 0), 0);

    const ordersToday = orders.filter(o => isOnDate(o.createdAt, today));
    const ordersYesterday = orders.filter(o => isOnDate(o.createdAt, yesterday));

    const pending = orders.filter(isPendingOrder).length;
    const lowStockCount = products.filter(p => {
      const s = sumStock(p.stockBySize);
      return s > 0 && s <= 5;
    }).length;

    if (dashRevenueEl) dashRevenueEl.textContent = formatCurrency(revToday);
    setTrendText(dashRevenueTrend, revToday, revYesterday);
    if (dashOrdersToday) dashOrdersToday.textContent = formatNumber(ordersToday.length);
    setTrendText(dashOrdersTrend, ordersToday.length, ordersYesterday.length);
    if (dashPending) dashPending.textContent = formatNumber(pending);
    if (dashLowStock) dashLowStock.textContent = formatNumber(lowStockCount);

    // Recent orders
    if (dashboardOrdersTbody) {
      const recent = [...orders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);
      if (!recent.length) {
        dashboardOrdersTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-secondary)">Chưa có đơn hàng nào.</td></tr>`;
      } else {
        dashboardOrdersTbody.innerHTML = recent.map(o => {
          const sk = String(o.status || "").toLowerCase();
          return `
            <tr>
              <td><strong>${escapeHtml(o.orderCode || ("#" + o.id))}</strong></td>
              <td>${escapeHtml(o.customerName || "—")}</td>
              <td style="max-width:200px">${escapeHtml(o.itemsSummary || "—")}</td>
              <td>${formatCurrency(o.total)}</td>
              <td><span class="badge ${STATUS_BADGE[sk] || "muted"}">${escapeHtml(o.statusLabel || STATUS_LABEL[sk] || o.status)}</span></td>
              <td><button class="btn-icon" data-dash-order="${o.id}" title="Xem"><i class="fas fa-eye"></i></button></td>
            </tr>`;
        }).join("");
        dashboardOrdersTbody.querySelectorAll("[data-dash-order]").forEach(btn => {
          btn.addEventListener("click", () => openOrderDetail(Number(btn.getAttribute("data-dash-order"))));
        });
      }
    }

    // Low stock products
    if (dashboardProductList) {
      const low = products
        .map(p => ({ p, stock: sumStock(p.stockBySize) }))
        .filter(x => x.stock <= 5)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 6);
      if (!low.length) {
        dashboardProductList.innerHTML = `<p style="padding:24px;color:var(--text-secondary);text-align:center">Tất cả sản phẩm đều còn hàng tốt 🎉</p>`;
      } else {
        dashboardProductList.innerHTML = low.map(({ p, stock }) => `
          <div class="product-item">
            <img src="${productImage(p)}" alt="" onerror="${productImgOnError(p.category)}">
            <div class="product-info">
              <h4>${escapeHtml(p.name)}</h4>
              <p>SKU: ${escapeHtml(p.sku || "")} • ${escapeHtml(mapCategory(p.category))}</p>
            </div>
            <div class="product-price">
              <span class="badge ${stock <= 0 ? "danger" : "warning"}">${stock <= 0 ? "Hết hàng" : "Còn " + stock}</span>
            </div>
          </div>`).join("");
      }
    }

    // Dashboard charts (7d + status 30d)
    renderDashRevenueChart();
    renderDashStatusChart();
  }

  function renderDashRevenueChart() {
    const host = document.getElementById("dashRevenueChart");
    if (!host) return;
    const to = new Date(); to.setHours(23, 59, 59, 999);
    const from = new Date(); from.setDate(from.getDate() - 6); from.setHours(0, 0, 0, 0);
    const orders = ordersInRange(from, to).filter(isRevenueOrder);
    const buckets = buildDateBuckets(from, to);
    for (const o of orders) {
      const k = localDateKey(new Date(o.createdAt));
      if (buckets.has(k)) buckets.set(k, buckets.get(k) + (Number(o.total) || 0));
    }
    const keys = Array.from(buckets.keys());
    const vals = keys.map(k => buckets.get(k));
    const max = Math.max(...vals, 1);

    if (!vals.some(v => v > 0)) {
      host.innerHTML = `<p class="empty-state">Chưa có doanh thu trong 7 ngày qua</p>`;
      return;
    }

    const W = 480, H = 220;
    const padL = 56, padR = 16, padT = 16, padB = 32;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const stepX = innerW / (keys.length - 1 || 1);
    const xOf = i => padL + i * stepX;
    const yOf = v => padT + innerH - (v / max) * innerH;

    const grid = [0, 0.25, 0.5, 0.75, 1].map(t => {
      const y = padT + innerH * t;
      const v = max * (1 - t);
      return `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" class="chart-grid-line"/>
              <text x="${padL - 6}" y="${y + 4}" text-anchor="end" class="chart-axis-label">${formatCompact(v)}</text>`;
    }).join("");

    const areaPath = `M ${xOf(0)} ${padT + innerH} ` +
      keys.map((k, i) => `L ${xOf(i)} ${yOf(vals[i])}`).join(" ") +
      ` L ${xOf(keys.length - 1)} ${padT + innerH} Z`;

    const linePath = keys.map((k, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yOf(vals[i])}`).join(" ");

    const dots = keys.map((k, i) => `<circle cx="${xOf(i)}" cy="${yOf(vals[i])}" r="3" fill="${CHART_COLORS.primary}">
                                       <title>${k}: ${formatCurrency(vals[i])}</title>
                                     </circle>`).join("");

    const xLabels = keys.map((k, i) => {
      const [, m, d] = k.split("-");
      return `<text x="${xOf(i)}" y="${padT + innerH + 18}" text-anchor="middle" class="chart-axis-label">${d}/${m}</text>`;
    }).join("");

    host.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        ${grid}
        <path d="${areaPath}" fill="${CHART_COLORS.primary}" opacity="0.12"/>
        <path d="${linePath}" fill="none" stroke="${CHART_COLORS.primary}" stroke-width="2"/>
        ${dots}
        ${xLabels}
      </svg>`;
  }

  function renderDashStatusChart() {
    const host = document.getElementById("dashStatusChart");
    if (!host) return;
    const to = new Date(); to.setHours(23, 59, 59, 999);
    const from = new Date(); from.setDate(from.getDate() - 29); from.setHours(0, 0, 0, 0);
    const orders = ordersInRange(from, to);
    const counts = { pending: 0, shipping: 0, completed: 0, cancelled: 0 };
    for (const o of orders) {
      const s = String(o.status || "").toLowerCase();
      if (counts[s] != null) counts[s]++;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (!total) {
      host.innerHTML = `<p class="empty-state">Chưa có đơn hàng nào</p>`;
      return;
    }
    const entries = Object.entries(counts).filter(([, v]) => v > 0);
    const W = 280, H = 240, cx = W / 2, cy = H / 2 - 10, R = 88, r = 56;
    let angle = -Math.PI / 2;
    const arcs = entries.map(([k, v]) => {
      const slice = (v / total) * Math.PI * 2;
      const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle);
      const x2 = cx + R * Math.cos(angle + slice), y2 = cy + R * Math.sin(angle + slice);
      const xi1 = cx + r * Math.cos(angle + slice), yi1 = cy + r * Math.sin(angle + slice);
      const xi2 = cx + r * Math.cos(angle), yi2 = cy + r * Math.sin(angle);
      const large = slice > Math.PI ? 1 : 0;
      const path = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${r} ${r} 0 ${large} 0 ${xi2} ${yi2} Z`;
      angle += slice;
      return `<path d="${path}" fill="${STATUS_COLORS[k]}" class="chart-bar">
                <title>${STATUS_LABEL[k]}: ${v}</title>
              </path>`;
    }).join("");
    const legend = entries.map(([k, v]) => `
      <div class="donut-legend-item">
        <span class="donut-legend-color" style="background:${STATUS_COLORS[k]}"></span>
        <span class="donut-legend-label">${STATUS_LABEL[k]}</span>
        <span class="donut-legend-value">${v}</span>
      </div>`).join("");
    host.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="max-width:260px;margin:0 auto;display:block">
        ${arcs}
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="22" font-weight="700" fill="${CHART_COLORS.text}">${total}</text>
        <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="11" fill="${CHART_COLORS.textSecondary}">Tổng (30 ngày)</text>
      </svg>
      <div class="donut-legend">${legend}</div>`;
  }

  if (dashboardViewOrders) {
    dashboardViewOrders.addEventListener("click", e => { e.preventDefault(); navigateToPage("orders"); });
  }
  if (dashboardViewProducts) {
    dashboardViewProducts.addEventListener("click", e => { e.preventDefault(); navigateToPage("products"); });
  }
  if (dashboardRefreshBtn) {
    dashboardRefreshBtn.addEventListener("click", async () => {
      dashboardRefreshBtn.disabled = true;
      try { await refreshAll(); toast("Đã cập nhật dữ liệu"); }
      finally { dashboardRefreshBtn.disabled = false; }
    });
  }

  /* =========== 10) NOTIFICATIONS ===================================== */

  const notificationBell = document.getElementById("notificationBell");
  const notificationDropdown = document.getElementById("notificationDropdown");
  const notificationBadge = document.getElementById("notificationBadge");
  const notificationList = document.getElementById("notificationList");
  const notificationSub = document.getElementById("notificationSub");
  const notificationViewAll = document.getElementById("notificationViewAll");

  function closeNotificationDropdown() {
    if (!notificationDropdown || !notificationBell) return;
    notificationDropdown.hidden = true;
    notificationBell.setAttribute("aria-expanded", "false");
  }
  function openNotificationDropdown() {
    if (!notificationDropdown || !notificationBell) return;
    notificationDropdown.hidden = false;
    notificationBell.setAttribute("aria-expanded", "true");
  }

  function renderNotificationPanel(pending) {
    if (!notificationList) return;
    if (!pending.length) {
      notificationList.innerHTML = '<p class="notification-empty">Không có đơn mới cần xử lý</p>';
      return;
    }
    const sorted = [...pending].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    notificationList.innerHTML = sorted.slice(0, 10).map(o => `
      <button type="button" class="notification-item" data-notify-order="${o.id}">
        <div class="notification-item-title">${escapeHtml(o.orderCode || "Đơn #" + o.id)}</div>
        <div class="notification-item-meta">
          ${escapeHtml(o.customerName || "Khách")} • ${formatCurrency(o.total)}<br/>
          ${escapeHtml(o.itemsSummary || "—")}
        </div>
      </button>`).join("");
    notificationList.querySelectorAll("[data-notify-order]").forEach(btn => {
      btn.addEventListener("click", () => {
        closeNotificationDropdown();
        openOrderDetail(Number(btn.getAttribute("data-notify-order")));
      });
    });
  }

  async function refreshNotifications() {
    if (!notificationBell) return;
    if (!window.Api?.AuthApi?.isLoggedIn()) {
      if (notificationBadge) notificationBadge.hidden = true;
      if (notificationList) notificationList.innerHTML = '<p class="notification-empty">Đăng nhập admin để xem thông báo</p>';
      return;
    }
    try {
      const all = ordersCache.length ? ordersCache : await window.Api.OrdersApi.list();
      const pending = (Array.isArray(all) ? all : []).filter(isPendingOrder);
      if (notificationBadge) {
        notificationBadge.textContent = String(pending.length);
        notificationBadge.hidden = pending.length === 0;
      }
      if (notificationSub) {
        notificationSub.textContent = pending.length ? `${pending.length} đơn cần xử lý` : "Không có đơn mới";
      }
      renderNotificationPanel(pending);
    } catch (e) {
      console.error(e);
      if (notificationList) notificationList.innerHTML = '<p class="notification-empty">Không tải được thông báo</p>';
    }
  }

  function startNotificationPolling() {
    if (notifyPollTimer) clearInterval(notifyPollTimer);
    notifyPollTimer = setInterval(() => {
      if (window.Api?.AuthApi?.isLoggedIn()) refreshOrders();
    }, 45000);
  }

  if (notificationBell) {
    notificationBell.addEventListener("click", async e => {
      e.stopPropagation();
      if (!requireAdmin()) return;
      const wasOpen = notificationDropdown && !notificationDropdown.hidden;
      await refreshNotifications();
      if (wasOpen) closeNotificationDropdown(); else openNotificationDropdown();
    });
  }
  if (notificationViewAll) {
    notificationViewAll.addEventListener("click", () => {
      closeNotificationDropdown();
      navigateToPage("orders");
    });
  }
  document.addEventListener("click", e => {
    const wrap = document.querySelector(".notifications-wrap");
    if (wrap && !wrap.contains(e.target)) closeNotificationDropdown();
  });

  /* =========== 11) INIT ============================================== */

  async function refreshAll() {
    await refreshProducts();
    await refreshOrders();
    // page-specific render
    const active = document.querySelector(".page.active");
    if (!active) return;
    const id = active.id;
    if (id === "dashboard") refreshDashboard();
    else if (id === "products") renderProductsTable();
    else if (id === "customers") renderCustomers();
    else if (id === "reports") renderReports();
  }

  (async () => {
    await refreshMe();
    syncAdminUI();
    navigateToPage(getPageFromUrl(), { save: false, skipAuthCheck: true });
    requireAdmin();
    if (window.Api?.AuthApi?.isLoggedIn()) {
      await refreshAll();
      startNotificationPolling();
    }
  })();
});
