const API = "";
const REGIONS = ["Tashkent", "Samarqand", "Andijon", "Bukhara", "Others"];

function getTelegramId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("telegram_id") || "";
}

function getFullName() {
  const params = new URLSearchParams(window.location.search);
  return params.get("full_name") || "";
}

function getAuthToken() {
  return localStorage.getItem("lf_token") || "";
}

function setAuthToken(token) {
  localStorage.setItem("lf_token", token);
}

function clearAuth() {
  localStorage.removeItem("lf_token");
  localStorage.removeItem("lf_user");
}

function getUserInfo() {
  const raw = localStorage.getItem("lf_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setUserInfo(info) {
  localStorage.setItem("lf_user", JSON.stringify(info));
}

function authHeaders(extra = {}) {
  const token = getAuthToken();
  if (!token) return extra;
  return { ...extra, Authorization: `Bearer ${token}` };
}

function linkWithQuery(path) {
  const telegram_id = getTelegramId();
  const full_name = getFullName();
  const q = new URLSearchParams();
  if (telegram_id) q.set("telegram_id", telegram_id);
  if (full_name) q.set("full_name", full_name);
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

function setupNavLinks() {
  document.querySelectorAll("[data-nav]").forEach((a) => {
    a.href = linkWithQuery(a.getAttribute("data-nav"));
  });
}

function setupActiveNav() {
  const current = window.location.pathname;
  document.querySelectorAll("[data-nav]").forEach((a) => {
    if (a.getAttribute("data-nav") === current) a.classList.add("active-link");
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (!e.altKey) return;
    const map = { "1": "/", "2": "/create", "3": "/my", "4": "/admin/login" };
    const path = map[e.key];
    if (!path) return;
    window.location.href = linkWithQuery(path);
  });
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Request failed");
  return data;
}

function fillRegionSelect(selectEl, withAll = false) {
  if (withAll) {
    const all = document.createElement("option");
    all.value = "";
    all.textContent = "Barcha hududlar";
    selectEl.appendChild(all);
  }
  REGIONS.forEach((region) => {
    const opt = document.createElement("option");
    opt.value = region;
    opt.textContent = region;
    selectEl.appendChild(opt);
  });
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

function setupThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const saved = localStorage.getItem("lf_theme");
  if (saved === "dark") {
    document.body.classList.add("dark");
    btn.textContent = "☀️";
  }
  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("lf_theme", isDark ? "dark" : "light");
    btn.textContent = isDark ? "☀️" : "🌙";
  });
}

function setupBaseUI() {
  setupNavLinks();
  setupActiveNav();
  setupThemeToggle();
  setupKeyboardShortcuts();
}

function requireAuth(redirect = "/login") {
  if (!getAuthToken()) {
    window.location.href = linkWithQuery(redirect);
    return false;
  }
  return true;
}
