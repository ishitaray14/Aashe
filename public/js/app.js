/* ===== AASHE - CORE APP JS ===== */
/* Real API-based auth. JWT stored in localStorage. */

const API_BASE = '/api';

// ─── API HELPER ──────────────────────────────────────────────────────────────
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('aashe_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// ─── AUTH FUNCTIONS ───────────────────────────────────────────────────────────
async function apiLogin(email, password) {
  return await apiCall('/auth/login', 'POST', { email, password });
}

async function apiRegister(userData) {
  return await apiCall('/auth/register', 'POST', userData);
}

async function apiGetMe() {
  return await apiCall('/auth/me', 'GET');
}

function saveSession(token, user) {
  localStorage.setItem('aashe_token', token);
  localStorage.setItem('aashe_user', JSON.stringify(user));
}

function getSession() {
  const user = localStorage.getItem('aashe_user');
  return user ? JSON.parse(user) : null;
}

function clearSession() {
  localStorage.removeItem('aashe_token');
  localStorage.removeItem('aashe_user');
}

async function requireAuth(expectedRole) {
  const token = localStorage.getItem('aashe_token');
  if (!token) {
    window.location.href = '/pages/login.html';
    return null;
  }
  try {
    const { ok, data } = await apiGetMe();
    if (!ok || !data.user) {
      clearSession();
      window.location.href = '/pages/login.html';
      return null;
    }
    // Save fresh user data
    localStorage.setItem('aashe_user', JSON.stringify(data.user));

    if (expectedRole && data.user.role !== expectedRole) {
      window.location.href = getDashboardPath(data.user.role);
      return null;
    }
    return data.user;
  } catch {
    clearSession();
    window.location.href = '/pages/login.html';
    return null;
  }
}

function getDashboardPath(role) {
  const map = {
    user: '/pages/user-dashboard.html',
    ngo: '/pages/ngo-dashboard.html',
    volunteer: '/pages/volunteer-dashboard.html'
  };
  return map[role] || '/pages/login.html';
}

// ─── MOCK DONATION DATA (frontend only - prototype) ───────────────────────────
async function apiGetDonations() {
  return await apiCall('/donations', 'GET');
}

async function apiCreateDonation(data) {
  return await apiCall('/donations', 'POST', data);
}

async function apiUpdateDonationStatus(id, data) {
  return await apiCall(`/donations/${id}/status`, 'PATCH', data);
}

async function apiGetVolunteers() {
  return await apiCall('/volunteers', 'GET');
}

async function apiUpdateVolunteerStatus(status) {
  return await apiCall('/volunteers/status', 'PATCH', { status });
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', info: '💬', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span style="font-size:1.1rem">${icons[type]}</span><span style="font-size:0.85rem;color:var(--text-primary)">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
  }
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
  }
}

// ─── CHART HELPERS ────────────────────────────────────────────────────────────
function drawDonut(canvasId, data, total) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;
  const r = Math.min(cx, cy) - 16;
  const innerR = r * 0.58;
  let startAngle = -Math.PI / 2;

  ctx.clearRect(0, 0, w, h);
  data.forEach(seg => {
    const angle = (seg.pct / 100) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + angle);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    startAngle += angle;
  });
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
  ctx.fillStyle = '#0a0a0f';
  ctx.fill();
}

function animateCounter(el, target, duration = 1800) {
  let start = 0;
  const step = Math.ceil(target / (duration / 16));
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { start = target; clearInterval(timer); }
    el.textContent = start.toLocaleString();
  }, 16);
}

// ─── EXPORT TO WINDOW ────────────────────────────────────────────────────────
window.AASHE = {
  apiLogin, apiRegister, apiGetMe,
  saveSession, getSession, clearSession, requireAuth, getDashboardPath,
  apiGetDonations, apiCreateDonation, apiUpdateDonationStatus, apiGetVolunteers, apiUpdateVolunteerStatus,
  showToast, initNavbar, drawDonut, animateCounter
};
