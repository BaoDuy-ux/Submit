/* ================================================================
 * IS207 Fashion — Customer site script
 * Sections:
 *   1) Constants & state
 *   2) Helpers (format, image fallback, modal, toast)
 *   3) Auth & profile (login/register/forgot/profile)
 *   4) Products (load, derive flash sale & featured, render)
 *   5) Filter & sort
 *   6) Wishlist
 *   7) Cart drawer
 *   8) Product detail modal (tabs + warranty)
 *   9) Promo carousel + flash sale countdown
 *  10) Checkout flow (coupons, payments, QR)
 *  11) Info / policies modal
 *  12) Chat widget
 *  13) Init
 * ================================================================ */

/* -------- 1) Constants & state -------- */
const CART_KEY = "customer_cart_v2";
const LEGACY_CART_KEY = "customer_cart";
const WISHLIST_KEY = "customer_wishlist_v1";
const FLASH_DEADLINE_KEY = "customer_flash_deadline_v1";
const FLASH_DURATION_MS = 12 * 60 * 60 * 1000; // 12h cycle

const COMPANY_BANK = {
  bankCode: "MB",
  bankName: "MB Bank (Quân đội)",
  accountNumber: "0312345678",
  accountName: "CONG TY TNHH IS207 FASHION",
};
const COMPANY_MOMO = { phone: "0901234567", name: "IS207 FASHION" };
const COMPANY_ZALOPAY = { phone: "0901234567", name: "IS207 FASHION" };

const COUPONS = {
  IS207: { type: "percent", value: 10, label: "Giảm 10% giá trị đơn" },
  WELCOME50: { type: "amount", value: 50000, label: "Giảm 50.000đ cho khách mới" },
  FREESHIP: { type: "freeship", value: 0, label: "Miễn phí vận chuyển" },
  IS207VIP: { type: "percent", value: 20, label: "VIP — Giảm 20%" },
};

let PRODUCTS = [];
let FLASH_SALE_IDS = new Set();
let FEATURED_IDS = new Set();
let NEW_COLLECTION_IDS = new Set();
let currentUser = null;

let currentCategory = "";
let currentSearch = "";
let currentSort = "newest";
const filterState = {
  gender: "",
  sizes: new Set(),
  colors: new Set(),
  priceMin: null,
  priceMax: null,
};

migrateLegacyCart();
let cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
let wishlist = JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]");
let appliedCoupon = null;
let selectedProductId = null;

/* -------- DOM references -------- */
const productGrid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const heroShopBtn = document.getElementById("heroShopBtn");
const homePromo = document.getElementById("homePromo");
const mainContent = document.getElementById("main-content");
const cartToggle = document.getElementById("cartToggle");
const cartClose = document.getElementById("cartClose");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const cartItemsEl = document.getElementById("cartItems");
const cartCountEl = document.getElementById("cartCount");
const cartSubtotalEl = document.getElementById("cartSubtotal");
const cartTotalEl = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const toast = document.getElementById("toast");
const userToggle = document.getElementById("userToggle");
const wishlistToggle = document.getElementById("wishlistToggle");
const wishlistCountEl = document.getElementById("wishlistCount");
const wishlistDrawer = document.getElementById("wishlistDrawer");
const wishlistOverlay = document.getElementById("wishlistOverlay");
const wishlistClose = document.getElementById("wishlistClose");
const wishlistItemsEl = document.getElementById("wishlistItems");
const wishlistViewAllBtn = document.getElementById("wishlistViewAllBtn");
const infoToggle = document.getElementById("infoToggle");

const flashSaleGrid = document.getElementById("flashSaleGrid");
const featuredGrid = document.getElementById("featuredGrid");
const newCollectionGrid = document.getElementById("newCollectionGrid");
const cdHours = document.getElementById("cdHours");
const cdMinutes = document.getElementById("cdMinutes");
const cdSeconds = document.getElementById("cdSeconds");

const promoTrack = document.getElementById("promoTrack");
const promoDotsEl = document.getElementById("promoDots");
const promoPrev = document.getElementById("promoPrev");
const promoNext = document.getElementById("promoNext");

const filterSidebar = document.getElementById("filterSidebar");
const toggleFilterBtn = document.getElementById("toggleFilterBtn");
const filterGender = document.getElementById("filterGender");
const filterSize = document.getElementById("filterSize");
const filterColor = document.getElementById("filterColor");
const filterPriceMin = document.getElementById("filterPriceMin");
const filterPriceMax = document.getElementById("filterPriceMax");
const pricePresetButtons = document.querySelectorAll(".filter-price-presets [data-price]");
const resetFilterBtn = document.getElementById("resetFilterBtn");
const activeFiltersEl = document.getElementById("activeFilters");

// Auth/Profile modal
const authModal = document.getElementById("authModal");
const authModalClose = document.getElementById("authModalClose");
const loginForm = document.getElementById("loginForm");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const registerForm = document.getElementById("registerForm");
const openRegisterBtn = document.getElementById("openRegisterBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");
const rgFullName = document.getElementById("rgFullName");
const rgPhone = document.getElementById("rgPhone");
const rgUsername = document.getElementById("rgUsername");
const rgEmail = document.getElementById("rgEmail");
const rgAddress = document.getElementById("rgAddress");
const rgPassword = document.getElementById("rgPassword");
const rgPhoneHint = document.getElementById("rgPhoneHint");
const rgUsernameHint = document.getElementById("rgUsernameHint");
const rgEmailHint = document.getElementById("rgEmailHint");

const rgAvailability = {
  phone: { available: null, message: "" },
  username: { available: null, message: "" },
  email: { available: null, message: "" },
};
const authModalTitle = document.getElementById("authModalTitle");
const openForgotBtn = document.getElementById("openForgotBtn");
const openForgotLink = document.getElementById("openForgotLink");
const forgotForm = document.getElementById("forgotForm");
const forgotStep1 = document.getElementById("forgotStep1");
const forgotStep2 = document.getElementById("forgotStep2");
const forgotMessage = document.getElementById("forgotMessage");
const fpIdentifier = document.getElementById("fpIdentifier");
const fpTokenBox = document.getElementById("fpTokenBox");
const fpTokenDisplay = document.getElementById("fpTokenDisplay");
const fpCopyTokenBtn = document.getElementById("fpCopyTokenBtn");
const fpToken = document.getElementById("fpToken");
const fpNewPassword = document.getElementById("fpNewPassword");
const fpResetBtn = document.getElementById("fpResetBtn");
const fpBackStepBtn = document.getElementById("fpBackStepBtn");
const backToLoginFromForgotBtn = document.getElementById("backToLoginFromForgotBtn");
const fpStatus = document.getElementById("fpStatus");
const fpSendBtn = document.getElementById("fpSendBtn");
const fpSendBtnText = document.getElementById("fpSendBtnText");
const profileBox = document.getElementById("profileBox");
const profileName = document.getElementById("profileName");
const profilePhone = document.getElementById("profilePhone");
const profileForm = document.getElementById("profileForm");
const pfFullName = document.getElementById("pfFullName");
const pfPhone = document.getElementById("pfPhone");
const pfEmail = document.getElementById("pfEmail");
const pfAddress = document.getElementById("pfAddress");
const logoutBtn = document.getElementById("logoutBtn");
const myOrdersList = document.getElementById("myOrdersList");

// Product detail modal
const productModal = document.getElementById("productModal");
const productModalClose = document.getElementById("productModalClose");
const pdImage = document.getElementById("pdImage");
const pdName = document.getElementById("pdName");
const pdMeta = document.getElementById("pdMeta");
const pdPrice = document.getElementById("pdPrice");
const pdPriceOld = document.getElementById("pdPriceOld");
const pdDiscountBadge = document.getElementById("pdDiscountBadge");
const pdColor = document.getElementById("pdColor");
const pdSize = document.getElementById("pdSize");
const pdStockNote = document.getElementById("pdStockNote");
const pdAddToCartBtn = document.getElementById("pdAddToCartBtn");
const pdWishlistBtn = document.getElementById("pdWishlistBtn");
const pdWishlistText = document.getElementById("pdWishlistText");
const pdDescription = document.getElementById("pdDescription");
const pdSpecTableBody = document.getElementById("pdSpecTableBody");

// Checkout modal
const checkoutModal = document.getElementById("checkoutModal");
const checkoutClose = document.getElementById("checkoutClose");
const ckName = document.getElementById("ckName");
const ckPhone = document.getElementById("ckPhone");
const ckAddress = document.getElementById("ckAddress");
const ckNote = document.getElementById("ckNote");
const checkoutItemsList = document.getElementById("checkoutItemsList");
const couponInput = document.getElementById("couponInput");
const applyCouponBtn = document.getElementById("applyCouponBtn");
const couponHint = document.getElementById("couponHint");
const paymentDetail = document.getElementById("paymentDetail");
const ckSubtotal = document.getElementById("ckSubtotal");
const ckShipping = document.getElementById("ckShipping");
const ckDiscount = document.getElementById("ckDiscount");
const ckDiscountRow = document.getElementById("ckDiscountRow");
const ckTotal = document.getElementById("ckTotal");
const ckPlaceOrderBtn = document.getElementById("ckPlaceOrderBtn");
const ckPlaceOrderText = document.getElementById("ckPlaceOrderText");

// Info modal
const infoModal = document.getElementById("infoModal");
const infoClose = document.getElementById("infoClose");
const infoNav = document.getElementById("infoNav");
const infoContent = document.getElementById("infoContent");

// Chat widget
const chatLauncher = document.getElementById("chatLauncher");
const chatPanel = document.getElementById("chatPanel");
const chatClose = document.getElementById("chatClose");
const chatBody = document.getElementById("chatBody");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatQuick = document.getElementById("chatQuick");

/* -------- 2) Helpers -------- */
function formatCurrency(vnd) {
  const n = Number(vnd) || 0;
  return n.toLocaleString("vi-VN") + " đ";
}

function mapCategory(code) {
  switch (code) {
    case "ao": return "Áo";
    case "quan": return "Quần";
    case "vay": return "Váy";
    case "ao-khoac": return "Áo khoác";
    default: return "";
  }
}

function migrateLegacyCart() {
  const legacy = localStorage.getItem(LEGACY_CART_KEY);
  if (!legacy) return;
  try {
    const items = JSON.parse(legacy);
    if (!Array.isArray(items) || !items.length) return;
    const migrated = items.map(i => ({
      key: `${i.id}|default|default`,
      productId: i.id,
      name: i.name,
      price: i.price,
      image: i.image,
      qty: i.qty,
      size: "default",
      color: "default"
    }));
    localStorage.setItem(CART_KEY, JSON.stringify(migrated));
    localStorage.removeItem(LEGACY_CART_KEY);
  } catch {
    /* ignore */
  }
}

const FALLBACK_PRODUCT_IMAGES = {
  ao: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop",
  quan: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=300&fit=crop",
  vay: "https://images.unsplash.com/photo-1595777453558-2b9c6b0c5c0e?w=400&h=300&fit=crop",
  "ao-khoac": "https://images.unsplash.com/photo-1551028711-00167b16eac5?w=400&h=300&fit=crop"
};

function isBadImageUrl(url) {
  if (!url || !String(url).trim()) return true;
  const lower = String(url).toLowerCase();
  return (
    lower.includes("unsplash.com/photos") ||
    lower.includes("via.placeholder") ||
    lower.includes("placeholder.com") ||
    lower.includes("picsum.photos")
  );
}

function productImage(p) {
  const url = p && p.image;
  if (url && !isBadImageUrl(url)) return url;
  const cat = p && p.category;
  return FALLBACK_PRODUCT_IMAGES[cat] || FALLBACK_PRODUCT_IMAGES.ao;
}

function cartItemImage(item) {
  const p = PRODUCTS.find(x => Number(x.id) === Number(item.productId));
  if (p) return productImage(p);
  if (item.image && !isBadImageUrl(item.image)) return item.image;
  return FALLBACK_PRODUCT_IMAGES.ao;
}

function cartItemCategory(item) {
  const p = PRODUCTS.find(x => Number(x.id) === Number(item.productId));
  return (p && p.category) || item.category || "ao";
}

function fixCartImages() {
  let changed = false;
  for (const item of cart) {
    const p = PRODUCTS.find(x => Number(x.id) === Number(item.productId));
    const next = p ? productImage(p) : cartItemImage(item);
    if (item.image !== next) {
      item.image = next;
      if (p) item.category = p.category;
      changed = true;
    }
  }
  if (changed) saveCart();
}

function productImgOnError(category) {
  const url = FALLBACK_PRODUCT_IMAGES[category] || FALLBACK_PRODUCT_IMAGES.ao;
  return `this.onerror=null;this.src='${url}'`;
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}

function openModal(el) {
  if (!el) return;
  el.classList.add("show");
  el.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal(el) {
  if (!el) return;
  el.classList.remove("show");
  el.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".modal.show")) {
    document.body.style.overflow = "";
  }
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inferGender(p) {
  if (!p) return "unisex";
  if (p.category === "vay") return "nu";
  const text = ` ${(p.name || "").toLowerCase()} ${(p.brand || "").toLowerCase()} `;
  if (text.includes(" nữ ") || text.includes(" nu ") || text.includes("female") || text.includes("women") || text.includes("girl")) return "nu";
  if (text.includes(" nam ") || text.includes("male") || text.includes("men") || text.includes("boy")) return "nam";
  return "unisex";
}

function productDiscount(p) {
  if (!p) return null;
  if (FLASH_SALE_IDS.has(Number(p.id))) {
    return { percent: 30, label: "FLASH -30%" };
  }
  return null;
}

function effectivePrice(p) {
  const d = productDiscount(p);
  if (!d) return Number(p.price) || 0;
  return Math.round((Number(p.price) || 0) * (1 - d.percent / 100));
}

function debounce(fn, delayMs) {
  let timer = null;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delayMs);
  };
}

/* -------- 3) Auth & profile -------- */
async function refreshMe() {
  if (!window.Api || !window.Api.AuthApi) return null;
  if (!window.Api.AuthApi.isLoggedIn()) {
    currentUser = null;
    return null;
  }
  try {
    currentUser = await window.Api.AuthApi.me();
  } catch {
    currentUser = null;
  }
  return currentUser;
}

function ensureLoggedIn() {
  if (window.Api && window.Api.AuthApi && window.Api.AuthApi.isLoggedIn()) return true;
  openAuthModal();
  showToast("Vui lòng đăng nhập để tiếp tục");
  return false;
}

function setAuthModalTitle(title) {
  if (authModalTitle) authModalTitle.textContent = title || "Đăng nhập";
}

function showForgotStep(step) {
  if (forgotStep1) forgotStep1.classList.toggle("hidden", step !== 1);
  if (forgotStep2) forgotStep2.classList.toggle("hidden", step !== 2);
}

function setFpStatus(message, type) {
  if (!fpStatus) return;
  if (!message) {
    fpStatus.textContent = "";
    fpStatus.className = "fp-status hidden";
    return;
  }
  fpStatus.textContent = message;
  fpStatus.className = "fp-status fp-status--" + (type || "info");
}

function setForgotSending(sending) {
  if (fpSendBtn) fpSendBtn.disabled = sending;
  if (fpSendBtnText) fpSendBtnText.textContent = sending ? "Đang gửi..." : "Gửi mã đặt lại";
}

function setFieldCheckHint(el, state, message) {
  if (!el) return;
  if (!message) {
    el.textContent = "";
    el.className = "field-check-hint";
    return;
  }
  el.textContent = message;
  el.className = "field-check-hint field-check-hint--" + (state || "checking");
}

function resetRegisterAvailability() {
  rgAvailability.phone = { available: null, message: "" };
  rgAvailability.username = { available: null, message: "" };
  rgAvailability.email = { available: null, message: "" };
  setFieldCheckHint(rgPhoneHint, "", "");
  setFieldCheckHint(rgUsernameHint, "", "");
  setFieldCheckHint(rgEmailHint, "", "");
}

async function runRegisterFieldCheck(field, value) {
  if (!window.Api || !window.Api.AuthApi) return;
  const hintMap = { phone: rgPhoneHint, username: rgUsernameHint, email: rgEmailHint };
  const hintEl = hintMap[field];
  const trimmed = String(value || "").trim();

  if (field === "email" && !trimmed) {
    rgAvailability.email = { available: true, message: "" };
    setFieldCheckHint(hintEl, "", "");
    return;
  }
  if (!trimmed) {
    rgAvailability[field] = { available: null, message: "" };
    setFieldCheckHint(hintEl, "", "");
    return;
  }

  setFieldCheckHint(hintEl, "checking", "Đang kiểm tra...");
  try {
    const res = await window.Api.AuthApi.checkAvailability(field, trimmed);
    const ok = Boolean(res && res.available);
    const msg = (res && res.message) ? res.message : (ok ? "Có thể sử dụng" : "Không hợp lệ");
    rgAvailability[field] = { available: ok, message: msg };
    setFieldCheckHint(hintEl, ok ? "ok" : "bad", msg);
  } catch {
    rgAvailability[field] = { available: null, message: "" };
    setFieldCheckHint(hintEl, "warn", "Không kiểm tra được — thử lại sau");
  }
}

const debouncedRegisterChecks = {
  phone: debounce((v) => runRegisterFieldCheck("phone", v), 450),
  username: debounce((v) => runRegisterFieldCheck("username", v), 450),
  email: debounce((v) => runRegisterFieldCheck("email", v), 450),
};

function setupRegisterAvailabilityChecks() {
  if (rgPhone) {
    rgPhone.addEventListener("input", () => debouncedRegisterChecks.phone(rgPhone.value));
    rgPhone.addEventListener("blur", () => runRegisterFieldCheck("phone", rgPhone.value));
  }
  if (rgUsername) {
    rgUsername.addEventListener("input", () => debouncedRegisterChecks.username(rgUsername.value));
    rgUsername.addEventListener("blur", () => runRegisterFieldCheck("username", rgUsername.value));
  }
  if (rgEmail) {
    rgEmail.addEventListener("input", () => debouncedRegisterChecks.email(rgEmail.value));
    rgEmail.addEventListener("blur", () => runRegisterFieldCheck("email", rgEmail.value));
  }
}

async function ensureRegisterFieldsAvailable() {
  const checks = [
    { field: "phone", value: (rgPhone && rgPhone.value) || "" },
    { field: "username", value: (rgUsername && rgUsername.value) || "" },
  ];
  const emailVal = (rgEmail && rgEmail.value) || "";
  if (emailVal.trim()) checks.push({ field: "email", value: emailVal });

  for (const c of checks) {
    await runRegisterFieldCheck(c.field, c.value);
    const state = rgAvailability[c.field];
    if (state && state.available === false) {
      return state.message || "Thông tin đã được sử dụng";
    }
  }
  return null;
}

function resetForgotForm() {
  if (fpIdentifier) fpIdentifier.value = "";
  if (fpToken) fpToken.value = "";
  if (fpNewPassword) fpNewPassword.value = "";
  if (fpTokenDisplay) fpTokenDisplay.value = "";
  if (fpTokenBox) fpTokenBox.classList.add("hidden");
  if (forgotMessage) forgotMessage.textContent = "";
  setFpStatus("");
  setForgotSending(false);
  showForgotStep(1);
}

function showLoginForm() {
  resetRegisterAvailability();
  if (loginForm) loginForm.classList.remove("hidden");
  if (registerForm) registerForm.classList.add("hidden");
  if (forgotForm) forgotForm.classList.add("hidden");
  setAuthModalTitle("Đăng nhập");
  resetForgotForm();
}

function showForgotForm() {
  if (loginForm) loginForm.classList.add("hidden");
  if (registerForm) registerForm.classList.add("hidden");
  if (forgotForm) forgotForm.classList.remove("hidden");
  setAuthModalTitle("Quên mật khẩu");
  resetForgotForm();
}

function openAuthModal() {
  syncAuthUI();
  openModal(authModal);
}

async function refreshMyOrders() {
  if (!myOrdersList || !window.Api || !window.Api.OrdersApi) return;
  if (!window.Api.AuthApi.isLoggedIn()) {
    myOrdersList.innerHTML = "Đăng nhập để xem đơn hàng.";
    return;
  }
  try {
    const orders = await window.Api.OrdersApi.list();
    const list = Array.isArray(orders) ? orders : [];
    if (!list.length) {
      myOrdersList.innerHTML = "Chưa có đơn hàng.";
      return;
    }
    myOrdersList.innerHTML = list.slice(0, 8).map(o => `
      <div class="my-order-row">
        <strong>${escapeHtml(o.orderCode || "")}</strong> — ${escapeHtml(o.statusLabel || o.status || "")}<br/>
        <span class="muted">${formatCurrency(Number(o.total) || 0)}</span>
      </div>
    `).join("");
  } catch {
    myOrdersList.innerHTML = "Không tải được đơn hàng.";
  }
}

function applyProfileToUI(u) {
  if (!u) return;
  profileName.textContent = u.fullName || (u.profile && u.profile.fullName) || "Khách hàng";
  profilePhone.textContent = u.phone || (u.profile && u.profile.phone) || "";
  if (pfFullName) pfFullName.value = u.fullName || (u.profile && u.profile.fullName) || "";
  if (pfPhone) pfPhone.value = u.phone || (u.profile && u.profile.phone) || "";
  if (pfEmail) pfEmail.value = u.email || (u.profile && u.profile.email) || "";
  if (pfAddress) pfAddress.value = u.address || (u.profile && u.profile.address) || "";
}

function syncAuthUI() {
  const loggedIn = window.Api && window.Api.AuthApi && window.Api.AuthApi.isLoggedIn();
  if (!loggedIn) {
    currentUser = null;
    loginForm.classList.remove("hidden");
    if (registerForm) registerForm.classList.add("hidden");
    if (forgotForm) forgotForm.classList.add("hidden");
    profileBox.classList.add("hidden");
    if (myOrdersList) myOrdersList.innerHTML = "Đăng nhập để xem đơn hàng.";
    return;
  }
  loginForm.classList.add("hidden");
  if (registerForm) registerForm.classList.add("hidden");
  if (forgotForm) forgotForm.classList.add("hidden");
  profileBox.classList.remove("hidden");
  const u = currentUser;
  if (u) {
    applyProfileToUI(u);
    refreshMyOrders();
  } else {
    profileName.textContent = "Đang tải...";
    profilePhone.textContent = "";
    refreshMe().then(() => {
      if (currentUser) applyProfileToUI(currentUser);
      refreshMyOrders();
    });
  }
}

/* -------- 4) Products + derived sets -------- */
async function loadProducts() {
  if (!window.Api || !window.Api.ProductsApi) return [];
  const data = await window.Api.ProductsApi.list();
  return Array.isArray(data) ? data : (data && data.items) ? data.items : [];
}

function deriveProductSets() {
  const sorted = [...PRODUCTS].sort((a, b) => Number(b.id) - Number(a.id));

  NEW_COLLECTION_IDS = new Set(sorted.slice(0, 8).map(p => Number(p.id)));
  FEATURED_IDS = new Set(
    [...PRODUCTS].sort((a, b) => Number(b.price) - Number(a.price)).slice(0, 8).map(p => Number(p.id))
  );
  // Flash sale: choose 6 mid-priced products deterministically
  const flashCandidates = [...PRODUCTS].sort((a, b) => Number(a.id) - Number(b.id));
  const step = Math.max(1, Math.floor(flashCandidates.length / 6));
  const flashIds = [];
  for (let i = 0; i < flashCandidates.length && flashIds.length < 6; i += step) {
    flashIds.push(Number(flashCandidates[i].id));
  }
  FLASH_SALE_IDS = new Set(flashIds);
}

function cartItemKey(productId, size, color) {
  return `${productId}|${size || "default"}|${color || "default"}`;
}

function productCard(p, opts = {}) {
  const eff = effectivePrice(p);
  const disc = productDiscount(p);
  const isNew = NEW_COLLECTION_IDS.has(Number(p.id));
  const isHot = FEATURED_IDS.has(Number(p.id));
  const inWishlist = wishlist.some(w => Number(w.productId) === Number(p.id));

  const tags = [];
  if (disc) tags.push(`<span class="tag-flash">${escapeHtml(disc.label)}</span>`);
  if (!opts.hideNewTag && isNew && !disc) tags.push(`<span class="tag-new">Mới</span>`);
  if (!opts.hideHotTag && isHot && !disc && !isNew) tags.push(`<span class="tag-hot">Hot</span>`);

  return `
    <article class="product-card">
      <div class="product-card-media">
        <span class="product-badge">${escapeHtml(mapCategory(p.category))}</span>
        <div class="product-card-tags">${tags.join("")}</div>
        <button type="button" class="product-card-wishlist ${inWishlist ? "is-active" : ""}" data-wish="${p.id}" aria-label="Yêu thích">
          <i class="fas fa-heart"></i>
        </button>
        <button class="product-image-btn" data-view="${p.id}" aria-label="Xem chi tiết">
          <img src="${escapeHtml(productImage(p))}" alt="${escapeHtml(p.name)}" class="product-image" onerror="${productImgOnError(p.category)}" />
        </button>
        <div class="product-quick-add">
          <button type="button" data-add="${p.id}">Thêm vào giỏ</button>
        </div>
      </div>
      <div class="product-body">
        <p class="product-brand">${escapeHtml(p.brand || "IS207")}</p>
        <h3 class="product-name">${escapeHtml(p.name)}</h3>
        <p class="product-meta">
          <span class="meta-line"><i class="fas fa-palette"></i> ${escapeHtml((p.colors || []).slice(0, 3).join(" · ") || "Nhiều màu")}</span>
          <span class="meta-line"><i class="fas fa-ruler"></i> ${escapeHtml((p.sizes || []).slice(0, 6).join(" · ") || "—")}</span>
        </p>
        <div class="product-footer">
          <span class="product-price">
            ${formatCurrency(eff)}
            ${disc ? `<span class="product-price-old">${formatCurrency(p.price)}</span><span class="product-discount">-${disc.percent}%</span>` : ""}
          </span>
        </div>
      </div>
    </article>
  `;
}

function renderProductSubset(targetEl, ids) {
  if (!targetEl) return;
  const list = PRODUCTS.filter(p => ids.has(Number(p.id)));
  if (!list.length) {
    targetEl.innerHTML = `<div class="empty-state"><i class="fas fa-shirt"></i><p class="muted">Chưa có sản phẩm.</p></div>`;
    return;
  }
  targetEl.innerHTML = list.map(p => productCard(p)).join("");
}

function renderHomeShowcases() {
  renderProductSubset(flashSaleGrid, FLASH_SALE_IDS);
  renderProductSubset(featuredGrid, FEATURED_IDS);
  renderProductSubset(newCollectionGrid, NEW_COLLECTION_IDS);
}

/* -------- 5) Filter & sort -------- */
function productsForFilterOptions() {
  // Filter chips reflect only the products in the currently picked category.
  // (Search/price/gender are NOT applied here to keep chips stable while typing.)
  if (!currentCategory) return PRODUCTS;
  return PRODUCTS.filter(p => p.category === currentCategory);
}

function uniqueFromProducts(key, productsArg) {
  const list = Array.isArray(productsArg) ? productsArg : PRODUCTS;
  const set = new Set();
  for (const p of list) {
    const arr = p && p[key];
    if (!Array.isArray(arr)) continue;
    for (const v of arr) {
      if (v && String(v).trim() && v !== "default") set.add(String(v));
    }
  }
  return [...set].sort((a, b) => {
    const na = Number(a), nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a).localeCompare(String(b), "vi");
  });
}

function countProductsHaving(key, value, productsArg) {
  const list = Array.isArray(productsArg) ? productsArg : PRODUCTS;
  let n = 0;
  for (const p of list) {
    const arr = p && p[key];
    if (Array.isArray(arr) && arr.map(String).includes(String(value))) n++;
  }
  return n;
}

const COLOR_HEX = {
  trang: "#ffffff", "trắng": "#ffffff", white: "#ffffff",
  den: "#000000", "đen": "#000000", black: "#000000",
  do: "#c0392b", "đỏ": "#c0392b", red: "#c0392b",
  xanh: "#3a6ea5", blue: "#3a6ea5",
  "xanh-la": "#3d6b4f", green: "#3d6b4f", "xanh lá": "#3d6b4f",
  vang: "#f1c40f", "vàng": "#f1c40f", yellow: "#f1c40f",
  nau: "#5c4033", "nâu": "#5c4033", brown: "#5c4033",
  be: "#e8d5c0", "bê": "#e8d5c0", beige: "#e8d5c0",
  hong: "#e8a3c0", "hồng": "#e8a3c0", pink: "#e8a3c0",
  xam: "#7a7a7a", "xám": "#7a7a7a", gray: "#7a7a7a", grey: "#7a7a7a",
  cam: "#e67e22", orange: "#e67e22",
  tim: "#8e44ad", "tím": "#8e44ad", purple: "#8e44ad",
};

function colorSwatch(color) {
  const key = String(color || "").toLowerCase().trim();
  return COLOR_HEX[key] || "#cccccc";
}

function renderFilterOptions() {
  const inCat = productsForFilterOptions();

  // Drop active filter values that no longer exist for this category
  if (filterSize) {
    const sizes = uniqueFromProducts("sizes", inCat);
    for (const s of [...filterState.sizes]) {
      if (!sizes.includes(s)) filterState.sizes.delete(s);
    }
    filterSize.innerHTML = sizes.length
      ? sizes.map(s => {
          const count = countProductsHaving("sizes", s, inCat);
          return `<button type="button" class="filter-chip ${filterState.sizes.has(s) ? "active" : ""}" data-size="${escapeHtml(s)}" title="${count} sản phẩm">${escapeHtml(s)} <small>(${count})</small></button>`;
        }).join("")
      : `<span class="muted">—</span>`;
  }
  if (filterColor) {
    const colors = uniqueFromProducts("colors", inCat);
    for (const c of [...filterState.colors]) {
      if (!colors.includes(c)) filterState.colors.delete(c);
    }
    filterColor.innerHTML = colors.length
      ? colors.map(c => {
          const hex = colorSwatch(c);
          const count = countProductsHaving("colors", c, inCat);
          return `<button type="button" class="filter-chip ${filterState.colors.has(c) ? "active" : ""}" data-color="${escapeHtml(c)}" title="${count} sản phẩm"><span class="filter-color-swatch" style="background:${hex}"></span>${escapeHtml(c)} <small>(${count})</small></button>`;
        }).join("")
      : `<span class="muted">—</span>`;
  }

  // Gender chips: enable/disable based on what's available in this category
  if (filterGender) {
    const genders = new Set(inCat.map(inferGender));
    filterGender.querySelectorAll(".filter-chip").forEach(btn => {
      const g = btn.getAttribute("data-gender") || "";
      const available = !g || genders.has(g);
      btn.disabled = !available;
      btn.style.opacity = available ? "" : "0.45";
      btn.style.cursor = available ? "" : "not-allowed";
      const baseLabel = btn.dataset.baseLabel || btn.textContent.trim();
      btn.dataset.baseLabel = baseLabel;
      if (g) {
        const n = inCat.filter(p => inferGender(p) === g).length;
        btn.innerHTML = `${escapeHtml(baseLabel)} <small>(${n})</small>`;
      }
    });
  }
}

function priceInRange(p) {
  const eff = effectivePrice(p);
  if (filterState.priceMin != null && eff < filterState.priceMin) return false;
  if (filterState.priceMax != null && eff > filterState.priceMax) return false;
  return true;
}

function productMatchesFilters(p) {
  if (currentCategory && p.category !== currentCategory) return false;
  if (currentSearch.trim()) {
    const kw = currentSearch.toLowerCase();
    const name = (p.name || "").toLowerCase();
    const sku = (p.sku || "").toLowerCase();
    if (!name.includes(kw) && !sku.includes(kw)) return false;
  }
  if (filterState.gender) {
    if (inferGender(p) !== filterState.gender) return false;
  }
  if (filterState.sizes.size) {
    const productSizes = Array.isArray(p.sizes) ? p.sizes.map(String) : [];
    if (![...filterState.sizes].some(s => productSizes.includes(s))) return false;
  }
  if (filterState.colors.size) {
    const productColors = Array.isArray(p.colors) ? p.colors.map(String) : [];
    if (![...filterState.colors].some(c => productColors.includes(c))) return false;
  }
  if (!priceInRange(p)) return false;
  return true;
}

function applySort(data) {
  switch (currentSort) {
    case "price-asc":
      return data.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    case "price-desc":
      return data.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    case "name-asc":
      return data.sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi"));
    case "best-seller":
      return data.sort((a, b) => {
        const aFeat = FEATURED_IDS.has(Number(a.id)) ? 1 : 0;
        const bFeat = FEATURED_IDS.has(Number(b.id)) ? 1 : 0;
        if (aFeat !== bFeat) return bFeat - aFeat;
        return Number(b.id) - Number(a.id);
      });
    case "newest":
    default:
      return data.sort((a, b) => Number(b.id) - Number(a.id));
  }
}

function filterAndSortProducts() {
  const data = PRODUCTS.filter(productMatchesFilters);
  return applySort(data);
}

function renderActiveFilters() {
  if (!activeFiltersEl) return;
  const chips = [];
  if (currentCategory) chips.push({ label: mapCategory(currentCategory), reset: () => { setCategory(""); } });
  if (filterState.gender) {
    const map = { nam: "Nam", nu: "Nữ", unisex: "Unisex" };
    chips.push({ label: `Giới tính: ${map[filterState.gender] || filterState.gender}`, reset: () => { filterState.gender = ""; updateFilterChips(); applyFilterAndRender(); } });
  }
  filterState.sizes.forEach(s => chips.push({ label: `Size ${s}`, reset: () => { filterState.sizes.delete(s); updateFilterChips(); applyFilterAndRender(); } }));
  filterState.colors.forEach(c => chips.push({ label: `Màu ${c}`, reset: () => { filterState.colors.delete(c); updateFilterChips(); applyFilterAndRender(); } }));
  if (filterState.priceMin != null || filterState.priceMax != null) {
    const lo = filterState.priceMin != null ? formatCurrency(filterState.priceMin) : "0";
    const hi = filterState.priceMax != null ? formatCurrency(filterState.priceMax) : "∞";
    chips.push({ label: `Giá: ${lo} – ${hi}`, reset: () => { filterState.priceMin = null; filterState.priceMax = null; if (filterPriceMin) filterPriceMin.value = ""; if (filterPriceMax) filterPriceMax.value = ""; applyFilterAndRender(); } });
  }
  if (currentSearch.trim()) {
    chips.push({ label: `Tìm: "${currentSearch.trim()}"`, reset: () => { currentSearch = ""; if (searchInput) searchInput.value = ""; applyFilterAndRender(); } });
  }
  if (!chips.length) {
    activeFiltersEl.innerHTML = "";
    return;
  }
  activeFiltersEl.innerHTML = chips.map((c, i) => `<button type="button" class="active-filter-chip" data-active-idx="${i}">${escapeHtml(c.label)} <i class="fas fa-times"></i></button>`).join("");
  activeFiltersEl.querySelectorAll("[data-active-idx]").forEach((btn, i) => {
    btn.addEventListener("click", () => chips[i].reset());
  });
}

function updateFilterChips() {
  if (filterGender) {
    filterGender.querySelectorAll(".filter-chip").forEach(btn => {
      btn.classList.toggle("active", (btn.getAttribute("data-gender") || "") === filterState.gender);
    });
  }
  if (filterSize) {
    filterSize.querySelectorAll(".filter-chip").forEach(btn => {
      const s = btn.getAttribute("data-size");
      btn.classList.toggle("active", filterState.sizes.has(s));
    });
  }
  if (filterColor) {
    filterColor.querySelectorAll(".filter-chip").forEach(btn => {
      const c = btn.getAttribute("data-color");
      btn.classList.toggle("active", filterState.colors.has(c));
    });
  }
}

function setCategory(cat) {
  currentCategory = cat || "";
  document.querySelectorAll(".chip").forEach(c => {
    c.classList.toggle("active", (c.getAttribute("data-category") || "") === currentCategory);
  });
  updateHomePromoVisibility(true);
  renderFilterOptions();
  applyFilterAndRender();
}

function applyFilterAndRender() {
  renderProducts();
  renderActiveFilters();
}

function renderProducts() {
  const data = filterAndSortProducts();

  const countLabel = document.getElementById("productCountLabel");
  if (countLabel) {
    countLabel.textContent = data.length
      ? `${data.length} sản phẩm`
      : "Không tìm thấy sản phẩm phù hợp";
  }

  if (!data.length) {
    productGrid.innerHTML = `<div class="empty-state"><i class="fas fa-shirt"></i><p class="muted">Không tìm thấy sản phẩm phù hợp.</p></div>`;
    return;
  }

  productGrid.innerHTML = data.map(p => productCard(p)).join("");
}

/* Delegated handlers for product cards (works for all grids) */
document.addEventListener("click", (e) => {
  const viewBtn = e.target.closest("[data-view]");
  if (viewBtn) {
    openProductModal(Number(viewBtn.getAttribute("data-view")));
    return;
  }
  const addBtn = e.target.closest("[data-add]");
  if (addBtn) {
    openProductModal(Number(addBtn.getAttribute("data-add")));
    return;
  }
  const wishBtn = e.target.closest("[data-wish]");
  if (wishBtn) {
    e.stopPropagation();
    toggleWishlist(Number(wishBtn.getAttribute("data-wish")));
    return;
  }
  const infoBtn = e.target.closest("[data-info-target]");
  if (infoBtn) {
    e.preventDefault();
    openInfoModal(infoBtn.getAttribute("data-info-target"));
  }
  const footerCat = e.target.closest("[data-footer-cat]");
  if (footerCat) {
    e.preventDefault();
    setCategory(footerCat.getAttribute("data-footer-cat") || "");
    if (mainContent) mainContent.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

/* -------- 6) Wishlist -------- */
function saveWishlist() {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  if (wishlistCountEl) {
    wishlistCountEl.textContent = String(wishlist.length);
    wishlistCountEl.style.display = wishlist.length > 0 ? "inline-flex" : "none";
  }
}

function toggleWishlist(productId) {
  const p = PRODUCTS.find(x => Number(x.id) === Number(productId));
  if (!p) return;
  const idx = wishlist.findIndex(w => Number(w.productId) === Number(productId));
  if (idx >= 0) {
    wishlist.splice(idx, 1);
    showToast("Đã xoá khỏi yêu thích");
  } else {
    wishlist.push({
      productId: Number(p.id),
      name: p.name,
      price: p.price,
      image: productImage(p),
      category: p.category,
      addedAt: Date.now(),
    });
    showToast("Đã thêm vào yêu thích");
  }
  saveWishlist();
  // refresh UI for cards (cheap: re-render visible grids)
  applyFilterAndRender();
  renderHomeShowcases();
  renderWishlist();
  updatePdWishlistBtn();
}

function renderWishlist() {
  if (!wishlistItemsEl) return;
  if (!wishlist.length) {
    wishlistItemsEl.innerHTML = `<div class="wishlist-empty"><i class="fas fa-heart"></i><p>Bạn chưa thêm sản phẩm yêu thích nào.</p></div>`;
    return;
  }
  wishlistItemsEl.innerHTML = wishlist.map(item => {
    const p = PRODUCTS.find(x => Number(x.id) === Number(item.productId));
    const img = p ? productImage(p) : (item.image || FALLBACK_PRODUCT_IMAGES.ao);
    const price = p ? effectivePrice(p) : item.price;
    return `
      <div class="cart-item">
        <img src="${escapeHtml(img)}" alt="${escapeHtml(item.name)}" class="cart-item-img" onerror="${productImgOnError(item.category || (p && p.category))}" />
        <div class="cart-item-body">
          <div class="cart-item-name">${escapeHtml(item.name)}</div>
          <div class="cart-item-price">${formatCurrency(price)}</div>
          <div class="cart-item-controls">
            <button class="qty-btn" type="button" data-wishlist-view="${item.productId}" title="Xem"><i class="fas fa-eye"></i></button>
            <button class="qty-btn" type="button" data-wishlist-add="${item.productId}" title="Thêm vào giỏ"><i class="fas fa-cart-plus"></i></button>
            <button class="remove-btn" type="button" data-wishlist-remove="${item.productId}">Xoá</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  wishlistItemsEl.querySelectorAll("[data-wishlist-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      closeWishlist();
      openProductModal(Number(btn.getAttribute("data-wishlist-view")));
    });
  });
  wishlistItemsEl.querySelectorAll("[data-wishlist-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-wishlist-add"));
      const p = PRODUCTS.find(x => Number(x.id) === Number(id));
      if (!p) return;
      const size = (p.sizes && p.sizes[0]) || "default";
      const color = (p.colors && p.colors[0]) || "default";
      addToCart(id, size, color);
    });
  });
  wishlistItemsEl.querySelectorAll("[data-wishlist-remove]").forEach(btn => {
    btn.addEventListener("click", () => {
      toggleWishlist(Number(btn.getAttribute("data-wishlist-remove")));
    });
  });
}

function openWishlist() {
  wishlistDrawer.classList.add("show");
  wishlistOverlay.classList.add("show");
  renderWishlist();
}

function closeWishlist() {
  wishlistDrawer.classList.remove("show");
  wishlistOverlay.classList.remove("show");
}

/* -------- 7) Cart -------- */
function addToCart(productId, size, color) {
  const product = PRODUCTS.find(p => Number(p.id) === Number(productId));
  if (!product) return;
  const price = effectivePrice(product);
  const key = cartItemKey(productId, size, color);
  const existing = cart.find(i => i.key === key);
  if (existing) {
    existing.qty += 1;
    existing.price = price;
  } else {
    cart.push({
      key,
      productId: Number(product.id),
      name: product.name,
      price,
      image: productImage(product),
      category: product.category,
      qty: 1,
      size: size || "default",
      color: color || "default"
    });
  }
  saveCart();
  renderCart();
  showToast("Đã thêm vào giỏ hàng");
}

function changeQty(key, delta) {
  const item = cart.find(i => i.key === key);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.key !== key);
  saveCart();
  renderCart();
}

function removeFromCart(key) {
  cart = cart.filter(i => i.key !== key);
  saveCart();
  renderCart();
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function cartSubtotal() {
  return cart.reduce((sum, i) => sum + i.qty * i.price, 0);
}

function renderCart() {
  if (!cart.length) {
    cartItemsEl.innerHTML = `<p class="muted">Giỏ hàng trống</p>`;
  } else {
    cartItemsEl.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${escapeHtml(cartItemImage(item))}" alt="${escapeHtml(item.name)}" class="cart-item-img" onerror="${productImgOnError(cartItemCategory(item))}" />
        <div class="cart-item-body">
          <div class="cart-item-name">${escapeHtml(item.name)}</div>
          <div class="cart-item-meta">${escapeHtml(item.color)} · Size ${escapeHtml(item.size)}</div>
          <div class="cart-item-price">${formatCurrency(item.qty * item.price)}</div>
          <div class="cart-item-controls">
            <button class="qty-btn" data-key="${item.key}" data-delta="-1">-</button>
            <span>${item.qty}</span>
            <button class="qty-btn" data-key="${item.key}" data-delta="1">+</button>
            <button class="remove-btn" data-key="${item.key}">Xóa</button>
          </div>
        </div>
      </div>
    `).join("");
  }

  let totalQty = 0;
  const subtotal = cartSubtotal();
  for (const item of cart) totalQty += item.qty;

  cartCountEl.textContent = String(totalQty);
  cartCountEl.style.display = totalQty > 0 ? "inline-flex" : "none";
  cartSubtotalEl.textContent = formatCurrency(subtotal);
  const shipping = subtotal > 0 ? 30000 : 0;
  cartTotalEl.textContent = formatCurrency(subtotal + shipping);

  cartItemsEl.querySelectorAll(".qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-key");
      const delta = Number(btn.getAttribute("data-delta"));
      changeQty(key, delta);
    });
  });
  cartItemsEl.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", () => removeFromCart(btn.getAttribute("data-key")));
  });
}

function openCart() {
  cartDrawer.classList.add("show");
  cartOverlay.classList.add("show");
}

function closeCart() {
  cartDrawer.classList.remove("show");
  cartOverlay.classList.remove("show");
}

function updateHomePromoVisibility(scrollToProducts) {
  if (!homePromo) return;
  const hide = Boolean(currentCategory);
  homePromo.classList.toggle("is-hidden", hide);
  if (hide && scrollToProducts && mainContent) {
    mainContent.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/* -------- 8) Product detail (tabs) -------- */
function updatePdWishlistBtn() {
  if (!pdWishlistBtn || selectedProductId == null) return;
  const active = wishlist.some(w => Number(w.productId) === Number(selectedProductId));
  pdWishlistBtn.classList.toggle("is-active", active);
  pdWishlistBtn.setAttribute("aria-pressed", String(active));
  if (pdWishlistText) pdWishlistText.textContent = active ? "Đã yêu thích" : "Yêu thích";
}

function openProductModal(productId) {
  const product = PRODUCTS.find(p => Number(p.id) === Number(productId));
  if (!product) return;
  selectedProductId = Number(product.id);

  pdImage.src = productImage(product);
  pdImage.onerror = function () {
    this.onerror = null;
    this.src = FALLBACK_PRODUCT_IMAGES[product.category] || FALLBACK_PRODUCT_IMAGES.ao;
  };
  pdName.textContent = product.name;
  pdMeta.textContent = `${mapCategory(product.category)} • Mã: ${product.sku || ""} • ${product.brand || "IS207"} • Chất liệu: ${product.material || "Vải mềm"}`;

  const eff = effectivePrice(product);
  const disc = productDiscount(product);
  pdPrice.textContent = formatCurrency(eff);
  if (disc) {
    pdPriceOld.textContent = formatCurrency(product.price);
    pdPriceOld.classList.remove("hidden");
    pdDiscountBadge.textContent = `-${disc.percent}%`;
    pdDiscountBadge.classList.remove("hidden");
  } else {
    pdPriceOld.classList.add("hidden");
    pdDiscountBadge.classList.add("hidden");
  }

  const colors = (product.colors && product.colors.length) ? product.colors : ["default"];
  const sizes = (product.sizes && product.sizes.length) ? product.sizes : ["default"];
  pdColor.innerHTML = colors.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  pdSize.innerHTML = sizes.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");

  function updateStockNote() {
    const size = pdSize.value;
    const stock = product.stockBySize && product.stockBySize[size] != null ? Number(product.stockBySize[size]) : null;
    pdStockNote.textContent = stock == null ? "" : `Tồn kho size ${size}: ${stock}`;
    pdAddToCartBtn.disabled = stock === 0;
  }
  pdSize.onchange = updateStockNote;
  updateStockNote();

  // Description text — derived from category if not present
  const descByCat = {
    ao: "Áo basic kiểu dáng tối giản, chất vải mềm, thấm hút mồ hôi tốt — phù hợp đi học, đi làm và dạo phố.",
    quan: "Quần với form chuẩn, đường may chắc chắn, độ co giãn vừa phải — thoải mái cả ngày dài.",
    vay: "Váy nhẹ nhàng, đường cắt may tỉ mỉ, dễ phối với áo blouse hoặc áo thun cơ bản.",
    "ao-khoac": "Áo khoác lớp lót êm, chống gió nhẹ — sự lựa chọn cho thời tiết chuyển mùa."
  };
  pdDescription.textContent = product.description || descByCat[product.category] || "Sản phẩm chất lượng cao từ IS207 Fashion.";

  pdSpecTableBody.innerHTML = [
    ["Mã sản phẩm (SKU)", product.sku || "—"],
    ["Thương hiệu", product.brand || "IS207"],
    ["Chất liệu", product.material || "Cotton pha"],
    ["Danh mục", mapCategory(product.category) || "—"],
    ["Màu sắc", (product.colors || []).join(", ") || "—"],
    ["Size có sẵn", (product.sizes || []).join(", ") || "—"],
    ["Xuất xứ", "Việt Nam"],
    ["Hướng dẫn giặt", "Giặt tay với nước lạnh, không tẩy, phơi nơi thoáng mát"],
  ].map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join("");

  // Reset tabs
  document.querySelectorAll(".pd-tab").forEach(t => t.classList.toggle("active", t.getAttribute("data-tab") === "desc"));
  document.querySelectorAll(".pd-panel").forEach(p => p.classList.toggle("active", p.getAttribute("data-panel") === "desc"));

  updatePdWishlistBtn();
  openModal(productModal);
}

function setupProductTabs() {
  document.querySelectorAll(".pd-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-tab");
      document.querySelectorAll(".pd-tab").forEach(t => t.classList.toggle("active", t === tab));
      document.querySelectorAll(".pd-panel").forEach(p => p.classList.toggle("active", p.getAttribute("data-panel") === target));
    });
  });
}

/* -------- 9) Promo carousel + flash countdown -------- */
const PROMO_SLIDES = [
  {
    eyebrow: "Khuyến mãi mùa",
    title: "Giảm tới 40% — Bộ sưu tập Xuân 2026",
    desc: "Áp dụng cho hơn 200 sản phẩm. Nhanh tay sở hữu trước khi hết hàng.",
    cta: "Khám phá ngay",
    target: "products",
    bg: "linear-gradient(120deg, #5c4033 0%, #8a6048 100%)",
  },
  {
    eyebrow: "Miễn phí vận chuyển",
    title: "FREESHIP cho đơn từ 500.000đ",
    desc: "Áp dụng toàn quốc. Nhập mã FREESHIP khi thanh toán.",
    cta: "Mua sắm ngay",
    target: "products",
    bg: "linear-gradient(120deg, #3d6b4f 0%, #5c4033 100%)",
  },
  {
    eyebrow: "Thành viên mới",
    title: "Tặng ngay 50.000đ cho đơn đầu tiên",
    desc: "Đăng ký tài khoản và nhập mã WELCOME50.",
    cta: "Đăng ký ngay",
    target: "auth",
    bg: "linear-gradient(120deg, #9a7b52 0%, #5c4033 100%)",
  },
];

let promoIdx = 0;
let promoAuto = null;

function renderPromoCarousel() {
  if (!promoTrack || !promoDotsEl) return;
  promoTrack.innerHTML = PROMO_SLIDES.map(s => `
    <div class="promo-slide" style="background:${s.bg}">
      <div class="promo-slide-inner">
        <p class="promo-eyebrow">${escapeHtml(s.eyebrow)}</p>
        <h2 class="promo-title">${escapeHtml(s.title)}</h2>
        <p class="promo-desc">${escapeHtml(s.desc)}</p>
        <button type="button" class="promo-cta" data-promo-target="${escapeHtml(s.target)}">${escapeHtml(s.cta)}</button>
      </div>
    </div>
  `).join("");
  promoDotsEl.innerHTML = PROMO_SLIDES.map((_, i) => `<button type="button" class="promo-dot ${i === 0 ? "active" : ""}" data-promo-idx="${i}" aria-label="Slide ${i + 1}"></button>`).join("");

  promoDotsEl.querySelectorAll("[data-promo-idx]").forEach(btn => {
    btn.addEventListener("click", () => goPromoSlide(Number(btn.getAttribute("data-promo-idx"))));
  });
  promoTrack.querySelectorAll("[data-promo-target]").forEach(btn => {
    btn.addEventListener("click", () => {
      const tgt = btn.getAttribute("data-promo-target");
      if (tgt === "auth") openAuthModal();
      else if (mainContent) mainContent.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function goPromoSlide(idx) {
  const n = PROMO_SLIDES.length;
  if (!n) return;
  promoIdx = ((idx % n) + n) % n;
  promoTrack.style.transform = `translateX(-${promoIdx * 100}%)`;
  promoDotsEl.querySelectorAll(".promo-dot").forEach((d, i) => d.classList.toggle("active", i === promoIdx));
}

function startPromoAuto() {
  clearInterval(promoAuto);
  promoAuto = setInterval(() => goPromoSlide(promoIdx + 1), 5500);
}

/* Flash sale countdown */
function getFlashDeadline() {
  const saved = Number(localStorage.getItem(FLASH_DEADLINE_KEY) || 0);
  if (saved > Date.now()) return saved;
  const next = Date.now() + FLASH_DURATION_MS;
  localStorage.setItem(FLASH_DEADLINE_KEY, String(next));
  return next;
}

function tickFlashCountdown() {
  const deadline = getFlashDeadline();
  let ms = deadline - Date.now();
  if (ms <= 0) {
    localStorage.removeItem(FLASH_DEADLINE_KEY);
    ms = FLASH_DURATION_MS;
    localStorage.setItem(FLASH_DEADLINE_KEY, String(Date.now() + ms));
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (cdHours) cdHours.textContent = String(h).padStart(2, "0");
  if (cdMinutes) cdMinutes.textContent = String(m).padStart(2, "0");
  if (cdSeconds) cdSeconds.textContent = String(s).padStart(2, "0");
}

/* -------- 10) Checkout flow -------- */
function checkoutSubtotal() {
  return cartSubtotal();
}

function checkoutShippingFee(subtotal) {
  if (appliedCoupon && appliedCoupon.type === "freeship") return 0;
  if (subtotal >= 500000) return 0;
  return subtotal > 0 ? 30000 : 0;
}

function checkoutDiscount(subtotal) {
  if (!appliedCoupon) return 0;
  if (appliedCoupon.type === "percent") return Math.round(subtotal * (appliedCoupon.value / 100));
  if (appliedCoupon.type === "amount") return Math.min(appliedCoupon.value, subtotal);
  return 0;
}

function renderCheckoutSummary() {
  const subtotal = checkoutSubtotal();
  const shipping = checkoutShippingFee(subtotal);
  const discount = checkoutDiscount(subtotal);
  const total = Math.max(0, subtotal + shipping - discount);

  ckSubtotal.textContent = formatCurrency(subtotal);
  ckShipping.textContent = shipping === 0 && subtotal > 0 ? "Miễn phí" : formatCurrency(shipping);
  if (discount > 0) {
    ckDiscountRow.classList.remove("hidden");
    ckDiscount.textContent = `- ${formatCurrency(discount)}`;
  } else {
    ckDiscountRow.classList.add("hidden");
  }
  ckTotal.textContent = formatCurrency(total);

  // refresh payment detail since total changed
  renderPaymentDetail(total);
}

function renderCheckoutItems() {
  if (!checkoutItemsList) return;
  if (!cart.length) {
    checkoutItemsList.innerHTML = `<p class="muted">Giỏ hàng trống.</p>`;
    return;
  }
  checkoutItemsList.innerHTML = cart.map(item => `
    <div class="checkout-item">
      <img src="${escapeHtml(cartItemImage(item))}" alt="${escapeHtml(item.name)}" onerror="${productImgOnError(cartItemCategory(item))}" />
      <div class="checkout-item-info">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.color)} · Size ${escapeHtml(item.size)} · SL ${item.qty}</span>
      </div>
      <div class="checkout-item-price">${formatCurrency(item.qty * item.price)}</div>
    </div>
  `).join("");
}

function applyCoupon() {
  const raw = (couponInput.value || "").trim().toUpperCase();
  if (!raw) {
    appliedCoupon = null;
    couponHint.textContent = "Mẹo: nhập IS207 để giảm 10%, FREESHIP để miễn phí ship.";
    couponHint.className = "muted";
    renderCheckoutSummary();
    return;
  }
  const coupon = COUPONS[raw];
  if (!coupon) {
    appliedCoupon = null;
    couponHint.textContent = `Mã "${raw}" không hợp lệ.`;
    couponHint.className = "field-check-hint field-check-hint--bad";
    showToast("Mã ưu đãi không hợp lệ");
  } else {
    appliedCoupon = { code: raw, ...coupon };
    couponHint.textContent = `Đã áp dụng: ${coupon.label}.`;
    couponHint.className = "field-check-hint field-check-hint--ok";
    showToast(`Đã áp dụng mã ${raw}`);
  }
  renderCheckoutSummary();
}

function buildVietQrUrl(amount, info) {
  const params = new URLSearchParams({
    amount: String(amount || 0),
    addInfo: info || `IS207 ${Date.now()}`,
    accountName: COMPANY_BANK.accountName,
  });
  return `https://img.vietqr.io/image/${COMPANY_BANK.bankCode}-${COMPANY_BANK.accountNumber}-compact2.png?${params.toString()}`;
}

function buildGenericQrUrl(text) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(text)}`;
}

function selectedPaymentMethod() {
  const r = document.querySelector('input[name="payment"]:checked');
  return r ? r.value : "cod";
}

/* -------- Card helpers (Luhn + brand detection + formatters) -------- */

const CARD_BRANDS = {
  visa:       { label: "VISA",          lengths: [13, 16, 19], cvvLen: 3, regex: /^4/ },
  mastercard: { label: "Mastercard",    lengths: [16],         cvvLen: 3, regex: /^(5[1-5]|2(2(2[1-9]|[3-9]\d)|[3-6]\d{2}|7([01]\d|20)))/ },
  amex:       { label: "AMEX",          lengths: [15],         cvvLen: 4, regex: /^3[47]/ },
  jcb:        { label: "JCB",           lengths: [16, 17, 18, 19], cvvLen: 3, regex: /^(352[89]|35[3-8]\d)/ },
  napas:      { label: "ATM (NAPAS)",   lengths: [16, 19],     cvvLen: 3, regex: /^9704/ },
  unknown:    { label: "Thẻ",           lengths: [13, 14, 15, 16, 17, 18, 19], cvvLen: 3, regex: /./ }
};

function detectCardBrand(num) {
  const s = String(num || "").replace(/\D/g, "");
  for (const [key, b] of Object.entries(CARD_BRANDS)) {
    if (key === "unknown") continue;
    if (b.regex.test(s)) return { key, ...b };
  }
  return { key: "unknown", ...CARD_BRANDS.unknown };
}

function luhnCheck(num) {
  const digits = String(num || "").replace(/\D/g, "");
  if (digits.length < 12) return false;
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function formatCardNumber(value, brandKey) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 19);
  // Amex grouping 4-6-5, others 4-4-4-4(-3)
  if (brandKey === "amex") {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(" ");
  }
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + "/" + digits.slice(2);
}

function maskCardNumber(num) {
  const s = String(num || "").replace(/\s/g, "");
  if (!s) return "**** **** **** ****";
  const last4 = s.slice(-4).padStart(4, "•");
  return `**** **** **** ${last4}`;
}

function validateExpiry(value) {
  const m = /^(\d{2})\/(\d{2})$/.exec(String(value || "").trim());
  if (!m) return false;
  const month = parseInt(m[1], 10);
  const year = 2000 + parseInt(m[2], 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const exp = new Date(year, month, 0, 23, 59, 59);
  return exp >= now;
}

// State giữ giữa các lần re-render summary
const cardFormState = {
  number: "",
  holder: "",
  expiry: "",
  cvv: "",
  brandKey: "unknown",
  valid: false
};

function validateCardForm() {
  const number = cardFormState.number.replace(/\s/g, "");
  const brand = CARD_BRANDS[cardFormState.brandKey] || CARD_BRANDS.unknown;
  const errors = {};
  if (!number) errors.number = "Vui lòng nhập số thẻ";
  else if (!brand.lengths.includes(number.length)) errors.number = `Số thẻ ${brand.label} phải có ${brand.lengths.join("/")} chữ số`;
  else if (!luhnCheck(number)) errors.number = "Số thẻ không hợp lệ (sai checksum)";

  if (!cardFormState.holder.trim()) errors.holder = "Vui lòng nhập tên trên thẻ";
  else if (cardFormState.holder.trim().length < 3) errors.holder = "Tên phải có ít nhất 3 ký tự";

  if (!cardFormState.expiry) errors.expiry = "Nhập hạn thẻ MM/YY";
  else if (!validateExpiry(cardFormState.expiry)) errors.expiry = "Hạn thẻ không hợp lệ hoặc đã hết hạn";

  const cvvLen = brand.cvvLen;
  if (!cardFormState.cvv) errors.cvv = "Nhập CVV";
  else if (!/^\d+$/.test(cardFormState.cvv) || cardFormState.cvv.length !== cvvLen) errors.cvv = `CVV ${brand.label} có ${cvvLen} chữ số`;

  cardFormState.valid = Object.keys(errors).length === 0;
  return { ok: cardFormState.valid, errors };
}

/* -------- Render card form with live preview -------- */
function renderCardPaymentBody(amount) {
  const orderRef = "IS207-" + Date.now().toString().slice(-6);
  const brand = CARD_BRANDS[cardFormState.brandKey] || CARD_BRANDS.unknown;
  return `
    <div class="card-pay-wrap" id="cardPayWrap">
      <div class="card-preview brand-${cardFormState.brandKey}" id="cardPreview">
        <div class="card-preview-row">
          <div class="card-chip"></div>
          <span class="card-brand-mark" id="cardBrandMark">${escapeHtml(brand.label)}</span>
        </div>
        <div class="card-number-preview" id="cardNumPreview">${escapeHtml(cardFormState.number || "•••• •••• •••• ••••")}</div>
        <div class="card-bottom">
          <div>
            <div class="card-bottom-label">Chủ thẻ</div>
            <div class="card-bottom-value" id="cardHolderPreview">${escapeHtml(cardFormState.holder || "TÊN CHỦ THẺ")}</div>
          </div>
          <div>
            <div class="card-bottom-label">Hạn</div>
            <div class="card-bottom-value" id="cardExpPreview">${escapeHtml(cardFormState.expiry || "MM/YY")}</div>
          </div>
        </div>
      </div>

      <form class="card-form" id="cardForm" autocomplete="off" novalidate>
        <h5 class="card-form-title"><i class="fas fa-credit-card"></i> Thông tin thẻ ngân hàng</h5>
        <div>
          <label for="cfNumber">Số thẻ</label>
          <div class="input-wrap">
            <input id="cfNumber" class="number-input" type="text" inputmode="numeric"
                   placeholder="1234 5678 9012 3456"
                   value="${escapeHtml(cardFormState.number)}" autocomplete="cc-number">
            <span class="card-brand-badge" id="cfBrandBadge">${escapeHtml(brand.label)}</span>
          </div>
          <p class="field-error" id="cfNumberErr"></p>
        </div>
        <div>
          <label for="cfHolder">Tên trên thẻ</label>
          <div class="input-wrap">
            <input id="cfHolder" class="holder-input" type="text"
                   placeholder="NGUYEN VAN A"
                   value="${escapeHtml(cardFormState.holder)}" autocomplete="cc-name">
          </div>
          <p class="field-error" id="cfHolderErr"></p>
        </div>
        <div class="card-form-row">
          <div>
            <label for="cfExpiry">Hạn (MM/YY)</label>
            <input id="cfExpiry" type="text" inputmode="numeric"
                   placeholder="MM/YY" maxlength="5"
                   value="${escapeHtml(cardFormState.expiry)}" autocomplete="cc-exp">
            <p class="field-error" id="cfExpiryErr"></p>
          </div>
          <div>
            <label for="cfCvv">CVV</label>
            <input id="cfCvv" type="password" inputmode="numeric"
                   placeholder="•••" maxlength="4"
                   value="${escapeHtml(cardFormState.cvv)}" autocomplete="cc-csc">
            <p class="field-error" id="cfCvvErr"></p>
          </div>
        </div>

        <div class="card-pay-amount">
          <span>Số tiền sẽ trừ</span>
          <strong data-amount>${formatCurrency(amount)}</strong>
        </div>
        <p class="card-pay-secure">
          <i class="fas fa-lock"></i> Mã hoá SSL · Xác thực 3-D Secure · IS207 không lưu thông tin thẻ
        </p>
        <input type="hidden" id="cfOrderRef" value="${orderRef}">
      </form>
    </div>`;
}

function bindCardFormEvents() {
  const numEl = document.getElementById("cfNumber");
  const holderEl = document.getElementById("cfHolder");
  const expEl = document.getElementById("cfExpiry");
  const cvvEl = document.getElementById("cfCvv");
  const brandBadge = document.getElementById("cfBrandBadge");
  const brandMark = document.getElementById("cardBrandMark");
  const preview = document.getElementById("cardPreview");
  const numPreview = document.getElementById("cardNumPreview");
  const holderPreview = document.getElementById("cardHolderPreview");
  const expPreview = document.getElementById("cardExpPreview");

  if (!numEl) return;

  function updateBrand() {
    const b = detectCardBrand(numEl.value);
    cardFormState.brandKey = b.key;
    if (brandBadge) brandBadge.textContent = b.label;
    if (brandMark) brandMark.textContent = b.label;
    if (preview) {
      preview.className = "card-preview brand-" + b.key;
    }
    if (cvvEl) cvvEl.maxLength = b.cvvLen;
  }

  numEl.addEventListener("input", () => {
    const before = numEl.value;
    const caret = numEl.selectionStart;
    const digitsBefore = before.slice(0, caret).replace(/\D/g, "").length;
    updateBrand();
    const formatted = formatCardNumber(numEl.value, cardFormState.brandKey);
    numEl.value = formatted;
    cardFormState.number = formatted;
    // restore caret
    let pos = 0, d = 0;
    while (pos < formatted.length && d < digitsBefore) {
      if (/\d/.test(formatted[pos])) d++;
      pos++;
    }
    numEl.setSelectionRange(pos, pos);
    if (numPreview) numPreview.textContent = formatted || "•••• •••• •••• ••••";
    setFieldError("cfNumberErr", numEl, "");
  });

  holderEl.addEventListener("input", () => {
    const v = holderEl.value.toUpperCase().replace(/[^A-ZÀ-ỹ\s'.-]/gi, "");
    holderEl.value = v;
    cardFormState.holder = v;
    if (holderPreview) holderPreview.textContent = v || "TÊN CHỦ THẺ";
    setFieldError("cfHolderErr", holderEl, "");
  });

  expEl.addEventListener("input", () => {
    const formatted = formatExpiry(expEl.value);
    expEl.value = formatted;
    cardFormState.expiry = formatted;
    if (expPreview) expPreview.textContent = formatted || "MM/YY";
    setFieldError("cfExpiryErr", expEl, "");
  });

  cvvEl.addEventListener("input", () => {
    const digits = cvvEl.value.replace(/\D/g, "").slice(0, cvvEl.maxLength || 4);
    cvvEl.value = digits;
    cardFormState.cvv = digits;
    setFieldError("cfCvvErr", cvvEl, "");
  });
}

function setFieldError(errId, inputEl, message) {
  const el = document.getElementById(errId);
  if (el) el.textContent = message || "";
  if (inputEl) {
    inputEl.classList.remove("is-invalid", "is-valid");
    if (message) inputEl.classList.add("is-invalid");
    else if (inputEl.value) inputEl.classList.add("is-valid");
  }
}

function showCardFormErrors(errors) {
  setFieldError("cfNumberErr", document.getElementById("cfNumber"), errors.number || "");
  setFieldError("cfHolderErr", document.getElementById("cfHolder"), errors.holder || "");
  setFieldError("cfExpiryErr", document.getElementById("cfExpiry"), errors.expiry || "");
  setFieldError("cfCvvErr", document.getElementById("cfCvv"), errors.cvv || "");
}

function renderPaymentDetail(total) {
  if (!paymentDetail) return;
  const method = selectedPaymentMethod();
  const amount = Number(total) || 0;

  // Nếu method không đổi, chỉ cập nhật số tiền (tránh re-render mất state form thẻ)
  if (paymentDetail.dataset.method === method && paymentDetail.children.length > 0) {
    paymentDetail.querySelectorAll("[data-amount]").forEach(el => {
      el.textContent = formatCurrency(amount);
    });
    // cập nhật QR nếu cần
    const orderRef = paymentDetail.dataset.orderRef || ("IS207-" + Date.now().toString().slice(-6));
    paymentDetail.dataset.orderRef = orderRef;
    const qrImg = paymentDetail.querySelector("[data-qr]");
    if (qrImg) {
      if (method === "bank") qrImg.src = buildVietQrUrl(amount, orderRef);
      else if (method === "momo") qrImg.src = buildGenericQrUrl(`Chuyển ${amount} đ tới SDT Momo ${COMPANY_MOMO.phone} (${COMPANY_MOMO.name}) — Nội dung ${orderRef}`);
      else if (method === "zalopay") qrImg.src = buildGenericQrUrl(`ZaloPay ${COMPANY_ZALOPAY.phone} — ${amount}đ — ${orderRef}`);
    }
    return;
  }

  const orderRef = "IS207-" + Date.now().toString().slice(-6);
  paymentDetail.dataset.method = method;
  paymentDetail.dataset.orderRef = orderRef;

  if (method === "cod") {
    paymentDetail.innerHTML = `
      <div class="payment-detail-card" style="grid-template-columns:1fr">
        <div class="payment-info">
          <h5><i class="fas fa-money-bill-wave"></i> Thanh toán khi giao hàng</h5>
          <p>Bạn sẽ thanh toán bằng tiền mặt khi shipper giao hàng. Đảm bảo có người nhận và chuẩn bị đủ số tiền <strong data-amount>${formatCurrency(amount)}</strong>.</p>
          <ol class="payment-steps">
            <li>Shop xác nhận đơn trong 2 giờ làm việc.</li>
            <li>Đơn vị vận chuyển sẽ liên hệ trước khi giao.</li>
            <li>Kiểm tra hàng trước khi thanh toán.</li>
          </ol>
        </div>
      </div>`;
    return;
  }

  if (method === "bank") {
    const qr = buildVietQrUrl(amount, orderRef);
    paymentDetail.innerHTML = `
      <div class="payment-detail-card">
        <div class="payment-qr"><img src="${qr}" alt="QR chuyển khoản VietQR" data-qr></div>
        <div class="payment-info">
          <h5><i class="fas fa-building-columns"></i> Chuyển khoản ngân hàng (VietQR)</h5>
          <dl>
            <dt>Ngân hàng</dt><dd>${escapeHtml(COMPANY_BANK.bankName)}</dd>
            <dt>Số tài khoản</dt><dd>${escapeHtml(COMPANY_BANK.accountNumber)}</dd>
            <dt>Chủ tài khoản</dt><dd>${escapeHtml(COMPANY_BANK.accountName)}</dd>
            <dt>Số tiền</dt><dd data-amount>${formatCurrency(amount)}</dd>
            <dt>Nội dung</dt><dd>${escapeHtml(orderRef)}</dd>
          </dl>
          <ol class="payment-steps">
            <li>Mở app ngân hàng → chọn <strong>Quét QR</strong> → quét mã bên cạnh.</li>
            <li>Kiểm tra số tiền & nội dung tự điền, ấn <strong>Chuyển</strong>.</li>
            <li>Bấm <strong>Đặt hàng</strong> sau khi chuyển khoản thành công.</li>
          </ol>
        </div>
      </div>`;
    return;
  }

  if (method === "momo") {
    const momoText = `Chuyển ${amount} đ tới SDT Momo ${COMPANY_MOMO.phone} (${COMPANY_MOMO.name}) — Nội dung ${orderRef}`;
    paymentDetail.innerHTML = `
      <div class="payment-detail-card">
        <div class="payment-qr"><img src="${buildGenericQrUrl(momoText)}" alt="QR Momo" data-qr></div>
        <div class="payment-info">
          <h5><i class="fas fa-mobile-screen"></i> Ví Momo</h5>
          <dl>
            <dt>Số điện thoại</dt><dd>${escapeHtml(COMPANY_MOMO.phone)}</dd>
            <dt>Tên người nhận</dt><dd>${escapeHtml(COMPANY_MOMO.name)}</dd>
            <dt>Số tiền</dt><dd data-amount>${formatCurrency(amount)}</dd>
            <dt>Nội dung</dt><dd>${escapeHtml(orderRef)}</dd>
          </dl>
          <ol class="payment-steps">
            <li>Mở app <strong>Momo</strong> → chọn <em>Quét mã</em>.</li>
            <li>Hoặc <em>Chuyển tiền</em> → nhập SĐT ${escapeHtml(COMPANY_MOMO.phone)}.</li>
            <li>Nhập số tiền và nội dung như bên cạnh, ấn <strong>Chuyển</strong>.</li>
          </ol>
        </div>
      </div>`;
    return;
  }

  if (method === "zalopay") {
    const zaloText = `ZaloPay ${COMPANY_ZALOPAY.phone} — ${amount}đ — ${orderRef}`;
    paymentDetail.innerHTML = `
      <div class="payment-detail-card">
        <div class="payment-qr"><img src="${buildGenericQrUrl(zaloText)}" alt="QR ZaloPay" data-qr></div>
        <div class="payment-info">
          <h5><i class="fas fa-z"></i> Ví ZaloPay</h5>
          <dl>
            <dt>Số điện thoại</dt><dd>${escapeHtml(COMPANY_ZALOPAY.phone)}</dd>
            <dt>Tên người nhận</dt><dd>${escapeHtml(COMPANY_ZALOPAY.name)}</dd>
            <dt>Số tiền</dt><dd data-amount>${formatCurrency(amount)}</dd>
            <dt>Nội dung</dt><dd>${escapeHtml(orderRef)}</dd>
          </dl>
          <ol class="payment-steps">
            <li>Mở app <strong>ZaloPay</strong> → chọn <em>Quét mã</em>.</li>
            <li>Quét mã QR hoặc nhập SĐT người nhận.</li>
            <li>Nhập số tiền & nội dung theo hướng dẫn.</li>
          </ol>
        </div>
      </div>`;
    return;
  }

  // card — form thật + 3-D Secure simulator
  paymentDetail.innerHTML = renderCardPaymentBody(amount);
  bindCardFormEvents();
}

function fillCheckoutFromProfile() {
  if (!currentUser) return;
  if (ckName && !ckName.value) ckName.value = currentUser.fullName || "";
  if (ckPhone && !ckPhone.value) ckPhone.value = currentUser.phone || "";
  if (ckAddress && !ckAddress.value) ckAddress.value = currentUser.address || "";
}

function openCheckout() {
  if (!cart.length) {
    showToast("Giỏ hàng trống, hãy thêm sản phẩm");
    return;
  }
  fillCheckoutFromProfile();
  renderCheckoutItems();
  renderCheckoutSummary();
  openModal(checkoutModal);
}

function closeCheckout() {
  closeModal(checkoutModal);
}

async function placeOrder() {
  if (!cart.length) {
    showToast("Giỏ hàng trống");
    return;
  }
  const name = (ckName.value || "").trim();
  const phone = (ckPhone.value || "").trim();
  const address = (ckAddress.value || "").trim();
  if (!name || !phone || !address) {
    showToast("Vui lòng điền đủ họ tên, số điện thoại, địa chỉ");
    return;
  }
  if (!ensureLoggedIn()) return;

  const method = selectedPaymentMethod();

  // Card payment: validate form + mở OTP modal trước khi tạo đơn
  let cardMeta = null;
  if (method === "card") {
    const { ok, errors } = validateCardForm();
    if (!ok) {
      showCardFormErrors(errors);
      showToast("Vui lòng kiểm tra thông tin thẻ");
      // focus vào field lỗi đầu tiên
      const order = ["cfNumber", "cfHolder", "cfExpiry", "cfCvv"];
      const key = ["number", "holder", "expiry", "cvv"];
      for (let i = 0; i < order.length; i++) {
        if (errors[key[i]]) { document.getElementById(order[i])?.focus(); break; }
      }
      return;
    }
    const total = checkoutSubtotal() + checkoutShippingFee(checkoutSubtotal()) - checkoutDiscount(checkoutSubtotal());
    const otpOk = await runCardOtpFlow({
      amount: Math.max(0, total),
      maskedCard: maskCardNumber(cardFormState.number),
      phone
    });
    if (!otpOk) {
      showToast("Đã hủy thanh toán thẻ");
      return;
    }
    cardMeta = {
      brand: (CARD_BRANDS[cardFormState.brandKey] || CARD_BRANDS.unknown).label,
      last4: cardFormState.number.replace(/\s/g, "").slice(-4),
      holder: cardFormState.holder
    };
  }

  if (ckPlaceOrderBtn) ckPlaceOrderBtn.disabled = true;
  if (ckPlaceOrderText) ckPlaceOrderText.textContent = "Đang xử lý...";

  try {
    const items = cart.map(i => ({
      productId: i.productId,
      qty: i.qty,
      size: i.size || "default",
      color: i.color || "default",
    }));
    const noteParts = [];
    noteParts.push(`Người nhận: ${name} (${phone})`);
    if (ckNote.value.trim()) noteParts.push(`Ghi chú: ${ckNote.value.trim()}`);
    noteParts.push(`Thanh toán: ${labelForPaymentMethod(method)}`);
    if (cardMeta) noteParts.push(`Thẻ: ${cardMeta.brand} ****${cardMeta.last4}`);
    if (appliedCoupon) noteParts.push(`Mã ưu đãi: ${appliedCoupon.code}`);

    const order = await window.Api.OrdersApi.create({
      items,
      shippingAddress: `${address} — ${noteParts.join(" | ")}`,
    });

    cart = [];
    saveCart();
    renderCart();
    appliedCoupon = null;
    if (couponInput) couponInput.value = "";
    // reset card form state
    Object.assign(cardFormState, { number: "", holder: "", expiry: "", cvv: "", brandKey: "unknown", valid: false });
    PRODUCTS = await loadProducts();
    deriveProductSets();
    renderHomeShowcases();
    applyFilterAndRender();
    await refreshMyOrders();
    closeCheckout();
    const successMsg = method === "card"
      ? `Thanh toán thẻ thành công · Đơn ${order.orderCode || ""}`
      : `Đặt hàng thành công: ${order.orderCode || ""}`;
    showToast(successMsg);
  } catch (err) {
    showToast(err && err.message ? err.message : "Đặt hàng thất bại");
  } finally {
    if (ckPlaceOrderBtn) ckPlaceOrderBtn.disabled = false;
    if (ckPlaceOrderText) ckPlaceOrderText.textContent = "Đặt hàng";
  }
}

/* -------- 3-D Secure OTP modal flow -------- */
function runCardOtpFlow({ amount, maskedCard, phone }) {
  return new Promise(resolve => {
    const modal = document.getElementById("card3dsModal");
    const inputs = Array.from(document.querySelectorAll("#otpInputs input"));
    const confirmBtn = document.getElementById("otpConfirmBtn");
    const cancelBtn = document.getElementById("otpCancelBtn");
    const closeBtn = document.getElementById("otpClose");
    const otpMaskedCard = document.getElementById("otpMaskedCard");
    const otpAmount = document.getElementById("otpAmount");
    const otpPhoneMask = document.getElementById("otpPhoneMask");
    const countdownEl = document.getElementById("otpCountdown");

    if (!modal || !inputs.length) { resolve(false); return; }

    otpMaskedCard.textContent = maskedCard;
    otpAmount.textContent = formatCurrency(amount);
    const safePhone = String(phone || "").replace(/\D/g, "");
    otpPhoneMask.textContent = safePhone
      ? safePhone.replace(/(\d{2})(\d+)(\d{2})/, (_, a, b, c) => `${a}${"*".repeat(b.length)}${c}`)
      : "**** **** **";

    // reset inputs
    inputs.forEach(i => { i.value = ""; i.classList.remove("filled"); });
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-check"></i> Xác nhận';

    function getCode() { return inputs.map(i => i.value).join(""); }
    function updateConfirmState() {
      confirmBtn.disabled = getCode().length !== 6;
    }

    function onInput(i) {
      return (e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 1);
        e.target.value = v;
        e.target.classList.toggle("filled", Boolean(v));
        if (v && i < inputs.length - 1) inputs[i + 1].focus();
        updateConfirmState();
      };
    }
    function onKeydown(i) {
      return (e) => {
        if (e.key === "Backspace" && !inputs[i].value && i > 0) inputs[i - 1].focus();
        else if (e.key === "ArrowLeft" && i > 0) inputs[i - 1].focus();
        else if (e.key === "ArrowRight" && i < inputs.length - 1) inputs[i + 1].focus();
        else if (e.key === "Enter" && !confirmBtn.disabled) confirmBtn.click();
      };
    }
    function onPaste(e) {
      const text = (e.clipboardData || window.clipboardData).getData("text") || "";
      const digits = text.replace(/\D/g, "").slice(0, 6);
      if (!digits) return;
      e.preventDefault();
      inputs.forEach((inp, i) => {
        inp.value = digits[i] || "";
        inp.classList.toggle("filled", Boolean(digits[i]));
      });
      const next = Math.min(digits.length, inputs.length - 1);
      inputs[next].focus();
      updateConfirmState();
    }

    const handlersIn = inputs.map((inp, i) => {
      const h = onInput(i);
      inp.addEventListener("input", h);
      return h;
    });
    const handlersKey = inputs.map((inp, i) => {
      const h = onKeydown(i);
      inp.addEventListener("keydown", h);
      return h;
    });
    inputs[0].addEventListener("paste", onPaste);

    // countdown 2 phút
    let remaining = 120;
    countdownEl.textContent = "02:00";
    const timer = setInterval(() => {
      remaining--;
      const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
      const ss = String(remaining % 60).padStart(2, "0");
      countdownEl.textContent = `${mm}:${ss}`;
      if (remaining <= 0) {
        clearInterval(timer);
        confirmBtn.disabled = true;
        countdownEl.textContent = "Hết hạn";
        countdownEl.style.color = "#c0392b";
      }
    }, 1000);

    function cleanup(result) {
      clearInterval(timer);
      inputs.forEach((inp, i) => {
        inp.removeEventListener("input", handlersIn[i]);
        inp.removeEventListener("keydown", handlersKey[i]);
      });
      inputs[0].removeEventListener("paste", onPaste);
      countdownEl.style.color = "";
      cancelBtn.removeEventListener("click", onCancel);
      closeBtn.removeEventListener("click", onCancel);
      confirmBtn.removeEventListener("click", onConfirm);
      modal.removeEventListener("click", onBackdrop);
      closeModal(modal);
      resolve(result);
    }

    function onCancel() { cleanup(false); }
    function onBackdrop(e) { if (e.target === modal) cleanup(false); }
    function onConfirm() {
      if (remaining <= 0) return;
      const code = getCode();
      if (code.length !== 6) return;
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xác thực...';
      // mô phỏng độ trễ ngân hàng
      setTimeout(() => cleanup(true), 900);
    }

    cancelBtn.addEventListener("click", onCancel);
    closeBtn.addEventListener("click", onCancel);
    confirmBtn.addEventListener("click", onConfirm);
    modal.addEventListener("click", onBackdrop);

    openModal(modal);
    setTimeout(() => inputs[0].focus(), 100);
  });
}

function labelForPaymentMethod(m) {
  return {
    cod: "Thanh toán khi giao hàng",
    bank: "Chuyển khoản ngân hàng",
    momo: "Ví Momo",
    zalopay: "Ví ZaloPay",
    card: "Thẻ ngân hàng",
  }[m] || m;
}

/* -------- 11) Info / policies -------- */
const INFO_PAGES = {
  about: {
    title: "Giới thiệu doanh nghiệp",
    html: `
      <h2>Về IS207 Fashion</h2>
      <p><strong>IS207 Fashion</strong> là thương hiệu thời trang Việt Nam được thành lập bởi nhóm sinh viên Hệ thống thông tin (UIT) — với tầm nhìn mang đến những món đồ <em>tối giản, dễ phối, bền và có giá hợp lý</em> cho giới trẻ.</p>
      <h3>Câu chuyện thương hiệu</h3>
      <p>Khởi nguồn từ đồ án môn <em>IS207 — Phát triển ứng dụng Web</em>, dự án dần phát triển thành một cửa hàng thời trang trực tuyến hoàn chỉnh, phục vụ nhu cầu thực tế.</p>
      <h3>Cam kết của chúng tôi</h3>
      <ul>
        <li>Chất liệu rõ nguồn gốc, ưu tiên sợi tự nhiên.</li>
        <li>Giá niêm yết minh bạch, không tăng giá ảo trước sale.</li>
        <li>Đổi trả dễ dàng trong 7 ngày — không hỏi nhiều.</li>
        <li>Hỗ trợ khách hàng 24/7 qua hotline & chat.</li>
      </ul>
      <h3>Thông tin doanh nghiệp</h3>
      <table>
        <tr><th>Tên</th><td>Công ty TNHH IS207 Fashion</td></tr>
        <tr><th>MST</th><td>0312345678 (giả định)</td></tr>
        <tr><th>Địa chỉ</th><td>Khu phố 6, P. Linh Trung, TP. Thủ Đức, TP.HCM</td></tr>
        <tr><th>Người đại diện</th><td>Nguyễn Văn IS207</td></tr>
      </table>
    `
  },
  contact: {
    title: "Liên hệ",
    html: `
      <h2>Liên hệ IS207 Fashion</h2>
      <p>Bạn có câu hỏi, góp ý hoặc cần hỗ trợ? Hãy liên hệ chúng tôi qua một trong các kênh sau:</p>
      <h3>Tổng đài</h3>
      <ul>
        <li><strong>Hotline:</strong> 1900 1207 (8h – 22h tất cả các ngày)</li>
        <li><strong>Email:</strong> support@is207.shop</li>
        <li><strong>Fanpage:</strong> facebook.com/is207fashion</li>
        <li><strong>Zalo OA:</strong> zalo.me/is207</li>
      </ul>
      <h3>Showroom</h3>
      <table>
        <tr><th>HCM</th><td>123 Nguyễn Văn Cừ, P. Cầu Kho, Q.1</td></tr>
        <tr><th>Hà Nội</th><td>45 Lý Thường Kiệt, Hoàn Kiếm</td></tr>
        <tr><th>Đà Nẵng</th><td>78 Trần Phú, Hải Châu</td></tr>
      </table>
      <h3>Gửi yêu cầu trực tiếp</h3>
      <p>Sử dụng hộp chat ở góc dưới phải để liên hệ ngay với bộ phận chăm sóc khách hàng.</p>
    `
  },
  guide: {
    title: "Hướng dẫn mua hàng",
    html: `
      <h2>Hướng dẫn mua hàng</h2>
      <ol>
        <li><strong>Tìm sản phẩm</strong>: Dùng thanh tìm kiếm hoặc danh mục (Áo / Quần / Váy / Áo khoác).</li>
        <li><strong>Lọc & sắp xếp</strong>: Áp dụng bộ lọc Size, Màu, Khoảng giá, Giới tính ở thanh bên trái; chọn cách sắp xếp (Mới nhất, Giá tăng/giảm, Bán chạy).</li>
        <li><strong>Xem chi tiết</strong>: Bấm vào ảnh sản phẩm để xem mô tả, thông số, chính sách bảo hành.</li>
        <li><strong>Chọn Màu / Size</strong> phù hợp, sau đó bấm <em>Thêm vào giỏ</em>.</li>
        <li><strong>Vào giỏ hàng</strong> (góc trên cùng bên phải), kiểm tra và bấm <em>Đặt hàng</em>.</li>
        <li><strong>Điền thông tin giao hàng</strong>: Họ tên, SĐT, địa chỉ.</li>
        <li><strong>Nhập mã ưu đãi</strong> (nếu có).</li>
        <li><strong>Chọn phương thức thanh toán</strong>: COD / Chuyển khoản / Ví điện tử / Thẻ.</li>
        <li>Bấm <strong>Đặt hàng</strong> để hoàn tất.</li>
      </ol>
      <p>Bạn có thể theo dõi đơn hàng trong mục <em>Tài khoản → Đơn hàng của tôi</em>.</p>
    `
  },
  "policy-purchase": {
    title: "Chính sách mua hàng",
    html: `
      <h2>Chính sách mua hàng</h2>
      <h3>1. Điều kiện đặt hàng</h3>
      <ul>
        <li>Khách hàng từ 16 tuổi trở lên, có khả năng thanh toán.</li>
        <li>Cung cấp thông tin liên hệ chính xác.</li>
      </ul>
      <h3>2. Giá sản phẩm</h3>
      <p>Giá hiển thị đã bao gồm thuế GTGT, chưa bao gồm phí vận chuyển. Phí vận chuyển sẽ được tính ở bước thanh toán.</p>
      <h3>3. Hủy đơn</h3>
      <ul>
        <li>Khách hàng có thể hủy đơn trước khi shop xác nhận.</li>
        <li>Sau khi shop xác nhận hoặc đơn đã được giao cho đơn vị vận chuyển, không thể hủy.</li>
      </ul>
      <h3>4. Xác nhận đơn</h3>
      <p>Shop sẽ xác nhận đơn trong vòng 2 giờ làm việc qua điện thoại / Zalo.</p>
    `
  },
  "policy-payment": {
    title: "Chính sách thanh toán",
    html: `
      <h2>Chính sách thanh toán</h2>
      <h3>Phương thức được hỗ trợ</h3>
      <ul>
        <li><strong>Thanh toán khi nhận hàng (COD):</strong> phổ biến nhất, trả tiền mặt cho shipper.</li>
        <li><strong>Chuyển khoản ngân hàng:</strong> qua VietQR (tự động điền số tiền + nội dung).</li>
        <li><strong>Ví điện tử:</strong> Momo, ZaloPay.</li>
        <li><strong>Thẻ ngân hàng:</strong> ATM nội địa, Visa, Mastercard.</li>
      </ul>
      <h3>An toàn thông tin</h3>
      <p>IS207 <strong>không lưu</strong> thông tin thẻ ngân hàng của khách. Mọi giao dịch thẻ được xử lý qua cổng thanh toán uy tín.</p>
      <h3>Hoá đơn VAT</h3>
      <p>Khách hàng có nhu cầu xuất hoá đơn VAT vui lòng ghi chú khi đặt hàng hoặc liên hệ hotline 1900 1207.</p>
    `
  },
  "policy-shipping": {
    title: "Chính sách vận chuyển",
    html: `
      <h2>Chính sách vận chuyển</h2>
      <h3>Đơn vị vận chuyển</h3>
      <p>IS207 hợp tác với GHN, GHTK, J&T Express và Viettel Post.</p>
      <h3>Phí vận chuyển</h3>
      <table>
        <tr><th>Khu vực</th><th>Phí</th><th>Thời gian</th></tr>
        <tr><td>Nội thành TP.HCM / Hà Nội</td><td>20.000đ</td><td>1–2 ngày</td></tr>
        <tr><td>Các tỉnh thành khác</td><td>30.000đ</td><td>2–5 ngày</td></tr>
        <tr><td>Đơn từ 500.000đ</td><td><strong>Miễn phí</strong></td><td>—</td></tr>
      </table>
      <h3>Theo dõi đơn</h3>
      <p>Mã vận đơn được gửi qua SMS/Zalo ngay khi đơn được bàn giao cho đơn vị vận chuyển.</p>
    `
  },
  "policy-return": {
    title: "Chính sách đổi trả",
    html: `
      <h2>Chính sách đổi trả</h2>
      <h3>Thời gian</h3>
      <p>Khách hàng được đổi/trả trong vòng <strong>7 ngày</strong> kể từ ngày nhận hàng.</p>
      <h3>Điều kiện</h3>
      <ul>
        <li>Sản phẩm còn nguyên tem, mác, chưa qua sử dụng và giặt giũ.</li>
        <li>Còn đầy đủ hộp / túi đóng gói gốc.</li>
        <li>Kèm hoá đơn hoặc mã đơn hàng.</li>
      </ul>
      <h3>Trường hợp đổi trả miễn phí</h3>
      <ul>
        <li>Sản phẩm lỗi từ nhà sản xuất.</li>
        <li>Giao sai mẫu / sai size so với đơn hàng.</li>
        <li>Sản phẩm hư hỏng do quá trình vận chuyển.</li>
      </ul>
      <h3>Quy trình</h3>
      <ol>
        <li>Liên hệ hotline 1900 1207 hoặc chat trực tuyến.</li>
        <li>Gửi sản phẩm qua bưu điện hoặc đến showroom gần nhất.</li>
        <li>Shop kiểm tra và hoàn tiền / đổi sản phẩm mới trong 3–5 ngày làm việc.</li>
      </ol>
    `
  },
  "policy-privacy": {
    title: "Chính sách bảo mật thông tin",
    html: `
      <h2>Chính sách bảo mật thông tin</h2>
      <h3>1. Thông tin được thu thập</h3>
      <ul>
        <li>Họ tên, số điện thoại, email, địa chỉ giao hàng.</li>
        <li>Lịch sử mua hàng, sản phẩm yêu thích.</li>
        <li>Thông tin tự động: trình duyệt, IP (dùng để chống gian lận).</li>
      </ul>
      <h3>2. Mục đích sử dụng</h3>
      <ul>
        <li>Xử lý đơn hàng, giao hàng, chăm sóc sau bán.</li>
        <li>Gửi khuyến mãi (chỉ khi bạn đồng ý nhận).</li>
        <li>Cải thiện chất lượng dịch vụ.</li>
      </ul>
      <h3>3. Cam kết</h3>
      <ul>
        <li>Không bán, trao đổi thông tin khách hàng cho bên thứ ba.</li>
        <li>Chỉ chia sẻ thông tin tối thiểu cho đơn vị vận chuyển.</li>
        <li>Mật khẩu được mã hoá bằng BCrypt — IS207 không thể xem được mật khẩu của bạn.</li>
      </ul>
      <h3>4. Quyền của khách hàng</h3>
      <p>Bạn có quyền yêu cầu xem / sửa / xoá dữ liệu cá nhân của mình bất cứ lúc nào qua email <strong>privacy@is207.shop</strong>.</p>
    `
  },
  "policy-warranty": {
    title: "Chính sách bảo hành",
    html: `
      <h2>Chính sách bảo hành</h2>
      <h3>Phạm vi áp dụng</h3>
      <ul>
        <li>Tất cả sản phẩm bán tại IS207 Fashion.</li>
      </ul>
      <h3>Thời hạn</h3>
      <ul>
        <li><strong>7 ngày</strong> đổi trả nếu lỗi nhà sản xuất hoặc giao sai.</li>
        <li><strong>30 ngày</strong> bảo hành đường may (sửa miễn phí bung chỉ, đứt khuy).</li>
        <li><strong>14 ngày</strong> vệ sinh sản phẩm lần đầu miễn phí (áp dụng tại showroom).</li>
      </ul>
      <h3>Không áp dụng</h3>
      <ul>
        <li>Sản phẩm bị hư do giặt máy không đúng hướng dẫn.</li>
        <li>Sản phẩm bị rách, cháy, dính hoá chất do người dùng.</li>
        <li>Hết thời hạn bảo hành.</li>
      </ul>
      <h3>Quy trình</h3>
      <ol>
        <li>Liên hệ hotline / chat / đến showroom.</li>
        <li>Cung cấp mã đơn hàng + ảnh / video lỗi.</li>
        <li>Shop xác nhận và hướng dẫn các bước tiếp theo.</li>
      </ol>
    `
  },
  terms: {
    title: "Điều khoản sử dụng",
    html: `
      <h2>Điều khoản sử dụng</h2>
      <p>Khi truy cập và sử dụng website IS207 Fashion, bạn đồng ý tuân thủ các điều khoản sau:</p>
      <h3>1. Phạm vi sử dụng</h3>
      <p>Website cung cấp nền tảng để khách hàng tham khảo, mua sắm sản phẩm thời trang. Mọi hành vi sử dụng cho mục đích bất hợp pháp đều bị nghiêm cấm.</p>
      <h3>2. Tài khoản</h3>
      <ul>
        <li>Bạn chịu trách nhiệm bảo mật tài khoản và mật khẩu.</li>
        <li>Không chia sẻ tài khoản cho người khác.</li>
        <li>Thông báo ngay khi phát hiện truy cập trái phép.</li>
      </ul>
      <h3>3. Sở hữu trí tuệ</h3>
      <p>Toàn bộ logo, hình ảnh sản phẩm, văn bản trên website thuộc sở hữu của IS207 Fashion. Không sao chép khi chưa có sự cho phép.</p>
      <h3>4. Thay đổi điều khoản</h3>
      <p>IS207 có quyền cập nhật điều khoản này khi cần. Phiên bản mới được công bố ngay trên website.</p>
      <h3>5. Luật áp dụng</h3>
      <p>Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Mọi tranh chấp sẽ được giải quyết tại toà án có thẩm quyền tại TP.HCM.</p>
    `
  },
};

function openInfoModal(key) {
  selectInfoSection(key || "about");
  openModal(infoModal);
}

function selectInfoSection(key) {
  const data = INFO_PAGES[key] || INFO_PAGES.about;
  if (infoContent) infoContent.innerHTML = data.html;
  document.getElementById("infoModalTitle").innerHTML = `<i class="fas fa-circle-info"></i> ${escapeHtml(data.title)}`;
  if (infoNav) {
    infoNav.querySelectorAll(".info-nav-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-info") === key);
    });
  }
}

/* -------- 12) Chat widget -------- */
const CHAT_RULES = [
  { match: /(ship|giao\s?hàng|vận chuyển|phí ship)/i, reply: "Shop giao toàn quốc qua GHN/GHTK, phí 20.000–30.000đ. <strong>Miễn phí ship</strong> với đơn từ 500.000đ. Giao 1–2 ngày nội thành, 2–5 ngày tỉnh." },
  { match: /(size|kích thước|kích cỡ|còn hàng)/i, reply: "Mỗi sản phẩm có nhiều size từ S đến XXL — chi tiết tồn kho hiển thị ngay trong trang chi tiết khi bạn chọn size 😊" },
  { match: /(đổi trả|đổi hàng|trả hàng|return)/i, reply: "IS207 hỗ trợ <strong>đổi trả trong 7 ngày</strong>. Sản phẩm còn nguyên tem, chưa giặt. Đổi trả miễn phí nếu shop giao sai / lỗi nhà sản xuất." },
  { match: /(bảo hành|warranty)/i, reply: "Bảo hành đường may 30 ngày, vệ sinh sản phẩm lần đầu miễn phí trong 14 ngày tại showroom. Chi tiết xem trong tab Bảo hành ở từng sản phẩm." },
  { match: /(thanh toán|payment|chuyển khoản|momo|zalo|cod)/i, reply: "Shop nhận: <strong>COD</strong> (trả tiền khi nhận), <strong>chuyển khoản VietQR</strong>, <strong>Momo</strong>, <strong>ZaloPay</strong> và <strong>thẻ ngân hàng</strong>. Bạn chọn lúc thanh toán nhé." },
  { match: /(mã giảm giá|coupon|khuyến mãi|voucher|sale)/i, reply: "Bạn có thể thử các mã: <strong>IS207</strong> (giảm 10%), <strong>WELCOME50</strong> (giảm 50k cho khách mới), <strong>FREESHIP</strong> (miễn phí vận chuyển)." },
  { match: /(địa chỉ|showroom|chi nhánh|store)/i, reply: "Showroom IS207: 123 Nguyễn Văn Cừ Q.1 (HCM), 45 Lý Thường Kiệt (HN), 78 Trần Phú (Đà Nẵng)." },
  { match: /(hotline|liên hệ|số điện thoại|contact)/i, reply: "Hotline 1900 1207 (8h–22h hàng ngày) hoặc email support@is207.shop. Bạn cũng có thể nhắn ngay tại hộp chat này 😄" },
  { match: /(xin chào|hello|hi|chào|alo)/i, reply: "Chào bạn! IS207 có thể giúp gì hôm nay? 🌟 Bạn cần tư vấn size, đơn hàng, hay khuyến mãi?" },
  { match: /(cảm ơn|thank|thanks)/i, reply: "Dạ cảm ơn bạn rất nhiều ❤️ Chúc bạn mua sắm vui vẻ tại IS207!" },
];

function chatAppendBot(text) {
  const el = document.createElement("div");
  el.className = "chat-msg chat-msg--bot";
  el.innerHTML = text;
  chatBody.appendChild(el);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function chatAppendUser(text) {
  const el = document.createElement("div");
  el.className = "chat-msg chat-msg--user";
  el.textContent = text;
  chatBody.appendChild(el);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function chatShowTyping() {
  const el = document.createElement("div");
  el.className = "chat-typing";
  el.id = "chatTyping";
  el.innerHTML = "<span></span><span></span><span></span>";
  chatBody.appendChild(el);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function chatHideTyping() {
  const el = document.getElementById("chatTyping");
  if (el) el.remove();
}

function chatRespond(userText) {
  for (const rule of CHAT_RULES) {
    if (rule.match.test(userText)) return rule.reply;
  }
  return `Cảm ơn bạn đã liên hệ IS207! Để được hỗ trợ nhanh nhất, bạn có thể gọi <strong>1900 1207</strong> hoặc email <strong>support@is207.shop</strong>. Nếu cần biết về <em>ship, đổi trả, thanh toán, mã giảm giá</em> — bạn cứ hỏi tiếp nhé.`;
}

function handleChatSubmit(text) {
  const msg = String(text || "").trim();
  if (!msg) return;
  chatAppendUser(msg);
  chatShowTyping();
  setTimeout(() => {
    chatHideTyping();
    chatAppendBot(chatRespond(msg));
  }, 700 + Math.random() * 500);
}

function initChat() {
  if (!chatBody) return;
  chatAppendBot("Xin chào! Mình là trợ lý ảo của IS207 Fashion 🌸 Bạn cần hỗ trợ gì hôm nay?");
  chatAppendBot("Bạn có thể chọn nhanh các câu hỏi bên dưới hoặc gõ tin nhắn nhé.");
}

/* -------- 13) Init -------- */
function setupFilterEvents() {
  if (toggleFilterBtn) {
    toggleFilterBtn.addEventListener("click", () => {
      filterSidebar.classList.toggle("is-hidden");
      const open = !filterSidebar.classList.contains("is-hidden");
      toggleFilterBtn.setAttribute("aria-expanded", String(open));
    });
  }
  if (filterGender) {
    filterGender.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-chip");
      if (!btn) return;
      filterState.gender = btn.getAttribute("data-gender") || "";
      updateFilterChips();
      applyFilterAndRender();
    });
  }
  if (filterSize) {
    filterSize.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-chip[data-size]");
      if (!btn) return;
      const s = btn.getAttribute("data-size");
      if (filterState.sizes.has(s)) filterState.sizes.delete(s);
      else filterState.sizes.add(s);
      updateFilterChips();
      applyFilterAndRender();
    });
  }
  if (filterColor) {
    filterColor.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-chip[data-color]");
      if (!btn) return;
      const c = btn.getAttribute("data-color");
      if (filterState.colors.has(c)) filterState.colors.delete(c);
      else filterState.colors.add(c);
      updateFilterChips();
      applyFilterAndRender();
    });
  }
  function readPriceInputs() {
    const min = filterPriceMin && filterPriceMin.value ? Number(filterPriceMin.value) : null;
    const max = filterPriceMax && filterPriceMax.value ? Number(filterPriceMax.value) : null;
    filterState.priceMin = (Number.isFinite(min) && min >= 0) ? min : null;
    filterState.priceMax = (Number.isFinite(max) && max >= 0) ? max : null;
    applyFilterAndRender();
  }
  if (filterPriceMin) filterPriceMin.addEventListener("change", readPriceInputs);
  if (filterPriceMax) filterPriceMax.addEventListener("change", readPriceInputs);
  pricePresetButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const [lo, hi] = (btn.getAttribute("data-price") || "").split("-");
      filterState.priceMin = lo ? Number(lo) : null;
      filterState.priceMax = hi ? Number(hi) : null;
      if (filterPriceMin) filterPriceMin.value = filterState.priceMin ?? "";
      if (filterPriceMax) filterPriceMax.value = filterState.priceMax ?? "";
      applyFilterAndRender();
    });
  });
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener("click", () => {
      filterState.gender = "";
      filterState.sizes.clear();
      filterState.colors.clear();
      filterState.priceMin = null;
      filterState.priceMax = null;
      if (filterPriceMin) filterPriceMin.value = "";
      if (filterPriceMax) filterPriceMax.value = "";
      updateFilterChips();
      applyFilterAndRender();
    });
  }
}

function initEvents() {
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => setCategory(chip.getAttribute("data-category") || ""));
  });

  searchInput.addEventListener("input", () => {
    currentSearch = searchInput.value;
    applyFilterAndRender();
  });

  sortSelect.addEventListener("change", () => {
    currentSort = sortSelect.value;
    applyFilterAndRender();
  });

  if (heroShopBtn) {
    heroShopBtn.addEventListener("click", () => {
      if (mainContent) mainContent.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  cartToggle.addEventListener("click", openCart);
  cartClose.addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);

  if (wishlistToggle) wishlistToggle.addEventListener("click", openWishlist);
  if (wishlistClose) wishlistClose.addEventListener("click", closeWishlist);
  if (wishlistOverlay) wishlistOverlay.addEventListener("click", closeWishlist);
  if (wishlistViewAllBtn) wishlistViewAllBtn.addEventListener("click", closeWishlist);

  if (userToggle) userToggle.addEventListener("click", () => openAuthModal());
  if (infoToggle) infoToggle.addEventListener("click", () => openInfoModal("about"));

  if (authModalClose) authModalClose.addEventListener("click", () => closeModal(authModal));
  if (productModalClose) productModalClose.addEventListener("click", () => closeModal(productModal));
  if (checkoutClose) checkoutClose.addEventListener("click", closeCheckout);
  if (infoClose) infoClose.addEventListener("click", () => closeModal(infoModal));

  [authModal, productModal, checkoutModal, infoModal].forEach(m => {
    if (m) m.addEventListener("click", (e) => { if (e.target === m) closeModal(m); });
  });

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const u = (loginUsername.value || "").trim();
      const p = (loginPassword.value || "").trim();
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      (async () => {
        try {
          if (!u || !p) { showToast("Vui lòng nhập SĐT/tài khoản và mật khẩu"); return; }
          if (!window.Api || !window.Api.AuthApi) throw new Error("Thiếu Api.AuthApi");
          if (submitBtn) submitBtn.disabled = true;
          const data = await window.Api.AuthApi.login(u, p);
          loginPassword.value = "";
          currentUser = (data && data.user) ? data.user : null;
          if (!currentUser) await refreshMe();
          syncAuthUI();
          closeModal(authModal);
          showToast("Đăng nhập thành công");
        } catch (err) {
          showToast(err && err.message ? err.message : "Đăng nhập thất bại");
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      })();
    });
  }

  if (openRegisterBtn) {
    openRegisterBtn.addEventListener("click", () => {
      showLoginForm();
      resetRegisterAvailability();
      if (registerForm) registerForm.classList.remove("hidden");
      if (loginForm) loginForm.classList.add("hidden");
      setAuthModalTitle("Tạo tài khoản");
    });
  }
  setupRegisterAvailabilityChecks();
  if (backToLoginBtn) backToLoginBtn.addEventListener("click", showLoginForm);

  const openForgotHandler = () => showForgotForm();
  if (openForgotBtn) openForgotBtn.addEventListener("click", openForgotHandler);
  if (openForgotLink) openForgotLink.addEventListener("click", openForgotHandler);
  if (backToLoginFromForgotBtn) backToLoginFromForgotBtn.addEventListener("click", showLoginForm);
  if (fpBackStepBtn) fpBackStepBtn.addEventListener("click", () => {
    if (fpToken) fpToken.value = "";
    if (fpNewPassword) fpNewPassword.value = "";
    showForgotStep(1);
  });

  if (fpCopyTokenBtn) {
    fpCopyTokenBtn.addEventListener("click", async () => {
      const text = (fpTokenDisplay && fpTokenDisplay.value) || (fpToken && fpToken.value) || "";
      if (!text) return;
      try { await navigator.clipboard.writeText(text); showToast("Đã sao chép mã"); }
      catch { showToast("Không sao chép được"); }
    });
  }

  if (forgotForm) {
    forgotForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (forgotStep2 && !forgotStep2.classList.contains("hidden")) return;
      (async () => {
        try {
          const identifier = (fpIdentifier && fpIdentifier.value ? fpIdentifier.value : "").trim();
          if (!identifier) { setFpStatus("Vui lòng nhập tài khoản hoặc số điện thoại.", "error"); return; }
          setForgotSending(true);
          setFpStatus("Đang gửi mã...", "info");
          const res = await window.Api.AuthApi.forgotPassword(identifier);
          const msg = (res && res.message) ? res.message : "Nếu tài khoản tồn tại, mã đã được gửi tới email đăng ký.";
          if (forgotMessage) forgotMessage.textContent = msg;
          const code = res && res.resetToken ? String(res.resetToken).trim() : "";
          if (code) {
            if (fpToken) fpToken.value = code;
            if (fpTokenDisplay) fpTokenDisplay.value = code;
            if (fpTokenBox) fpTokenBox.classList.remove("hidden");
          } else {
            if (fpToken) fpToken.value = "";
            if (fpTokenBox) fpTokenBox.classList.add("hidden");
          }
          showForgotStep(2);
          setFpStatus("");
          showToast(code ? "Mã hiển thị trên màn hình" : "Đã gửi — kiểm tra email");
        } catch (err) {
          const text = err && err.message ? err.message : "Gửi yêu cầu thất bại";
          setFpStatus(text, "error");
        } finally {
          setForgotSending(false);
        }
      })();
    });
  }

  if (fpResetBtn) {
    fpResetBtn.addEventListener("click", () => {
      (async () => {
        try {
          const token = (fpToken && fpToken.value ? fpToken.value : "").trim();
          const newPassword = (fpNewPassword && fpNewPassword.value ? fpNewPassword.value : "").trim();
          if (!token) { showToast("Vui lòng nhập mã đặt lại"); return; }
          if (newPassword.length < 6) { showToast("Mật khẩu mới phải ≥ 6 ký tự"); return; }
          const res = await window.Api.AuthApi.resetPassword(token, newPassword);
          showToast(res && res.message ? res.message : "Đã đổi mật khẩu");
          showLoginForm();
        } catch (err) {
          showToast(err && err.message ? err.message : "Đổi mật khẩu thất bại");
        }
      })();
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      (async () => {
        try {
          const conflict = await ensureRegisterFieldsAvailable();
          if (conflict) { showToast(conflict); return; }
          const payload = {
            username: (rgUsername.value || "").trim(),
            password: (rgPassword.value || "").trim(),
            fullName: (rgFullName.value || "").trim(),
            phone: (rgPhone.value || "").trim(),
            email: (rgEmail.value || "").trim(),
            address: (rgAddress.value || "").trim(),
          };
          await window.Api.AuthApi.register(payload);
          if (rgPassword) rgPassword.value = "";
          await refreshMe();
          syncAuthUI();
          showToast("Đăng ký thành công");
        } catch (err) {
          showToast(err && err.message ? err.message : "Đăng ký thất bại");
        }
      })();
    });
  }

  if (profileForm) {
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      (async () => {
        try {
          await window.Api.AuthApi.updateMe({
            fullName: (pfFullName.value || "").trim(),
            phone: (pfPhone.value || "").trim(),
            email: (pfEmail.value || "").trim(),
            address: (pfAddress.value || "").trim(),
          });
          await refreshMe();
          syncAuthUI();
          showToast("Đã lưu thông tin cá nhân");
        } catch (err) {
          showToast(err && err.message ? err.message : "Lưu thất bại");
        }
      })();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      (async () => {
        try { if (window.Api && window.Api.AuthApi) await window.Api.AuthApi.logout(); }
        finally {
          currentUser = null;
          syncAuthUI();
          showToast("Đã đăng xuất");
          closeModal(authModal);
        }
      })();
    });
  }

  if (pdAddToCartBtn) {
    pdAddToCartBtn.addEventListener("click", () => {
      if (selectedProductId == null) return;
      addToCart(selectedProductId, pdSize.value, pdColor.value);
      closeModal(productModal);
    });
  }
  if (pdWishlistBtn) {
    pdWishlistBtn.addEventListener("click", () => {
      if (selectedProductId == null) return;
      toggleWishlist(selectedProductId);
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      closeCart();
      if (!ensureLoggedIn()) return;
      openCheckout();
    });
  }
  if (applyCouponBtn) applyCouponBtn.addEventListener("click", applyCoupon);
  if (couponInput) {
    couponInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); applyCoupon(); }
    });
  }
  document.querySelectorAll('input[name="payment"]').forEach(r => {
    r.addEventListener("change", renderCheckoutSummary);
  });
  if (ckPlaceOrderBtn) ckPlaceOrderBtn.addEventListener("click", placeOrder);

  if (infoNav) {
    infoNav.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-info]");
      if (btn) selectInfoSection(btn.getAttribute("data-info"));
    });
  }

  if (chatLauncher) chatLauncher.addEventListener("click", () => {
    chatPanel.classList.toggle("show");
    chatPanel.setAttribute("aria-hidden", chatPanel.classList.contains("show") ? "false" : "true");
    if (chatPanel.classList.contains("show") && chatInput) chatInput.focus();
  });
  if (chatClose) chatClose.addEventListener("click", () => {
    chatPanel.classList.remove("show");
    chatPanel.setAttribute("aria-hidden", "true");
  });
  if (chatForm) chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const t = chatInput.value;
    chatInput.value = "";
    handleChatSubmit(t);
  });
  if (chatQuick) chatQuick.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-quick]");
    if (!btn) return;
    handleChatSubmit(btn.getAttribute("data-quick"));
  });

  if (promoPrev) promoPrev.addEventListener("click", () => { goPromoSlide(promoIdx - 1); startPromoAuto(); });
  if (promoNext) promoNext.addEventListener("click", () => { goPromoSlide(promoIdx + 1); startPromoAuto(); });

  setupFilterEvents();
  setupProductTabs();
}

document.addEventListener("DOMContentLoaded", () => {
  (async () => {
    try {
      PRODUCTS = await loadProducts();
    } catch (e) {
      PRODUCTS = [];
      console.error(e);
      showToast("Không tải được sản phẩm (chưa có backend?)");
    }
    deriveProductSets();
    await refreshMe();
    fixCartImages();
    saveWishlist(); // updates badge count
    renderFilterOptions();
    renderHomeShowcases();
    applyFilterAndRender();
    renderCart();
    renderPromoCarousel();
    startPromoAuto();
    tickFlashCountdown();
    setInterval(tickFlashCountdown, 1000);
    initChat();
    initEvents();
    syncAuthUI();
  })();
});
