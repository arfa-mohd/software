// ========================================================
//  AuraCare Nexus — Main Application Controller v3.0
//  Biopunk Glassmorphism Dark UI
// ========================================================

// Dynamic Render Backend API Resolver for Hostinger Deployment (arfanova.in)
window.RENDER_BACKEND_URL = window.RENDER_BACKEND_URL || "https://software-1-4vsx.onrender.com";

(function() {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      if (typeof url === 'string' && url.startsWith('/api')) {
        const backendBase = (window.RENDER_BACKEND_URL || '').replace(/\/$/, '');
        url = backendBase + url;
      }
      return originalFetch(url, options);
    };
  }
})();

let currentRole = "Admin";
let activeDocId = null;

// ========================================================
//  TOAST NOTIFICATION SYSTEM
// ========================================================
function showToast(title, msg, type = 'success', duration = 4000) {
  // Toast notifications disabled per user request
  return;
}

function removeToast(toast) {
  return;
}

// ========================================================
//  LIVE CLOCK
// ========================================================
function startLiveClock() {
  const clockEl = document.getElementById('clockTime');
  const sidebarEl = document.getElementById('sidebarDateTime');
  
  function tick() {
    const now = new Date();
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    const m = now.getMinutes().toString().padStart(2, '0');
    const s = now.getSeconds().toString().padStart(2, '0');
    if (clockEl) clockEl.textContent = `${hours}:${m}:${s} ${ampm}`;
    
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const dateStr = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    if (sidebarEl) sidebarEl.textContent = dateStr;
  }
  tick();
  setInterval(tick, 1000);
}

// ========================================================
//  MOBILE SIDEBAR TOGGLE
// ========================================================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebarEl');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar) return;
  if (sidebar.style.display === 'none') {
    sidebar.style.display = 'flex';
  } else {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebarEl');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

// ========================================================
//  COMMAND PALETTE
// ========================================================
const cmdPages = [
  { label: 'Dashboard', sub: 'Hospital Intelligence Overview', icon: 'fas fa-th-large', view: 'dashboard' },
  { label: 'WhatsApp Patients', sub: 'View WhatsApp bookings', icon: 'fab fa-whatsapp', view: 'whatsapp' },
  { label: 'OPD Reservations', sub: 'Queue Board & Appointments', icon: 'fas fa-calendar-alt', view: 'queue' },
  { label: 'E-Prescriptions', sub: 'Issue digital prescriptions', icon: 'fas fa-file-prescription', view: 'prescriptions' },
  { label: 'Patient EMR', sub: 'Electronic medical records', icon: 'fas fa-users', view: 'patients' },
  { label: 'Lab Diagnostics', sub: 'Pathology & test reports', icon: 'fas fa-flask', view: 'lab' },
  { label: 'Pharmacy Stock', sub: 'Inventory & dispensing', icon: 'fas fa-pills', view: 'pharmacy' },
  { label: 'Financials', sub: 'Payments & revenue log', icon: 'fas fa-wallet', view: 'payments' },
  { label: 'Theme Settings', sub: 'Customize dashboard design', icon: 'fas fa-sliders', view: 'settings' },
  { label: 'Add New Appointment', sub: 'Manually schedule an OPD slot', icon: 'fas fa-calendar-plus', action: () => openAddBookingModal() },
  { label: 'Issue E-Prescription', sub: 'Create digital prescription', icon: 'fas fa-signature', action: () => { switchView('prescriptions'); setTimeout(openAddPrescriptionModal, 300); } },
  { label: 'Accept Payment', sub: 'Process patient payment', icon: 'fas fa-cash-register', view: 'payments' },
];

let cmdFocusIdx = -1;
let filteredCmdItems = [...cmdPages];

function openCmdPalette() {
  const overlay = document.getElementById('cmd-palette-overlay');
  if (!overlay) return;
  overlay.classList.add('active');
  setTimeout(() => {
    const inp = document.getElementById('cmd-search-input');
    if (inp) { inp.value = ''; inp.focus(); }
    filterCmdResults('');
  }, 50);
  cmdFocusIdx = -1;
}

function closeCmdPalette(e) {
  if (e && e.target !== document.getElementById('cmd-palette-overlay')) return;
  const overlay = document.getElementById('cmd-palette-overlay');
  if (overlay) overlay.classList.remove('active');
}

function closeCmdPaletteForce() {
  const overlay = document.getElementById('cmd-palette-overlay');
  if (overlay) overlay.classList.remove('active');
}

function filterCmdResults(query) {
  const container = document.getElementById('cmd-results');
  if (!container) return;

  filteredCmdItems = cmdPages.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.sub.toLowerCase().includes(query.toLowerCase())
  );

  cmdFocusIdx = -1;

  container.innerHTML = filteredCmdItems.length === 0
    ? `<div style="text-align:center; padding:24px; color:var(--text-muted); font-family:var(--font-mono); font-size:13px;">No results for "${query}"</div>`
    : filteredCmdItems.map((item, i) => `
      <div class="cmd-result-item" data-idx="${i}" onclick="executeCmdItem(${i})">
        <div class="cmd-result-icon"><i class="${item.icon}"></i></div>
        <div>
          <div class="cmd-result-text">${item.label}</div>
          <div class="cmd-result-sub">${item.sub}</div>
        </div>
      </div>
    `).join('');
}

function handleCmdKeyNav(e) {
  const items = document.querySelectorAll('.cmd-result-item');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    cmdFocusIdx = Math.min(cmdFocusIdx + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    cmdFocusIdx = Math.max(cmdFocusIdx - 1, 0);
  } else if (e.key === 'Enter') {
    if (cmdFocusIdx >= 0) executeCmdItem(cmdFocusIdx);
    return;
  } else if (e.key === 'Escape') {
    closeCmdPaletteForce();
    return;
  }
  items.forEach((el, i) => el.classList.toggle('focused', i === cmdFocusIdx));
  if (items[cmdFocusIdx]) items[cmdFocusIdx].scrollIntoView({ block: 'nearest' });
}

function executeCmdItem(idx) {
  const item = filteredCmdItems[idx];
  if (!item) return;
  closeCmdPaletteForce();
  if (item.action) {
    setTimeout(item.action, 100);
  } else if (item.view) {
    switchView(item.view);
  }
}

// ========================================================
//  KEYBOARD SHORTCUTS
// ========================================================
document.addEventListener('keydown', (e) => {
  // Ctrl+K → Command Palette
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    openCmdPalette();
    return;
  }
  // ESC → Close all overlays
  if (e.key === 'Escape') {
    closeCmdPaletteForce();
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    closeNotificationDropdown();
    return;
  }
  // Alt+1~8 → Navigate views
  if (e.altKey && !e.ctrlKey) {
    const viewMap = { '1': 'dashboard', '2': 'whatsapp', '3': 'queue', '4': 'prescriptions', '5': 'patients', '6': 'lab', '7': 'pharmacy', '8': 'payments' };
    if (viewMap[e.key]) {
      e.preventDefault();
      switchView(viewMap[e.key]);
    }
  }
});

// ========================================================
//  SMOOTH KPI COUNTER ANIMATION
// ========================================================
function animateCounter(el, target, prefix = '', suffix = '') {
  if (!el) return;
  const duration = 800;
  const start = performance.now();
  const isNumber = typeof target === 'number';
  
  if (!isNumber) {
    el.textContent = prefix + target + suffix;
    return;
  }

  function update(time) {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(eased * target);
    el.textContent = prefix + current.toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ========================================================
//  UNIVERSAL PAGINATION SYSTEM (MAX 25 ITEMS PER PAGE)
// ========================================================
const PAGE_SIZE = 25;
const currentPageState = {
  queue: 1,
  prescriptions: 1,
  patients: 1,
  lab: 1,
  pharmacy: 1,
  payments: 1,
  whatsapp: 1
};

let allQueueDataCache = [];
let allPatientsDataCache = [];
let currentPrescriptionsFiltered = [];
let currentLabFiltered = [];
let currentPharmacyFiltered = [];
let currentPaymentsFiltered = [];
let currentWhatsAppFiltered = [];

function getPaginatedItems(items, page = 1, pageSize = PAGE_SIZE) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const sliced = list.slice(startIdx, endIdx);
  return {
    items: sliced,
    page: currentPage,
    totalPages: totalPages,
    totalItems: total,
    startIdx: total > 0 ? startIdx + 1 : 0,
    endIdx: Math.min(endIdx, total)
  };
}

function renderPaginationFooter(targetId, pageInfo, onPageChangeFnName) {
  let footerEl = document.getElementById(`pagination-${targetId}`);
  const target = document.getElementById(targetId);
  if (!target) return;

  if (!footerEl) {
    let parent = target.closest('.table-responsive') || target.closest('.card-box') || target.parentElement;
    if (parent) {
      footerEl = document.createElement('div');
      footerEl.id = `pagination-${targetId}`;
      footerEl.className = 'pagination-controls-wrapper';
      parent.appendChild(footerEl);
    } else {
      return;
    }
  }

  if (!pageInfo || pageInfo.totalItems === 0) {
    footerEl.innerHTML = '';
    return;
  }

  footerEl.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; margin-top:12px; background:var(--bg-card-subtle, #f8fafc); border:1px solid var(--border-color, #e2e8f0); border-radius:8px; font-size:12px; color:var(--text-muted, #64748b);">
      <div>
        <strong style="color:var(--text-dark, #0f172a);">Max 25 per page</strong>
      </div>
      <div style="display:flex; gap:6px; align-items:center;">
        <button class="btn-secondary" style="padding:4px 10px; font-size:11px; border-radius:6px; cursor:${pageInfo.page <= 1 ? 'not-allowed' : 'pointer'}; opacity:${pageInfo.page <= 1 ? 0.5 : 1};" ${pageInfo.page <= 1 ? 'disabled' : ''} onclick="${onPageChangeFnName}(${pageInfo.page - 1})">
          <i class="fas fa-chevron-left"></i> Prev
        </button>
        <span style="font-weight:600; padding:0 8px; color:var(--text-dark, #0f172a);">Page ${pageInfo.page} of ${pageInfo.totalPages}</span>
        <button class="btn-secondary" style="padding:4px 10px; font-size:11px; border-radius:6px; cursor:${pageInfo.page >= pageInfo.totalPages ? 'not-allowed' : 'pointer'}; opacity:${pageInfo.page >= pageInfo.totalPages ? 0.5 : 1};" ${pageInfo.page >= pageInfo.totalPages ? 'disabled' : ''} onclick="${onPageChangeFnName}(${pageInfo.page + 1})">
          Next <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  `;
}

// ========================================================
//  MAIN APP INIT
// ========================================================
let appPages = []; // Global variable to store pages/modules config
let dynamicDataCache = {}; // Cache to store dynamic table rows

async function loadSidebarMenu() {
  try {
    const res = await fetch("/api/super-admin/pages");
    appPages = await res.json();
  } catch (e) {
    console.error("Failed to fetch custom pages, using fallback defaults", e);
    appPages = [
      { key: 'dashboard', title: 'Dashboard', subtitle: 'Hospital Intelligence Overview', icon: 'fas fa-th-large', is_custom: 0, is_visible: 1 },
      { key: 'whatsapp', title: 'WhatsApp Patients', subtitle: 'WhatsApp-Booked Patient Queue', icon: 'fab fa-whatsapp', is_custom: 0, is_visible: 1 },
      { key: 'wa_broadcast', title: 'WhatsApp Campaign', subtitle: 'Bulk Auto Share Poster & Video Campaign', icon: 'fas fa-bullhorn', is_custom: 0, is_visible: 1 },
      { key: 'queue', title: 'OPD Reservations', subtitle: 'Live OPD Queue Board & Appointments', icon: 'fas fa-calendar-alt', is_custom: 0, is_visible: 1 },
      { key: 'prescriptions', title: 'E-Prescriptions', subtitle: 'Digital Prescription Log', icon: 'fas fa-file-prescription', is_custom: 0, is_visible: 1 },
      { key: 'patients', title: 'Patient EMR', subtitle: 'Electronic Medical Records', icon: 'fas fa-users', is_custom: 0, is_visible: 1 },
      { key: 'patient_docs', title: 'Patient Documents', subtitle: 'Patient Document Cabinet & File Locker', icon: 'fas fa-folder-open', is_custom: 0, is_visible: 1 },
      { key: 'lab', title: 'Lab Diagnostics', subtitle: 'Pathology & Diagnostic Reports', icon: 'fas fa-flask', is_custom: 0, is_visible: 1 },
      { key: 'pharmacy', title: 'Inventory Stock', subtitle: 'Inventory & Dispensing Control', icon: 'fas fa-pills', is_custom: 0, is_visible: 1 },
      { key: 'payments', title: 'Financials', subtitle: 'Revenue, Gateways & Financial Log', icon: 'fas fa-wallet', is_custom: 0, is_visible: 1 },
      { key: 'settings', title: 'System Settings', subtitle: 'Customize Dashboard Design & Colors', icon: 'fas fa-sliders-h', is_custom: 0, is_visible: 1 }
    ];
  }

  const navMenu = document.querySelector(".nav-menu");
  if (!navMenu) return;

  let html = "";
  const visiblePages = appPages.filter(p => p.is_visible === 1);
  const builtInPages = visiblePages.filter(p => p.is_custom === 0);
  const customPages = visiblePages.filter(p => p.is_custom === 1);

  html += `<div class="nav-section-title">Overview</div>`;
  builtInPages.forEach(p => {
    if (p.key === 'settings') return; // settings goes under management
    
    let shortcut = "";
    if (p.key === 'dashboard') shortcut = `<span class="nav-shortcut">Alt+1</span>`;
    else if (p.key === 'whatsapp') shortcut = `<span class="nav-shortcut">Alt+2</span>`;
    else if (p.key === 'queue') shortcut = `<span class="nav-shortcut">Alt+3</span>`;
    else if (p.key === 'prescriptions') shortcut = `<span class="nav-shortcut">Alt+4</span>`;
    else if (p.key === 'patients') shortcut = `<span class="nav-shortcut">Alt+5</span>`;
    else if (p.key === 'lab') shortcut = `<span class="nav-shortcut">Alt+6</span>`;
    else if (p.key === 'pharmacy') shortcut = `<span class="nav-shortcut">Alt+7</span>`;
    else if (p.key === 'payments') shortcut = `<span class="nav-shortcut">Alt+8</span>`;
    
    let badge = "";
    if (p.key === 'whatsapp') {
      badge = `<span class="nav-badge" id="whatsappNavBadge" style="display:none;">0</span>`;
    }

    html += `
      <a class="nav-item" id="nav-${p.key}" onclick="switchView('${p.key}')">
        <i class="${p.icon}"></i>
        ${p.title}
        ${shortcut}
        ${badge}
      </a>
    `;
  });

  if (customPages.length > 0) {
    html += `<div class="nav-section-title">Custom Modules</div>`;
    customPages.forEach(p => {
      if (p.key === 'pos_billing') {
        html += `
          <a class="nav-item" id="nav-pos_billing" onclick="switchView('pos_billing')">
            <i class="${p.icon || 'fas fa-cash-register'}"></i>
            ${p.title}
          </a>
        `;
      } else {
        html += `
          <a class="nav-item" id="nav-${p.key}" href="/static/custom-page.html?page=${p.key}">
            <i class="${p.icon}"></i>
            ${p.title}
          </a>
        `;
      }
    });
  }

  html += `<div class="nav-section-title" id="sec-management">Management</div>`;
  const settingsPage = visiblePages.find(p => p.key === 'settings');
  if (settingsPage) {
    html += `
      <a class="nav-item" id="nav-settings" onclick="switchView('settings')">
        <i class="${settingsPage.icon}"></i>
        ${settingsPage.title}
      </a>
    `;
  }

  navMenu.innerHTML = html;
  
  const savedView = localStorage.getItem('auracare_active_view') || 'dashboard';
  const activeNav = document.getElementById(`nav-${savedView}`);
  if (activeNav) activeNav.classList.add("active");
}

async function loadAppBrandingSettings() {
  try {
    const res = await fetch("/api/super-admin/settings");
    if (!res.ok) return;
    const settings = await res.json();
    
    if (settings.software_name) {
      document.title = `${settings.software_name} — Hospital CRM UI`;
    }
    const sidebarLogo = document.getElementById("sidebar-logo");
    if (sidebarLogo) {
      sidebarLogo.onerror = function() {
        this.onerror = null;
        this.src = "./logo.jpg";
      };
      if (settings.software_logo && typeof settings.software_logo === 'string' && settings.software_logo.trim() !== "" && !settings.software_logo.includes("localhost") && !settings.software_logo.includes("127.0.0.1")) {
        let logoUrl = settings.software_logo;
        if (logoUrl.startsWith('/static/')) {
          logoUrl = logoUrl.replace('/static/', './');
        }
        sidebarLogo.src = logoUrl;
      }
    }
    const sidebarTitle = document.getElementById("sidebar-title");
    if (sidebarTitle) {
      sidebarTitle.innerText = "";
    }
    const loginLogo = document.getElementById("login-logo");
    if (loginLogo) {
      loginLogo.onerror = function() {
        this.onerror = null;
        this.src = "./logo.jpg";
      };
      if (settings.software_logo && typeof settings.software_logo === 'string' && settings.software_logo.trim() !== "" && !settings.software_logo.includes("localhost") && !settings.software_logo.includes("127.0.0.1")) {
        let logoUrl = settings.software_logo;
        if (logoUrl.startsWith('/static/')) {
          logoUrl = logoUrl.replace('/static/', './');
        }
        loginLogo.src = logoUrl;
      }
    }
    const loginName = document.getElementById("login-brand-name");
    if (loginName) {
      loginName.innerText = "Arfa Nova Technology";
    }
    const loginSubtitle = document.getElementById("login-brand-subtitle");
    if (loginSubtitle && settings.software_subtitle) {
      loginSubtitle.innerText = settings.software_subtitle;
    }
  } catch (err) {
    console.error("Failed to load custom white-label branding settings:", err);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  startLiveClock();
  initTheme();
  
  try {
    await loadAppBrandingSettings();
  } catch (e) {
    console.warn("Branding load notice:", e);
  }

  try {
    await loadSidebarMenu();
  } catch (e) {
    console.warn("Sidebar menu load notice:", e);
  }
  
  const hashView = window.location.hash ? window.location.hash.replace('#', '') : null;
  const savedView = hashView || localStorage.getItem('auracare_active_view') || 'dashboard';
  switchView(savedView);
  
  try { initDashboardCharts(); } catch(e){}
  try { loadKpis(); } catch(e){}
  try { loadDashboardTasks(); } catch(e){}
  try { selectLoginRole('DOCTOR', document.getElementById('loginRoleDoctor')); } catch(e){}
  try { loadDoctorsList(); } catch(e){}
  try { loadQueueData(); } catch(e){}
  try { loadBedsData(); } catch(e){}
  try { loadPrescriptionsList(); } catch(e){}
  try { loadLabData(); } catch(e){}
  try { loadPharmacyData(); } catch(e){}
  try { loadPaymentsData(); } catch(e){}
  try { loadPatientsList(); } catch(e){}
  try { initNotificationEngine(); } catch(e){}
  try { initDateFilters(); } catch(e){}
  try { initPosBilling(); } catch(e){}
});

// View Navigation Switcher
function switchView(viewId) {
  if (!viewId) return;
  
  // Clean active nav link selection highlight
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
  const targetNav = document.getElementById(`nav-${viewId}`);
  if (targetNav) targetNav.classList.add("active");

  const page = appPages.find(p => p.key === viewId);
  
  // If it's a dynamic custom module, generate and load its CRUD layout first
  if (page && page.is_custom === 1) {
    generateDynamicCrudView(page);
    loadDynamicTableData(viewId);
  }

  localStorage.setItem('auracare_active_view', viewId);
  if (window.location.hash !== '#' + viewId) {
    history.replaceState(null, '', '#' + viewId);
  }

  const syncStyle = document.getElementById('view-sync-style');
  if (syncStyle) syncStyle.textContent = '';

  document.querySelectorAll(".view-section").forEach(sec => sec.classList.remove("active"));
  const targetSec = document.getElementById(`view-${viewId}`);
  if (targetSec) targetSec.classList.add("active");

  if (viewId === 'wa_broadcast' && typeof loadWhatsAppCampaignAudience === 'function') {
    setTimeout(loadWhatsAppCampaignAudience, 50);
  }

  const titleEl = document.getElementById("currentPageTitle");
  const subEl = document.getElementById("currentPageSubtitle");
  if (titleEl) {
    const titles = {
      'dashboard': 'Dashboard',
      'whatsapp': 'WhatsApp Patients',
      'wa_broadcast': 'WhatsApp Campaign Studio',
      'triage': 'AI Symptom Triage',
      'queue': 'OPD Reservations',
      'patients': 'Patient EMR',
      'patient_docs': 'Patient Documents',
      'prescriptions': 'E-Prescriptions',
      'edit-prescription': 'Edit E-Prescription',
      'issue-prescription': 'Issue Digital E-Prescription',
      'lab': 'Lab Diagnostics',
      'pharmacy': 'Pharmacy Stock',
      'settings': 'Theme Settings',
      'pos_billing': 'Point of Sale Billing & Invoices',
      'payments': 'Financials',
      'admin': 'Admin & Staff Management'
    };
    const subtitles = {
      'dashboard': 'Hospital Intelligence Overview',
      'whatsapp': 'WhatsApp-Booked Patient Queue',
      'wa_broadcast': 'Auto Share Poster & Video Advertisement to All OPD & WhatsApp Clients',
      'triage': 'AI Risk Assessment & Symptom Analysis',
      'queue': 'Live OPD Queue Board & Appointments',
      'patients': 'Electronic Medical Records',
      'prescriptions': 'Digital Prescription Log',
      'edit-prescription': 'Modify Digital Prescription Details',
      'issue-prescription': 'Create & Sign New E-Prescription',
      'lab': 'Pathology & Diagnostic Reports',
      'pharmacy': 'Inventory & Dispensing Control',
      'settings': 'Customize Dashboard Design & Colors',
      'pos_billing': 'Point of Sale Counter Billing, Quick Medicine & Service Invoice Generator',
      'payments': 'Revenue, Gateways & Financial Log',
      'admin': 'Manage staff, doctors, roles, user accounts, activity logs, attendance & security'
    };
    
    let titleStr = titles[viewId] || 'Dashboard';
    let subtitleStr = subtitles[viewId] || '';
    if (page) {
      titleStr = page.title;
      subtitleStr = page.subtitle;
    }
    titleEl.innerText = titleStr;
    if (subEl) subEl.innerText = subtitleStr;
  }

  closeSidebar();

  if (viewId === 'dashboard') {
    if (typeof initDashboardCharts === 'function') initDashboardCharts();
    if (typeof loadKpis === 'function') loadKpis();
  } else if (viewId === 'whatsapp') {
    if (typeof loadWhatsAppBookedPatients === 'function') loadWhatsAppBookedPatients();
  } else if (viewId === 'wa_broadcast') {
    if (typeof loadWhatsAppCampaignAudience === 'function') loadWhatsAppCampaignAudience();
  } else if (viewId === 'queue') {
    if (typeof loadQueueData === 'function') loadQueueData();
  } else if (viewId === 'patients') {
    if (typeof loadPatientsList === 'function') loadPatientsList();
  } else if (viewId === 'prescriptions') {
    if (typeof loadPrescriptionsList === 'function') loadPrescriptionsList();
  } else if (viewId === 'lab') {
    if (typeof loadLabData === 'function') loadLabData();
  } else if (viewId === 'pharmacy') {
    if (typeof loadPharmacyData === 'function') loadPharmacyData();
  } else if (viewId === 'payments') {
    if (typeof loadPaymentsData === 'function') loadPaymentsData();
  } else if (viewId === 'settings') {
    if (typeof loadSavedSettingsControls === 'function') loadSavedSettingsControls();
  } else if (viewId === 'patient_docs') {
    if (typeof loadPatientFolders === 'function') loadPatientFolders();
  }
}

// --- Dynamic Custom Module CRUD UI Builders & Helpers ---
function generateDynamicCrudView(page) {
  const container = document.querySelector(".view-container");
  if (!container) return;

  const sectionId = `view-${page.key}`;
  let section = document.getElementById(sectionId);
  if (section) return; // Already rendered

  section = document.createElement("section");
  section.id = sectionId;
  section.className = "view-section";

  const columns = JSON.parse(page.columns_json);
  
  section.innerHTML = `
    <div class="card-box" style="margin-bottom:24px; border-left: 4px solid var(--primary-lime, #00d4aa);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <h2 style="color:var(--text-dark); margin:0; display:flex; align-items:center; gap:10px;">
            <i class="${page.icon}" style="color:var(--neon-teal, #00d4aa);"></i> <span id="dyn-title-${page.key}">${page.title}</span>
          </h2>
          <p style="color:var(--text-muted); margin-top:4px; font-size:13px;">${page.subtitle}</p>
        </div>
        <div>
          <button class="btn btn-primary" onclick="openDynamicAddModal('${page.key}')">
            <i class="fas fa-plus-circle"></i> Add Record
          </button>
        </div>
      </div>
    </div>

    <!-- Data Table Card -->
    <div class="card-box">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
        <h3 style="color:var(--text-dark); font-size:15px; margin:0;">Operational Database Records</h3>
        <div style="position:relative;">
          <i class="fas fa-search" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); font-size:11px; color:var(--text-muted);"></i>
          <input type="text" onkeyup="filterDynamicTable('${page.key}', this.value)" class="form-control" placeholder="Search record..." style="padding-left:30px; font-size:12px; width:200px; height:34px; border-radius:6px;">
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table class="custom-table" id="dyn-table-${page.key}">
          <thead>
            <tr>
              <th># ID</th>
              ${columns.map(col => `<th>${col}</th>`).join('')}
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody id="dyn-tbody-${page.key}">
            <tr>
              <td colspan="${columns.length + 2}" style="text-align:center; padding:30px; color:var(--text-muted);">
                <i class="fas fa-spinner fa-spin" style="font-size:20px; margin-bottom:8px; display:block;"></i>
                Loading dynamic database records...
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Dynamic Modal Overlay -->
    <div class="modal-overlay" id="dyn-modal-${page.key}">
      <div class="modal-box">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h3 style="color:var(--text-dark); font-size:16px; margin:0;" id="dyn-modal-title-${page.key}">
            Add New Record
          </h3>
          <button onclick="closeDynamicModal('${page.key}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:18px;">&times;</button>
        </div>
        <form id="dyn-form-${page.key}" onsubmit="submitDynamicForm(event, '${page.key}')">
          <input type="hidden" id="dyn-input-id-${page.key}">
          ${columns.map((col, index) => `
            <div class="form-group" style="margin-bottom:14px;">
              <label style="display:block; margin-bottom:6px; font-size:12px; font-weight:600; color:var(--text-dark);">${col}</label>
              <input type="text" id="dyn-input-col_${index}-${page.key}" class="form-control" placeholder="Enter ${col.toLowerCase()}" required>
            </div>
          `).join('')}
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
            <button type="button" class="btn btn-secondary" onclick="closeDynamicModal('${page.key}')">Cancel</button>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Record</button>
          </div>
        </form>
      </div>
    </div>
  `;

  container.appendChild(section);
}

async function loadDynamicTableData(key) {
  const page = appPages.find(p => p.key === key);
  if (!page) return;
  const tbody = document.getElementById(`dyn-tbody-${key}`);
  if (!tbody) return;

  try {
    const res = await fetch(`/api/super-admin/dynamic/${page.table_name}`);
    const rows = await res.json();
    dynamicDataCache[key] = rows;
    renderDynamicTableRows(key, rows);
  } catch (e) {
    console.error("Failed to load dynamic data", e);
    tbody.innerHTML = `
      <tr>
        <td colspan="100" style="text-align:center; color:#ef4444; padding:20px;">
          <i class="fas fa-exclamation-triangle" style="font-size:20px; margin-bottom:8px; display:block;"></i>
          Failed to load database records from server.
        </td>
      </tr>
    `;
  }
}

function renderDynamicTableRows(key, rows) {
  const page = appPages.find(p => p.key === key);
  const tbody = document.getElementById(`dyn-tbody-${key}`);
  if (!page || !tbody) return;

  const columns = JSON.parse(page.columns_json);

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${columns.length + 2}" style="text-align:center; padding:30px; color:var(--text-muted);">
          No records found in this database. Click 'Add Record' to create one!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map((row, rIdx) => `
    <tr>
      <td><strong>#${row.id}</strong></td>
      ${columns.map((col, cIdx) => `<td>${row[`col_${cIdx}`] || ''}</td>`).join('')}
      <td style="text-align:right;">
        <button class="btn btn-sm btn-secondary" style="padding:4px 8px; font-size:11px; margin-right:4px;" onclick="openDynamicEditModal('${key}', ${row.id}, ${rIdx})">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="btn btn-sm btn-secondary" style="padding:4px 8px; font-size:11px; color:#ef4444;" onclick="deleteDynamicRow('${key}', ${row.id})">
          <i class="fas fa-trash-alt"></i> Delete
        </button>
      </td>
    </tr>
  `).join('');
}

function filterDynamicTable(key, query) {
  const cached = dynamicDataCache[key] || [];
  if (!query.trim()) {
    renderDynamicTableRows(key, cached);
    return;
  }
  const q = query.toLowerCase();
  const filtered = cached.filter(row => {
    return Object.keys(row).some(k => {
      if (k === 'id') return false;
      return String(row[k]).toLowerCase().includes(q);
    });
  });
  renderDynamicTableRows(key, filtered);
}

function openDynamicAddModal(key) {
  const modal = document.getElementById(`dyn-modal-${key}`);
  const title = document.getElementById(`dyn-modal-title-${key}`);
  const form = document.getElementById(`dyn-form-${key}`);
  const idInput = document.getElementById(`dyn-input-id-${key}`);

  if (modal && form) {
    idInput.value = "";
    form.reset();
    if (title) title.innerText = "Add New Record";
    modal.classList.add("active");
  }
}

function openDynamicEditModal(key, id, rowIdx) {
  const page = appPages.find(p => p.key === key);
  const rows = dynamicDataCache[key] || [];
  const row = rows[rowIdx];
  if (!page || !row) return;

  const modal = document.getElementById(`dyn-modal-${key}`);
  const title = document.getElementById(`dyn-modal-title-${key}`);
  const idInput = document.getElementById(`dyn-input-id-${key}`);

  if (modal) {
    idInput.value = id;
    const columns = JSON.parse(page.columns_json);
    columns.forEach((col, cIdx) => {
      const input = document.getElementById(`dyn-input-col_${cIdx}-${key}`);
      if (input) input.value = row[`col_${cIdx}`] || "";
    });
    if (title) title.innerText = "Edit Database Record";
    modal.classList.add("active");
  }
}

function closeDynamicModal(key) {
  const modal = document.getElementById(`dyn-modal-${key}`);
  if (modal) modal.classList.remove("active");
}

async function submitDynamicForm(e, key) {
  e.preventDefault();
  const page = appPages.find(p => p.key === key);
  if (!page) return;

  const idInput = document.getElementById(`dyn-input-id-${key}`);
  const isEdit = idInput.value !== "";
  const id = idInput.value;

  const columns = JSON.parse(page.columns_json);
  const payload = {};
  columns.forEach((col, cIdx) => {
    const input = document.getElementById(`dyn-input-col_${cIdx}-${key}`);
    if (input) payload[`col_${cIdx}`] = input.value;
  });

  const url = isEdit 
    ? `/api/super-admin/dynamic/${page.table_name}/${id}`
    : `/api/super-admin/dynamic/${page.table_name}`;
  const method = isEdit ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success || result.message) {
      showToast(isEdit ? "Record Updated" : "Record Created", "Changes saved to dynamic database table.", "success");
      closeDynamicModal(key);
      loadDynamicTableData(key);
    } else {
      showToast("Error", result.detail || "Failed to save record.", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("Network Error", "Could not connect to database API.", "danger");
  }
}

async function deleteDynamicRow(key, id) {
  const page = appPages.find(p => p.key === key);
  if (!page) return;

  if (!confirm("Are you sure you want to permanently delete this database record?")) {
    return;
  }

  try {
    const res = await fetch(`/api/super-admin/dynamic/${page.table_name}/${id}`, {
      method: "DELETE"
    });
    const result = await res.json();
    if (result.success || result.message) {
      showToast("Record Deleted", "Row removed from SQLite table.", "success");
      loadDynamicTableData(key);
    } else {
      showToast("Error", "Failed to delete record.", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("Network Error", "Could not delete database row.", "danger");
  }
}

// Role Switcher Controller
function switchRole(role) {
  currentRole = role;
  document.querySelectorAll(".role-chip").forEach(btn => btn.classList.remove("active"));
  const btn = document.getElementById(`roleBtn-${role}`);
  if (btn) btn.classList.add("active");

  if (role === "Doctor") switchView("queue");
  else if (role === "Patient") switchView("triage");
  else if (role === "Lab") switchView("lab");
  else if (role === "Pharmacy") switchView("pharmacy");
  else switchView("dashboard");
}

// Load KPIs from Backend
async function loadKpis() {
  try {
    const res = await fetch("/api/analytics/kpis");
    const data = await res.json();
    const appts = typeof data.today_appointments === 'number' ? data.today_appointments : 14;
    const revenue = typeof data.today_revenue === 'number' ? data.today_revenue : 18500;
    const waiting = typeof data.available_beds === 'number' ? data.available_beds : 12;
    const discharged = typeof data.total_doctors === 'number' ? data.total_doctors : 124;
    animateCounter(document.getElementById("kpiAppointments"), appts);
    animateCounter(document.getElementById("kpiRevenue"), revenue, '₹');
    animateCounter(document.getElementById("kpiWaiting"), waiting);
    animateCounter(document.getElementById("kpiDischarged"), discharged);
  } catch (err) {
    console.error("Failed to load KPIs", err);
    // Fallback with animation
    animateCounter(document.getElementById("kpiAppointments"), 14);
    animateCounter(document.getElementById("kpiRevenue"), 18500, '₹');
    animateCounter(document.getElementById("kpiWaiting"), 12);
    animateCounter(document.getElementById("kpiDischarged"), 124);
  }
}

// --- Interactive Dashboard Tasks System ---
let dashboardTasks = [];

function loadDashboardTasks() {
  const saved = localStorage.getItem("auracare_dashboard_tasks");
  if (saved) {
    dashboardTasks = JSON.parse(saved);
  } else {
    // Default tasks
    dashboardTasks = [
      { date: "Today • 10:00 AM", title: "Set up Operating Theater 2 for Knee Replacement" },
      { date: "Today • 02:00 PM", title: "Restock Pharmacy Antibiotics Inventory (Cipla)" },
      { date: "Tomorrow • 09:30 AM", title: "Hospital Audit & Bio-waste Disposal Check" }
    ];
    saveDashboardTasks();
  }
  renderDashboardTasks();
}

function saveDashboardTasks() {
  localStorage.setItem("auracare_dashboard_tasks", JSON.stringify(dashboardTasks));
}

function renderDashboardTasks() {
  const container = document.getElementById("dashboardTaskListContainer");
  if (!container) return;
  
  if (dashboardTasks.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">
        <i class="fas fa-tasks" style="font-size:24px; margin-bottom:8px; display:block;"></i>
        No tasks for today. Click '+' to add one!
      </div>
    `;
    return;
  }
  
  container.innerHTML = dashboardTasks.map((task, index) => `
    <div class="task-item-card" style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:10px;">
      <div style="flex:1;">
        <div class="task-date">${task.date}</div>
        <div class="task-title">${task.title}</div>
      </div>
      <button onclick="deleteDashboardTask(${index})" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:14px; padding:4px;" title="Delete Task">
        <i class="fas fa-trash-alt"></i>
      </button>
    </div>
  `).join('');
}

function addDashboardTask() {
  const title = prompt("Enter task details (e.g. Set up Operating Theater):");
  if (!title) return;
  const date = prompt("Enter task time (e.g. Today • 10:00 AM):", "Today • 12:00 PM");
  if (!date) return;
  
  dashboardTasks.push({ date, title });
  saveDashboardTasks();
  renderDashboardTasks();
}

function deleteDashboardTask(index) {
  if (confirm("Are you sure you want to complete/delete this task?")) {
    dashboardTasks.splice(index, 1);
    saveDashboardTasks();
    renderDashboardTasks();
  }
}

// Load Doctor Directory
async function loadDoctorsList() {
  try {
    const res = await fetch("/api/doctors");
    const docs = await res.json();
    const container = document.getElementById("doctorsGridContainer");
    if (!container) return;

    container.innerHTML = docs.map(doc => `
      <div class="card-box" style="margin-bottom:0;">
        <div style="display:flex; gap:16px; align-items:center;">
          <img src="${doc.avatar_url}" style="width:54px; height:54px; border-radius:50%; object-fit:cover; border:2px solid var(--primary-lime);">
          <div>
            <h3 style="color:var(--text-dark); font-size:16px; font-weight:700;">${doc.name}</h3>
            <div style="font-size:12px; color:var(--text-muted); font-weight:600;">${doc.title} • ${doc.department_name}</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">⭐ ${doc.rating} (${doc.reviews_count} reviews) • ${doc.experience} Yrs Exp</div>
          </div>
        </div>
        <p style="font-size:13px; color:var(--text-muted); margin-top:12px;">${doc.bio}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; border-top:1px solid var(--border-color); padding-top:12px;">
          <span style="font-weight:800; color:var(--text-dark);">Fee: ₹${doc.fee}</span>
          <button class="btn-primary" onclick="openBookingModal(${doc.id}, '${doc.name}')"><i class="fas fa-calendar-check"></i> Book Slot</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// Booking Modal Logic
function openBookingModal(docId, docName) {
  activeDocId = docId;
  document.getElementById("modalDoctorName").innerText = docName;
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  document.getElementById("bookingDateInput").value = tomorrowStr;
  document.getElementById("bookingModal").classList.add("active");
}

function closeBookingModal() {
  document.getElementById("bookingModal").classList.remove("active");
}

async function confirmBookingSubmit() {
  const name = document.getElementById("bookPatientName").value;
  const phone = document.getElementById("bookPatientPhone").value;
  const age = parseInt(document.getElementById("bookPatientAge").value) || 30;
  const symptoms = document.getElementById("bookSymptoms").value || "General consultation";
  const slot = document.getElementById("bookTimeSlot").value;
  const date = document.getElementById("bookingDateInput").value;

  if (!name || !phone) {
    showToast('Missing Info', 'Please enter Patient Name and Phone Number.', 'warning');
    return;
  }

  try {
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctor_id: activeDocId,
        appointment_date: date,
        time_slot: slot,
        patient_name: name,
        patient_age: age,
        patient_gender: "Male",
        patient_phone: phone,
        patient_email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
        symptoms,
        triage_level: "ROUTINE",
        urgency_score: 1,
        payment_method: "UPI / Credit Card",
        booking_source: "Manual"
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Booking Confirmed! 🎉', `Code: ${data.data.booking_code} — Patient slot reserved`, 'success', 5000);
      closeBookingModal();
      loadQueueData();
      loadKpis();
    }
  } catch (err) {
    showToast('Booking Failed', 'Unable to connect to server. Try again.', 'error');
  }
}

// Load OPD Queue Data
async function loadQueueData(page = 1) {
  try {
    const filterInput = document.getElementById("queueDateFilter");
    let url = "/api/appointments";
    
    if (filterInput) {
      if (!filterInput.value) {
        const today = new Date().toISOString().split('T')[0];
        filterInput.value = today;
      }
      url += "?date=" + filterInput.value;
    }

    const res = await fetch(url);
    const appts = await res.json();
    allQueueDataCache = appts || [];
    renderQueueTable(allQueueDataCache, page);
  } catch (err) {
    console.error(err);
  }
}

function renderQueueTable(appts, page = 1) {
  const tableBody = document.getElementById("queueTableBody");
  if (!tableBody) return;
  currentPageState.queue = page;
  const pageInfo = getPaginatedItems(appts, page, PAGE_SIZE);

  tableBody.innerHTML = pageInfo.items.map(a => {
    const sourceBadge = a.booking_source === 'WhatsApp'
      ? `<span class="badge" style="background:#dcfce7; color:#15803d; font-size:10px; padding:2px 6px; border-radius:4px; margin-left:4px;"><i class="fab fa-whatsapp"></i> WhatsApp</span>`
      : `<span class="badge" style="background:#f1f5f9; color:#475569; font-size:10px; padding:2px 6px; border-radius:4px; margin-left:4px;"><i class="fas fa-desktop"></i> OPD Counter</span>`;

    return `
    <tr>
      <td><strong style="color:var(--text-dark);">${a.booking_code}</strong>${sourceBadge}</td>
      <td>
        <strong style="color:var(--text-dark);">${a.patient_name}</strong><br>
        <span style="font-size:11px; color:var(--text-muted);">${a.patient_age} yrs • ${a.patient_phone}</span>
      </td>
      <td>${a.doctor_name}<br><span style="font-size:11px; color:var(--text-muted);">${a.department_name}</span></td>
      <td>${a.appointment_date}<br><span style="font-size:11px; color:var(--text-muted);">${a.time_slot}</span></td>
      <td><span class="badge ${getTriageBadgeClass(a.triage_level)}">${a.triage_level}</span></td>
      <td><span class="badge ${getStatusBadgeClass(a.status)}">${a.status}</span></td>
      <td>
        <div style="display:flex; gap:6px; align-items:center;">
          <button class="btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="updateApptStatus(${a.id}, 'In Consultation')">Call Patient</button>
          <button class="btn-primary" style="padding:4px 10px; font-size:11px;" onclick="openPrescriptionModal(${a.id}, '${a.patient_name}', '${a.doctor_name}')">Issue Rx</button>
          <button class="btn btn-sm btn-blue" style="padding:4px 10px; font-size:11px; background:var(--primary-lime-light); color:var(--text-dark); border-color:var(--primary-lime);" onclick="openEditApptModal(${a.id})"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-sm btn-red" style="padding:4px 10px; font-size:11px; background:#ef4444; color:#ffffff; border:none; border-radius:6px; cursor:pointer;" onclick="deleteAppointment(${a.id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </td>
    </tr>
    `;
  }).join('');

  renderPaginationFooter("queueTableBody", pageInfo, "changeQueuePage");
}

function changeQueuePage(newPage) {
  renderQueueTable(allQueueDataCache, newPage);
}

async function updateApptStatus(id, newStatus) {
  await fetch(`/api/appointments/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus, consultation_notes: "Patient checked in", room_no: "Room 204" })
  });
  loadQueueData();
}

function getTriageBadgeClass(level) {
  if (level.includes("EMERGENCY")) return "badge-red";
  if (level.includes("HIGH")) return "badge-orange";
  if (level.includes("MODERATE")) return "badge-yellow";
  return "badge-green";
}

function getStatusBadgeClass(status) {
  if (status === "Completed") return "badge-green";
  if (status === "In Consultation") return "badge-orange";
  if (status === "Waiting") return "badge-yellow";
  return "badge-lime";
}

// Load Bed Occupancy Matrix
async function loadBedsData() {
  try {
    const res = await fetch("/api/beds");
    const beds = await res.json();
    const container = document.getElementById("bedsGridContainer");
    if (!container) return;

    container.innerHTML = beds.map(b => `
      <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius:14px; padding:16px; box-shadow:var(--shadow-sm);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:var(--text-dark); font-size:15px;"><i class="fas fa-bed"></i> ${b.bed_number}</strong>
          <span class="badge ${b.status === 'Occupied' ? 'badge-red' : 'badge-green'}">${b.status}</span>
        </div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:6px;">${b.ward_name} (${b.bed_type})</div>
        <div style="font-size:12px; color:var(--text-dark); margin-top:4px;">Patient: <strong>${b.patient_name}</strong></div>
        <button class="btn-secondary" style="width:100%; margin-top:12px; font-size:11px; padding:6px;" onclick="toggleBedStatus(${b.id}, '${b.status}')">Toggle Status</button>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

async function toggleBedStatus(bedId, currentStatus) {
  const nextStatus = currentStatus === "Occupied" ? "Available" : "Occupied";
  const pName = nextStatus === "Occupied" ? prompt("Enter Patient Name:") || "Admitted Patient" : "N/A";
  await fetch(`/api/beds/${bedId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: nextStatus, patient_name: pName })
  });
  loadBedsData();
  loadKpis();
}

// Theme Engine — AuraCare Nexus Light SaaS
let customTheme = {
  '--bg-page':    '#cee0ec',
  '--bg-sidebar': '#083852',
  '--bg-card':    '#ffffff',
  '--bg-input':   '#e3eef5',
  '--accent':     '#083852',
  '--border':     '#e2ebf2',
  '--primary-lime':       '#083852',
  '--primary-lime-hover': '#0d4664',
  '--primary-lime-light': 'rgba(8, 56, 82, 0.08)',
  '--text-dark':  '#0f2942',
  '--text-main':  '#334e68',
  '--text-muted': '#627d98',
  '--font-family': "'Plus Jakarta Sans', system-ui, sans-serif",
  'font-scale': 'medium'
};

const themePresets = {
  defaultMint: {
    '--bg-page':    '#cee0ec',
    '--bg-sidebar': '#083852',
    '--bg-card':    '#ffffff',
    '--bg-input':   '#e3eef5',
    '--accent':     '#083852',
    '--border':     '#e2ebf2',
    '--primary-lime':       '#083852',
    '--primary-lime-hover': '#0d4664',
    '--primary-lime-light': 'rgba(8, 56, 82, 0.08)',
    '--text-dark':  '#0f2942',
    '--text-main':  '#334e68',
    '--text-muted': '#627d98'
  },
  midnightGlass: {
    '--bg-page': '#0b0f19',
    '--bg-sidebar': '#0f1322',
    '--bg-header': '#0f1322',
    '--bg-header-icon': '#1a2035',
    '--bg-card': '#1a2035',
    '--bg-card-subtle': '#242c4a',
    '--border-color': '#2e3c5e',
    '--border-subtle': '#1d253f',
    '--primary-lime': '#10b981',
    '--primary-lime-hover': '#059669',
    '--primary-lime-light': '#064e3b',
    '--text-dark': '#f9fafb',
    '--text-main': '#e5e7eb',
    '--text-muted': '#9ca3af'
  },
  sunsetOrange: {
    '--bg-page': '#1a0d00',
    '--bg-sidebar': '#1a0d00',
    '--bg-header': 'rgba(26,13,0,0.95)',
    '--bg-header-icon': 'rgba(255,255,255,0.06)',
    '--bg-card': 'rgba(30,16,4,0.9)',
    '--bg-card-subtle': 'rgba(40,20,5,0.6)',
    '--border-color': 'rgba(255,255,255,0.08)',
    '--border-subtle': 'rgba(255,255,255,0.04)',
    '--primary-lime': '#f97316',
    '--primary-lime-hover': '#ea580c',
    '--primary-lime-light': 'rgba(249,115,22,0.12)',
    '--text-dark': '#fff7ed',
    '--text-main': '#fed7aa',
    '--text-muted': '#c2410c'
  },
  royalDark: {
    '--bg-page': '#0d1117',
    '--bg-sidebar': '#0c1017',
    '--bg-header': 'rgba(12,16,23,0.95)',
    '--bg-header-icon': 'rgba(255,255,255,0.06)',
    '--bg-card': 'rgba(22,27,34,0.9)',
    '--bg-card-subtle': 'rgba(33,38,45,0.6)',
    '--border-color': 'rgba(255,255,255,0.08)',
    '--border-subtle': 'rgba(255,255,255,0.04)',
    '--primary-lime': '#58a6ff',
    '--primary-lime-hover': '#1f6feb',
    '--primary-lime-light': 'rgba(88,166,255,0.12)',
    '--text-dark': '#f0f6fc',
    '--text-main': '#c9d1d9',
    '--text-muted': '#8b949e'
  }
};

function initTheme() {
  const THEME_VERSION = 'nexus-v6-dark-mode-default';
  const storedVersion = localStorage.getItem('auracare_theme_version');
  
  if (storedVersion !== THEME_VERSION) {
    localStorage.removeItem('auracare_custom_theme');
    localStorage.setItem('auracare_theme_version', THEME_VERSION);
    localStorage.setItem('auracare_dark_mode', 'true');
    document.body.classList.add('dark-theme');
    document.documentElement.classList.add('dark-theme');
    applyTheme(customTheme);
    console.log('[AuraCare Nexus] Dark mode default applied.');
    return;
  }

  document.body.classList.add('dark-theme');
  document.documentElement.classList.add('dark-theme');

  const saved = localStorage.getItem('auracare_custom_theme');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      customTheme = { ...customTheme, ...parsed };
      applyTheme(customTheme);
    } catch (e) {
      console.error("Error loading theme", e);
      applyTheme(customTheme);
    }
  } else {
    applyTheme(customTheme);
  }

  // Check saved quick color scheme
  const savedColor = localStorage.getItem('auracare_theme_color');
  if (savedColor) {
    setTimeout(() => setQuickThemeColor(savedColor), 100);
  }
}

function setQuickThemeColor(colorScheme) {
  const root = document.documentElement;
  if (colorScheme === 'blue') {
    document.body.classList.remove('dark-theme');
    document.documentElement.classList.remove('dark-theme');
    root.style.setProperty('--accent', '#0284c7');
    root.style.setProperty('--primary-lime', '#0284c7');
    root.style.setProperty('--bg-page', '#f0f4f9');
    const sb = document.querySelector('.sidebar');
    if (sb) sb.style.background = 'linear-gradient(180deg, #09172a 0%, #0d1e36 50%, #061120 100%)';
    localStorage.setItem('auracare_theme_color', 'blue');
    showToast('Theme Updated 🎨', 'Switched to Royal Sapphire Blue Theme.', 'success', 2500);
  } else if (colorScheme === 'emerald') {
    document.body.classList.remove('dark-theme');
    document.documentElement.classList.remove('dark-theme');
    root.style.setProperty('--accent', '#059669');
    root.style.setProperty('--primary-lime', '#059669');
    root.style.setProperty('--bg-page', '#f0fdf4');
    const sb = document.querySelector('.sidebar');
    if (sb) sb.style.background = 'linear-gradient(180deg, #062c22 0%, #0b3d30 50%, #041d16 100%)';
    localStorage.setItem('auracare_theme_color', 'emerald');
    showToast('Theme Updated 🎨', 'Switched to Emerald Health Theme.', 'success', 2500);
  } else if (colorScheme === 'purple') {
    document.body.classList.remove('dark-theme');
    document.documentElement.classList.remove('dark-theme');
    root.style.setProperty('--accent', '#7c3aed');
    root.style.setProperty('--primary-lime', '#7c3aed');
    root.style.setProperty('--bg-page', '#f5f3ff');
    const sb = document.querySelector('.sidebar');
    if (sb) sb.style.background = 'linear-gradient(180deg, #1e1b4b 0%, #2e1065 50%, #0f0728 100%)';
    localStorage.setItem('auracare_theme_color', 'purple');
    showToast('Theme Updated 🎨', 'Switched to Royal Violet Theme.', 'success', 2500);
  } else if (colorScheme === 'dark') {
    document.body.classList.add('dark-theme');
    document.documentElement.classList.add('dark-theme');
    localStorage.setItem('auracare_theme_color', 'dark');
    showToast('Theme Updated 🌙', 'Switched to Dark Mode Theme.', 'success', 2500);
  }
}

function isColorDark(hex) {
  if (!hex || hex.length < 7) return false;
  const R = parseInt(hex.substring(1, 3), 16);
  const G = parseInt(hex.substring(3, 5), 16);
  const B = parseInt(hex.substring(5, 7), 16);
  const yiq = ((R * 299) + (G * 587) + (B * 114)) / 1000;
  return yiq < 128;
}

function applyTheme(themeObj) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(themeObj)) {
    if (key !== 'font-scale' && value) {
      root.style.setProperty(key, value);
    }
  }

  // Update DOM color picker values if they exist
  const updatePicker = (id, val) => {
    if (!val || val.includes('rgba') || val.includes('gradient')) return; // skip non-hex for color inputs
    const el = document.getElementById(id);
    if (el) el.value = val;
    const txt = document.getElementById(id + 'Hex');
    if (txt) txt.innerText = val.toUpperCase();
  };

  updatePicker('colorBgPage', themeObj['--bg-page']);
  updatePicker('colorBgCard', themeObj['--bg-card']);
  updatePicker('colorPrimaryLime', themeObj['--primary-lime']);
  updatePicker('colorTextDark', themeObj['--text-dark']);

  const ffEl = document.getElementById('settingFontFamily');
  if (themeObj['--font-family']) {
    if (ffEl) ffEl.value = themeObj['--font-family'];
    loadGoogleFontOnDemand(themeObj['--font-family']);
  }

  // Restore custom font size
  if (themeObj['--custom-font-size']) {
    const sizeVal = parseInt(themeObj['--custom-font-size']);
    const sizeSelect = document.getElementById('settingFontSize');
    if (sizeSelect) sizeSelect.value = sizeVal;
    const viewContainer = document.querySelector('.view-container');
    if (viewContainer) viewContainer.style.fontSize = themeObj['--custom-font-size'];
  }
}

function loadGoogleFontOnDemand(fontValue) {
  if (!fontValue) return;
  const match = fontValue.match(/'([^']+)'/);
  if (match && match[1]) {
    const fontName = match[1];
    const fontSlug = fontName.replace(/ /g, '+');
    const linkId = `gfont-${fontSlug.toLowerCase()}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontSlug}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap`;
      document.head.appendChild(link);
    }
  }
}

function updateThemeVariable(variable, value) {
  customTheme[variable] = value;
  document.documentElement.style.setProperty(variable, value);
  
  if (variable === '--font-family') {
    loadGoogleFontOnDemand(value);
  }

  // Simple custom mapping for labels
  let labelId = '';
  if (variable === '--bg-page') labelId = 'colorBgPageHex';
  else if (variable === '--bg-card') labelId = 'colorBgCardHex';
  else if (variable === '--bg-sidebar') labelId = 'colorBgSidebarHex';
  else if (variable === '--bg-header') labelId = 'colorBgHeaderHex';
  else if (variable === '--bg-header-icon') labelId = 'colorBgHeaderIconHex';
  
  const labelEl = document.getElementById(labelId);
  if (labelEl) labelEl.innerText = value.toUpperCase();

  localStorage.setItem('auracare_custom_theme', JSON.stringify(customTheme));
}

function updateThemePrimary(value) {
  customTheme['--primary-lime'] = value;
  customTheme['--primary-lime-hover'] = adjustColorBrightness(value, -15);
  customTheme['--primary-lime-light'] = adjustColorBrightness(value, 60);

  document.documentElement.style.setProperty('--primary-lime', value);
  document.documentElement.style.setProperty('--primary-lime-hover', customTheme['--primary-lime-hover']);
  document.documentElement.style.setProperty('--primary-lime-light', customTheme['--primary-lime-light']);

  const labelEl = document.getElementById('colorPrimaryLimeHex');
  if (labelEl) labelEl.innerText = value.toUpperCase();

  localStorage.setItem('auracare_custom_theme', JSON.stringify(customTheme));
}

function updateThemeText(value) {
  customTheme['--text-dark'] = value;
  customTheme['--text-main'] = adjustColorBrightness(value, 20);
  customTheme['--text-muted'] = adjustColorBrightness(value, 40);

  document.documentElement.style.setProperty('--text-dark', value);
  document.documentElement.style.setProperty('--text-main', customTheme['--text-main']);
  document.documentElement.style.setProperty('--text-muted', customTheme['--text-muted']);

  const labelEl = document.getElementById('colorTextDarkHex');
  if (labelEl) labelEl.innerText = value.toUpperCase();

  localStorage.setItem('auracare_custom_theme', JSON.stringify(customTheme));
}

function applyPreset(presetName) {
  const preset = themePresets[presetName];
  if (preset) {
    customTheme = { ...customTheme, ...preset };
    applyTheme(customTheme);
    localStorage.setItem('auracare_custom_theme', JSON.stringify(customTheme));
  }
}

function applyFontScale(scale) {
  customTheme['font-scale'] = scale;
  const scales = {
    'small': '14px',
    'medium': '16px',
    'large': '18px',
    'extra-large': '20px'
  };
  // Apply font scale by altering html root font size or styling
  document.documentElement.style.fontSize = scales[scale] || '16px';

  localStorage.setItem('auracare_custom_theme', JSON.stringify(customTheme));
}

// Custom Font Size Dropdown (zoom-level control)
function applyCustomFontSize(size) {
  const px = size + 'px';
  customTheme['--custom-font-size'] = px;
  // Use zoom to scale content area proportionally (base = 14px)
  const zoomLevel = parseInt(size) / 14;
  const viewContainer = document.querySelector('.view-container');
  if (viewContainer) viewContainer.style.zoom = zoomLevel;
  localStorage.setItem('auracare_custom_theme', JSON.stringify(customTheme));
}

function saveTheme() {
  localStorage.setItem('auracare_custom_theme', JSON.stringify(customTheme));
  alert("🎉 Design configuration saved successfully!");
}

function resetToDefaultTheme() {
  if (confirm("Reset layout to default Mint Light design?")) {
    localStorage.removeItem('auracare_custom_theme');
    customTheme = {
      '--bg-page': '#f2f7f4',
      '--bg-sidebar': '#ffffff',
      '--bg-card': '#ffffff',
      '--primary-lime': '#cbf24a',
      '--primary-lime-hover': '#bde836',
      '--primary-lime-light': '#eefcbe',
      '--text-dark': '#111827',
      '--text-main': '#374151',
      '--text-muted': '#6b7280',
      '--font-family': "'Inter', system-ui, -apple-system, sans-serif",
      'font-scale': 'medium'
    };
    applyTheme(customTheme);
  }
}

function adjustColorBrightness(hex, percent) {
  let R = parseInt(hex.substring(1, 3), 16);
  let G = parseInt(hex.substring(3, 5), 16);
  let B = parseInt(hex.substring(5, 7), 16);

  R = parseInt(R * (100 + percent) / 100);
  G = parseInt(G * (100 + percent) / 100);
  B = parseInt(B * (100 + percent) / 100);

  R = (R < 255) ? R : 255;
  G = (G < 255) ? G : 255;
  B = (B < 255) ? B : 255;

  R = (R > 0) ? R : 0;
  G = (G > 0) ? G : 0;
  B = (B > 0) ? B : 0;

  const rHex = R.toString(16).padStart(2, '0');
  const gHex = G.toString(16).padStart(2, '0');
  const bHex = B.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

// Digital Prescriptions Controller
let allPrescriptionsData = [];

async function loadPrescriptionsList() {
  try {
    const res = await fetch("/api/prescriptions");
    const list = await res.json();
    allPrescriptionsData = list || [];

    // Calculate KPIs
    let totalMeds = 0;
    allPrescriptionsData.forEach(p => {
      if (Array.isArray(p.medicines)) totalMeds += p.medicines.length;
    });

    const kpiTotalEl = document.getElementById("prescKpiTotal");
    const kpiMedsEl = document.getElementById("prescKpiMeds");
    const kpiWaEl = document.getElementById("prescKpiWa");

    if (kpiTotalEl) kpiTotalEl.innerText = allPrescriptionsData.length;
    if (kpiMedsEl) kpiMedsEl.innerText = totalMeds;
    if (kpiWaEl) kpiWaEl.innerText = allPrescriptionsData.length;

    renderPrescriptionsCards(allPrescriptionsData);
  } catch (err) {
    console.error("Error loading prescriptions:", err);
  }
}

function renderPrescriptionsCards(list, page = 1) {
  const container = document.getElementById("prescriptionsContainer");
  if (!container) return;
  currentPrescriptionsFiltered = list || [];
  currentPageState.prescriptions = page;

  if (!list || list.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:48px 24px; color:var(--text-muted); background:var(--bg-card); border-radius:16px; border:1px solid var(--border-color);">
        <div style="width:64px; height:64px; border-radius:50%; background:rgba(2,132,199,0.1); color:#0284c7; display:inline-flex; align-items:center; justify-content:center; font-size:28px; margin-bottom:14px;">
          <i class="fas fa-file-prescription"></i>
        </div>
        <div style="font-size:15px; font-weight:700; color:var(--text-dark);">No Digital Prescriptions Found</div>
        <div style="font-size:13px; color:var(--text-muted); margin-top:4px;">No records match your search criteria.</div>
      </div>
    `;
    renderPaginationFooter("prescriptionsContainer", { totalItems: 0 }, "changePrescriptionsPage");
    return;
  }

  const pageInfo = getPaginatedItems(list, page, PAGE_SIZE);

  const tableRowsHtml = pageInfo.items.map(p => {
    const safeObj = JSON.stringify(p).replace(/'/g, "&apos;");
    const medsList = Array.isArray(p.medicines) ? p.medicines : [];
    
    return `
      <tr class="rx-row-item" style="border-bottom:1px solid var(--border-light); cursor:pointer; transition:all 0.2s ease;" onclick='openEditPrescriptionModal(${safeObj})'>
        <td style="padding:14px 18px; white-space:nowrap;">
          <span style="background:linear-gradient(135deg, #0284c7, #0369a1); color:#ffffff; font-family:var(--font-mono); font-size:12px; font-weight:700; padding:5px 10px; border-radius:6px; display:inline-flex; align-items:center; gap:5px; box-shadow:0 2px 6px rgba(2, 132, 199, 0.2);">
            <i class="fas fa-file-medical"></i> ${p.booking_code}
          </span>
        </td>
        <td style="padding:14px 18px; color:var(--text-muted); font-size:12.5px; font-weight:600; white-space:nowrap;">
          <i class="far fa-calendar-alt" style="color:#0284c7; margin-right:4px;"></i> ${p.date}
        </td>
        <td style="padding:14px 18px; white-space:nowrap;">
          <div style="font-size:14px; font-weight:800; color:var(--text-dark);">${p.patient_name}</div>
        </td>
        <td style="padding:14px 18px; white-space:nowrap;">
          <div style="font-size:13.5px; font-weight:700; color:var(--text-dark);">${p.doctor_name}</div>
          <div style="font-size:11.5px; color:var(--text-muted); font-weight:500;">${p.department_name}</div>
        </td>
        <td style="padding:14px 18px; max-width:240px;">
          <div style="font-size:13px; font-weight:600; color:var(--text-dark); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${p.diagnosis.replace(/"/g, '&quot;')}">
            ${p.diagnosis}
          </div>
        </td>
        <td style="padding:14px 18px; text-align:center; white-space:nowrap;">
          <span style="background:rgba(2, 132, 199, 0.1); color:#0284c7; font-size:12px; font-weight:700; padding:4px 10px; border-radius:12px;">
            ${medsList.length} Items
          </span>
        </td>
        <td style="padding:14px 18px; text-align:center; white-space:nowrap;">
          <span style="background:rgba(16, 185, 129, 0.12); color:#059669; border:1px solid rgba(16, 185, 129, 0.25); font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:20px; display:inline-flex; align-items:center; gap:5px;">
            <span style="width:6px; height:6px; background:#10b981; border-radius:50%; display:inline-block;"></span> Verified
          </span>
        </td>
        <td style="padding:14px 18px; text-align:right; white-space:nowrap;" onclick="event.stopPropagation()">
          <div style="display:flex; gap:6px; justify-content:flex-end; align-items:center;">
            <button class="btn" style="background:linear-gradient(135deg, #0284c7, #0369a1); color:#ffffff; font-size:12px; padding:6px 14px; font-weight:700; border:none; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; box-shadow:0 2px 6px rgba(2, 132, 199, 0.2);" onclick='openEditPrescriptionModal(${safeObj})'>
              <i class="fas fa-external-link-alt"></i> View Full Page
            </button>
            <button class="btn" style="background:linear-gradient(135deg, #25d366, #128c7e); color:#ffffff; font-size:12px; padding:6px 10px; font-weight:700; border:none; border-radius:6px; cursor:pointer;" title="WhatsApp Share" onclick="sharePrescriptionWhatsApp('${p.patient_name.replace(/'/g, "\\'")}', '${p.booking_code}')">
              <i class="fab fa-whatsapp"></i>
            </button>
            <button class="btn" style="background:rgba(239, 68, 68, 0.08); color:#ef4444; border:1px solid rgba(239, 68, 68, 0.2); font-size:12px; padding:6px 10px; font-weight:600; border-radius:6px; cursor:pointer;" title="Delete Record" onclick="deletePrescription(${p.id})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="overflow-x:auto; border-radius:14px; border:1px solid var(--border-color); background:var(--bg-card); box-shadow:0 4px 20px rgba(15, 23, 42, 0.04); width:100%;">
      <table class="custom-table" style="width:100%; min-width:900px; border-collapse:collapse; font-size:13.5px;">
        <thead>
          <tr style="background:var(--bg-card-subtle); border-bottom:1.5px solid var(--border-color);">
            <th style="padding:14px 18px; text-align:left; color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:0.6px; font-weight:700;">RX CODE</th>
            <th style="padding:14px 18px; text-align:left; color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:0.6px; font-weight:700;">DATE</th>
            <th style="padding:14px 18px; text-align:left; color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:0.6px; font-weight:700;">PATIENT NAME</th>
            <th style="padding:14px 18px; text-align:left; color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:0.6px; font-weight:700;">ATTENDING DOCTOR</th>
            <th style="padding:14px 18px; text-align:left; color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:0.6px; font-weight:700;">CLINICAL DIAGNOSIS</th>
            <th style="padding:14px 18px; text-align:center; color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:0.6px; font-weight:700;">MEDICINES</th>
            <th style="padding:14px 18px; text-align:center; color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:0.6px; font-weight:700;">STATUS</th>
            <th style="padding:14px 18px; text-align:right; color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:0.6px; font-weight:700;">ACTION</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>
    </div>
  `;

  renderPaginationFooter("prescriptionsContainer", pageInfo, "changePrescriptionsPage");
}

function changePrescriptionsPage(newPage) {
  renderPrescriptionsCards(currentPrescriptionsFiltered, newPage);
}

function filterPrescriptionsList() {
  const query = (document.getElementById("prescSearchInput")?.value || "").toLowerCase().trim();
  const deptFilter = document.getElementById("prescDeptFilter")?.value || "ALL";

  let filtered = allPrescriptionsData.filter(p => {
    const matchesSearch = !query ||
      (p.patient_name || "").toLowerCase().includes(query) ||
      (p.doctor_name || "").toLowerCase().includes(query) ||
      (p.booking_code || "").toLowerCase().includes(query) ||
      (p.diagnosis || "").toLowerCase().includes(query);

    let matchesDept = true;
    if (deptFilter !== "ALL") {
      matchesDept = (p.department_name || "").toLowerCase() === deptFilter.toLowerCase();
    }
    return matchesSearch && matchesDept;
  });

  renderPrescriptionsCards(filtered);
}

let apptsCacheForPresc = [];

async function openAddPrescriptionModal() {
  const modal = document.getElementById("prescriptionModal");
  if (!modal) return;

  try {
    const res = await fetch("/api/appointments");
    const appts = await res.json();
    apptsCacheForPresc = appts || [];

    const selectEl = document.getElementById("prescApptSelect");
    if (selectEl) {
      if (apptsCacheForPresc.length === 0) {
        selectEl.innerHTML = `<option value="">No appointments found</option>`;
      } else {
        selectEl.innerHTML = apptsCacheForPresc.map(a => 
          `<option value="${a.id}">${a.patient_name} (${a.booking_code || 'AURA'}) - ${a.doctor_name || 'Doctor'}</option>`
        ).join('');
        
        if (apptsCacheForPresc[0]) {
          selectEl.value = apptsCacheForPresc[0].id;
          onPrescApptSelectChange(apptsCacheForPresc[0].id);
        }
      }
    }
  } catch (err) {
    console.error("Error fetching appointments for presc modal:", err);
  }

  modal.classList.add("active");
}

function onPrescApptSelectChange(apptId) {
  const appt = apptsCacheForPresc.find(a => String(a.id) === String(apptId));
  if (appt) {
    document.getElementById("prescApptId").value = appt.id;
    const patientEl = document.getElementById("prescPatientName");
    const doctorEl = document.getElementById("prescDoctorName");
    if (patientEl) patientEl.innerText = appt.patient_name;
    if (doctorEl) doctorEl.innerText = `${appt.doctor_name || 'Doctor'} (${appt.department_name || 'Medicine'})`;
  }
}

function sharePrescriptionWhatsApp(patientName, code) {
  alert(`📱 WhatsApp Prescription Link sent to ${patientName}!\n\nReference: ${code}\nLink: https://auracare.ai/rx/${code}`);
}

// Load Patients List
async function loadPatientsList(page = 1) {
  try {
    const res = await fetch("/api/patients");
    const pts = await res.json();
    allPatientsDataCache = pts || [];
    renderPatientsTable(allPatientsDataCache, page);
  } catch (err) {
    console.error(err);
  }
}

function renderPatientsTable(list, page = 1) {
  const container = document.getElementById("patientsTableBody");
  if (!container) return;
  currentPageState.patients = page;
  const pageInfo = getPaginatedItems(list, page, PAGE_SIZE);

  container.innerHTML = pageInfo.items.map(p => `
    <tr>
      <td><strong style="color:var(--text-dark);">${p.name}</strong></td>
      <td>${p.age} Yrs / ${p.gender}</td>
      <td>${p.phone}</td>
      <td><span class="badge badge-red">${p.blood_group}</span></td>
      <td>${p.allergies}</td>
      <td>${p.insurance_provider}<br><span style="font-size:11px; color:var(--text-muted);">${p.policy_no}</span></td>
      <td>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-sm btn-blue" style="padding:4px 8px; font-size:12px;" onclick="openEditPatientModal(${p.id})"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-sm btn-red" style="padding:5px 10px; font-size:12px; background:#ef4444 !important; color:#ffffff !important; border:none !important; border-radius:6px; cursor:pointer; font-weight:600;" onclick="deletePatient(${p.id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  renderPaginationFooter("patientsTableBody", pageInfo, "changePatientsPage");
}

function changePatientsPage(newPage) {
  const query = (document.getElementById("patientSearchInput")?.value || "").toLowerCase().trim();
  const filtered = allPatientsDataCache.filter(p => 
    !query || (p.name || "").toLowerCase().includes(query) || (p.phone || "").toLowerCase().includes(query)
  );
  renderPatientsTable(filtered, newPage);
}

// Filter Patients List dynamically via search bar
function filterPatientsList() {
  changePatientsPage(1);
}

// Edit Patient Handlers
async function openEditPatientModal(patientId) {
  try {
    const res = await fetch(`/api/patients/${patientId}`);
    const p = await res.json();
    if (!p || !p.id) return;

    document.getElementById("editPatientId").value = p.id;
    document.getElementById("editPatientName").value = p.name || '';
    document.getElementById("editPatientAge").value = p.age || '';
    document.getElementById("editPatientGender").value = p.gender || 'Male';
    document.getElementById("editPatientPhone").value = p.phone || '';
    document.getElementById("editPatientBloodGroup").value = p.blood_group || '';
    document.getElementById("editPatientAllergies").value = p.allergies || '';
    document.getElementById("editPatientInsurance").value = p.insurance_provider || '';
    document.getElementById("editPatientPolicyNo").value = p.policy_no || '';
    document.getElementById("editPatientHistory").value = p.medical_history || '';

    document.getElementById("editPatientModal").classList.add("active");
  } catch (err) {
    console.error(err);
    alert("Failed to load patient details.");
  }
}

function closeEditPatientModal() {
  document.getElementById("editPatientModal").classList.remove("active");
}

async function submitEditPatient() {
  const patientId = document.getElementById("editPatientId").value;
  const payload = {
    name: document.getElementById("editPatientName").value.trim(),
    age: parseInt(document.getElementById("editPatientAge").value) || 0,
    gender: document.getElementById("editPatientGender").value,
    phone: document.getElementById("editPatientPhone").value.trim(),
    blood_group: document.getElementById("editPatientBloodGroup").value.trim(),
    allergies: document.getElementById("editPatientAllergies").value.trim(),
    insurance_provider: document.getElementById("editPatientInsurance").value.trim(),
    policy_no: document.getElementById("editPatientPolicyNo").value.trim(),
    medical_history: document.getElementById("editPatientHistory").value.trim()
  };

  if (!payload.name || !payload.phone) {
    alert("Name and Phone fields are required!");
    return;
  }

  try {
    const res = await fetch(`/api/patients/${patientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.ok) {
      alert("Patient record updated successfully!");
      closeEditPatientModal();
      loadPatientsList();
    } else {
      alert("Error: " + (result.detail || "Failed to update patient"));
    }
  } catch (err) {
    console.error(err);
    alert("Request failed to update patient.");
  }
}

async function deletePatient(patientId) {
  if (!confirm("Are you sure you want to delete this patient record? This action cannot be undone.")) {
    return;
  }

  try {
    const res = await fetch(`/api/patients/${patientId}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (res.ok) {
      alert("Patient record deleted successfully!");
      loadPatientsList();
    } else {
      alert("Error: " + (result.detail || "Failed to delete patient"));
    }
  } catch (err) {
    console.error(err);
    alert("Request failed to delete patient.");
  }
}


// Lab Pathology Controller
let allLabData = [];

async function loadLabData() {
  try {
    const res = await fetch("/api/lab/bookings");
    const bookings = await res.json();
    allLabData = bookings || [];

    // Calculate Lab KPIs
    let collectedCount = 0;
    let processingCount = 0;
    let readyCount = 0;

    allLabData.forEach(b => {
      const st = (b.status || "").toLowerCase();
      if (st.includes("collected")) collectedCount++;
      else if (st.includes("processing") || st.includes("progress")) processingCount++;
      else if (st.includes("ready") || st.includes("completed")) readyCount++;
      else collectedCount++;
    });

    const kpiTotal = document.getElementById("labKpiTotal");
    const kpiCol = document.getElementById("labKpiCollected");
    const kpiProc = document.getElementById("labKpiProcessing");
    const kpiReady = document.getElementById("labKpiReady");

    if (kpiTotal) kpiTotal.innerText = allLabData.length;
    if (kpiCol) kpiCol.innerText = collectedCount;
    if (kpiProc) kpiProc.innerText = processingCount;
    if (kpiReady) kpiReady.innerText = readyCount;

    renderLabTable(allLabData);
  } catch (err) {
    console.error("Error loading lab data:", err);
  }
}

function renderLabTable(list, page = 1) {
  const container = document.getElementById("labTableBody");
  if (!container) return;
  currentLabFiltered = list || [];
  currentPageState.lab = page;

  if (!list || list.length === 0) {
    container.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">No lab pathology records found matching filter.</td></tr>`;
    renderPaginationFooter("labTableBody", { totalItems: 0 }, "changeLabPage");
    return;
  }

  const pageInfo = getPaginatedItems(list, page, PAGE_SIZE);

  container.innerHTML = pageInfo.items.map(b => {
    const st = (b.status || "").toLowerCase();
    let statusBadge = `<span class="badge badge-green"><i class="fas fa-check-circle"></i> Ready</span>`;
    if (st.includes("collected")) {
      statusBadge = `<span class="badge badge-blue"><i class="fas fa-vial"></i> Sample Collected</span>`;
    } else if (st.includes("processing")) {
      statusBadge = `<span class="badge badge-orange"><i class="fas fa-spinner fa-spin"></i> Processing</span>`;
    }

    return `
      <tr>
        <td><strong style="color:var(--text-dark); font-family:monospace; font-size:13px;">${b.booking_code}</strong></td>
        <td><strong style="color:var(--text-dark); font-size:13px;">${b.patient_name}</strong></td>
        <td><span style="font-weight:600; color:var(--text-dark);">${b.test_name}</span></td>
        <td><span style="font-size:12px; color:var(--text-muted);">${b.date}</span></td>
        <td>${statusBadge}</td>
        <td><span style="font-size:12px; color:var(--text-muted); font-weight:600;">${b.result_summary}</span></td>
        <td style="text-align:right;">
          <div style="display:flex; gap:6px; justify-content:flex-end; align-items:center;">
            <button class="btn-secondary" style="font-size:11px; padding:4px 10px;" onclick="downloadLabReportPDF('${b.booking_code}', '${b.patient_name.replace(/'/g, "\\'")}', '${b.test_name.replace(/'/g, "\\'")}', '${b.result_summary.replace(/'/g, "\\'")}', '${b.date}')">
              <i class="fas fa-file-pdf" style="color:#ef4444;"></i> Download PDF
            </button>
            <button class="btn btn-sm btn-red" style="padding:4px 10px; font-size:11px; background:#ef4444; color:#ffffff; border:none; border-radius:6px; cursor:pointer;" onclick="deleteLabBooking(${b.id})">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderPaginationFooter("labTableBody", pageInfo, "changeLabPage");
}

function changeLabPage(newPage) {
  renderLabTable(currentLabFiltered, newPage);
}

function filterLabTable() {
  const query = (document.getElementById("labSearchInput")?.value || "").toLowerCase().trim();
  const statusFilter = document.getElementById("labStatusFilter")?.value || "ALL";

  let filtered = allLabData.filter(b => {
    const matchesSearch = !query ||
      (b.patient_name || "").toLowerCase().includes(query) ||
      (b.booking_code || "").toLowerCase().includes(query) ||
      (b.test_name || "").toLowerCase().includes(query);

    let matchesStatus = true;
    if (statusFilter !== "ALL") {
      matchesStatus = (b.status || "").toLowerCase().includes(statusFilter.toLowerCase());
    }
    return matchesSearch && matchesStatus;
  });

  renderLabTable(filtered);
}

function downloadLabReportPDF(labRef, patientName, testName, summary, date) {
  const printWindow = window.open('', '_blank', 'width=750,height=850');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Lab Report - ${labRef}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #fff; color: #0f172a; }
        .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 30px; }
        .header { border-bottom: 2px solid #3b82f6; padding-bottom: 15px; display: flex; justify-content: space-between; }
        .title { font-size: 22px; font-weight: 800; color: #0f172a; }
        .title span { color: #3b82f6; }
        .meta { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; background: #f8fafc; padding: 14px; border-radius: 8px; }
        .result-box { margin-top: 20px; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 10px; font-weight: 700; color: #065f46; }
        .footer { margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 15px; font-size: 11px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div>
            <div class="title">AuraCare <span>AI</span> Diagnostic Pathology Labs</div>
            <div style="font-size:12px; color:#64748b;">NABL & ICMR Accredited Hospital Laboratory</div>
          </div>
          <div style="text-align:right; font-size:12px;">
            <strong>Lab Ref:</strong> ${labRef}<br>
            <strong>Date:</strong> ${date}
          </div>
        </div>

        <div class="meta">
          <div><strong>Patient Name:</strong> ${patientName}</div>
          <div><strong>Test Conducted:</strong> ${testName}</div>
          <div><strong>Pathologist Head:</strong> Dr. Karthik Subramanian (MD)</div>
          <div><strong>Status:</strong> COMPLETED & VERIFIED</div>
        </div>

        <h3 style="margin-top:20px; font-size:15px;">Diagnostic Clinical Result Summary:</h3>
        <div class="result-box">
          ${summary}
        </div>

        <div class="footer">
          Computer-generated official diagnostic pathology report. Verified by AuraCare AI Clinical Engine.
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

async function deleteLabBooking(bookingId) {
  if (!confirm("Are you sure you want to delete this lab booking? This action cannot be undone.")) return;
  try {
    const res = await fetch(`/api/lab/bookings/${bookingId}`, { method: 'DELETE' });
    if (res.ok) {
      alert("🗑️ Lab booking deleted successfully!");
      loadLabData();
    } else {
      const data = await res.json();
      alert("Error: " + (data.detail || "Failed to delete lab booking"));
    }
  } catch (err) {
    console.error(err);
    alert("Request failed to delete lab booking.");
  }
}

// Pharmacy Stock Controller
let allPharmacyData = [];

async function loadPharmacyData() {
  try {
    const res = await fetch("/api/pharmacy/items");
    const items = await res.json();
    allPharmacyData = items || [];

    // Calculate Pharmacy KPIs
    let totalQty = 0;
    let lowCount = 0;
    let totalVal = 0;
    const suppliers = new Set();

    allPharmacyData.forEach(i => {
      const q = parseInt(i.stock_qty) || 0;
      const p = parseFloat(i.unit_price) || 0;
      totalQty += q;
      totalVal += (q * p);
      if (q < 200) lowCount++;
      if (i.manufacturer) suppliers.add(i.manufacturer);
    });

    const kpiTotal = document.getElementById("pharmacyKpiTotal");
    const kpiLow = document.getElementById("pharmacyKpiLow");
    const kpiVal = document.getElementById("pharmacyKpiValue");
    const kpiSup = document.getElementById("pharmacyKpiSuppliers");

    if (kpiTotal) kpiTotal.innerText = `${totalQty.toLocaleString()} Units`;
    if (kpiLow) kpiLow.innerText = `${lowCount} Items`;
    if (kpiVal) kpiVal.innerText = `₹${totalVal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
    if (kpiSup) kpiSup.innerText = suppliers.size || 5;

    renderPharmacyTable(allPharmacyData);
  } catch (err) {
    console.error("Error loading pharmacy data:", err);
  }
}

function renderPharmacyTable(list, page = 1) {
  const container = document.getElementById("pharmacyTableBody");
  if (!container) return;
  currentPharmacyFiltered = list || [];
  currentPageState.pharmacy = page;

  if (!list || list.length === 0) {
    container.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">No pharmacy inventory items found matching filter.</td></tr>`;
    renderPaginationFooter("pharmacyTableBody", { totalItems: 0 }, "changePharmacyPage");
    return;
  }

  const pageInfo = getPaginatedItems(list, page, PAGE_SIZE);

  container.innerHTML = pageInfo.items.map(i => {
    const q = parseInt(i.stock_qty) || 0;
    let stockBadge = `<span class="badge badge-green"><i class="fas fa-boxes"></i> ${q} Qty</span>`;
    let statusPill = `<span class="badge badge-green">In Stock</span>`;

    if (q < 50) {
      stockBadge = `<span class="badge badge-red" style="background:#fee2e2; color:#b91c1c;"><i class="fas fa-exclamation-circle"></i> ${q} Qty</span>`;
      statusPill = `<span class="badge badge-red" style="background:#fee2e2; color:#b91c1c;">Critical Low</span>`;
    } else if (q < 200) {
      stockBadge = `<span class="badge badge-orange"><i class="fas fa-exclamation-triangle"></i> ${q} Qty</span>`;
      statusPill = `<span class="badge badge-orange">Re-order Soon</span>`;
    }

    const batchStr = i.batch_no ? `${i.batch_no} • Exp: ${i.expiry_date}` : `Exp: ${i.expiry_date}`;

    return `
      <tr>
        <td><strong style="color:var(--text-dark); font-size:13px;">${i.name}</strong></td>
        <td><span class="badge badge-subtle" style="font-size:11px;">${i.category}</span></td>
        <td><span style="font-size:12px; color:var(--text-muted); font-weight:600;">${batchStr}</span></td>
        <td>${stockBadge}</td>
        <td><strong style="color:var(--text-dark); font-size:13px;">₹${parseFloat(i.unit_price).toFixed(2)}</strong></td>
        <td><span style="font-size:12px; color:var(--text-muted);">${i.manufacturer}</span></td>
        <td style="text-align:right;">
          <div style="display:flex; gap:6px; justify-content:flex-end; align-items:center;">
            ${statusPill}
            <button class="btn btn-sm btn-red" style="padding:4px 10px; font-size:11px; background:#ef4444; color:#ffffff; border:none; border-radius:6px; cursor:pointer;" onclick="deletePharmacyItem(${i.id})">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderPaginationFooter("pharmacyTableBody", pageInfo, "changePharmacyPage");
}

function changePharmacyPage(newPage) {
  renderPharmacyTable(currentPharmacyFiltered, newPage);
}

function filterPharmacyTable() {
  const query = (document.getElementById("pharmacySearchInput")?.value || "").toLowerCase().trim();
  const catFilter = document.getElementById("pharmacyCategoryFilter")?.value || "ALL";

  let filtered = allPharmacyData.filter(i => {
    const matchesSearch = !query ||
      (i.name || "").toLowerCase().includes(query) ||
      (i.category || "").toLowerCase().includes(query) ||
      (i.manufacturer || "").toLowerCase().includes(query);

    let matchesCat = true;
    if (catFilter !== "ALL") {
      matchesCat = (i.category || "").toLowerCase().includes(catFilter.toLowerCase());
    }
    return matchesSearch && matchesCat;
  });

  renderPharmacyTable(filtered);
}

async function deletePharmacyItem(itemId) {
  if (!confirm("Are you sure you want to delete this pharmacy item? This action cannot be undone.")) return;
  try {
    const res = await fetch(`/api/pharmacy/items/${itemId}`, { method: 'DELETE' });
    if (res.ok) {
      alert("🗑️ Pharmacy item deleted successfully!");
      loadPharmacyData();
    } else {
      const data = await res.json();
      alert("Error: " + (data.detail || "Failed to delete pharmacy item"));
    }
  } catch (err) {
    console.error(err);
    alert("Request failed to delete pharmacy item.");
  }
}

// Payments Management Controller & Gateways
let allPaymentsData = [];

async function loadPaymentsData() {
  try {
    const res = await fetch("/api/payments");
    const payments = await res.json();
    allPaymentsData = payments || [];
    
    // Calculate KPIs
    let totalRev = 0;
    let upiRev = 0;
    let cardRev = 0;
    let cashRev = 0;

    allPaymentsData.forEach(p => {
      const amt = parseFloat(p.amount) || 0;
      totalRev += amt;
      const m = (p.payment_method || "").toLowerCase();
      if (m.includes("upi") || m.includes("gpay") || m.includes("google") || m.includes("phonepe") || m.includes("razorpay")) {
        upiRev += amt;
      } else if (m.includes("card") || m.includes("pos") || m.includes("visa") || m.includes("hdfc")) {
        cardRev += amt;
      } else if (m.includes("cash")) {
        cashRev += amt;
      } else {
        upiRev += amt; // default to online
      }
    });

    const kpiTotalEl = document.getElementById("payKpiTotal");
    const kpiUpiEl = document.getElementById("payKpiUpi");
    const kpiCardEl = document.getElementById("payKpiCard");
    const kpiCashEl = document.getElementById("payKpiCash");

    if (kpiTotalEl) kpiTotalEl.innerText = `₹${totalRev.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (kpiUpiEl) kpiUpiEl.innerText = `₹${upiRev.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (kpiCardEl) kpiCardEl.innerText = `₹${cardRev.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    if (kpiCashEl) kpiCashEl.innerText = `₹${cashRev.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    renderPaymentsTable(allPaymentsData);
  } catch (err) {
    console.error("Error loading payments data:", err);
  }
}

function renderPaymentsTable(list, page = 1) {
  const container = document.getElementById("paymentsTableBody");
  if (!container) return;
  currentPaymentsFiltered = list || [];
  currentPageState.payments = page;

  if (!list || list.length === 0) {
    container.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">No transaction logs found matching filter.</td></tr>`;
    renderPaginationFooter("paymentsTableBody", { totalItems: 0 }, "changePaymentsPage");
    return;
  }

  const pageInfo = getPaginatedItems(list, page, PAGE_SIZE);

  container.innerHTML = pageInfo.items.map(p => {
    const m = (p.payment_method || "").toLowerCase();
    let methodBadge = `<span class="badge badge-blue"><i class="fas fa-wallet"></i> ${p.payment_method}</span>`;
    if (m.includes("upi") || m.includes("gpay") || m.includes("razorpay") || m.includes("phonepe")) {
      methodBadge = `<span class="badge badge-green"><i class="fab fa-google-pay"></i> ${p.payment_method}</span>`;
    } else if (m.includes("card") || m.includes("pos") || m.includes("visa") || m.includes("hdfc")) {
      methodBadge = `<span class="badge badge-purple"><i class="fas fa-credit-card"></i> ${p.payment_method}</span>`;
    } else if (m.includes("cash")) {
      methodBadge = `<span class="badge badge-amber" style="background:#fef3c7; color:#b45309;"><i class="fas fa-money-bill-wave"></i> ${p.payment_method}</span>`;
    } else if (m.includes("insurance")) {
      methodBadge = `<span class="badge badge-cyan"><i class="fas fa-shield-alt"></i> ${p.payment_method}</span>`;
    }

    const statusBadge = p.status === 'Completed'
      ? `<span class="badge badge-green"><i class="fas fa-check-circle"></i> Completed</span>`
      : `<span class="badge badge-orange"><i class="fas fa-clock"></i> ${p.status}</span>`;

    const invId = p.invoice_id || `INV-${1000 + p.id}`;
    const formattedAmt = parseFloat(p.amount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});

    return `
      <tr>
        <td><strong style="color:var(--text-dark); font-family:monospace; font-size:13px;">${p.transaction_ref}</strong></td>
        <td><span style="font-size:12px; color:var(--text-muted); font-weight:600;">${invId}</span></td>
        <td><strong style="color:var(--text-dark); font-size:13px;">${p.patient_name}</strong></td>
        <td><strong style="color:var(--text-dark); font-size:14px;">₹${formattedAmt}</strong></td>
        <td>${methodBadge}</td>
        <td>${statusBadge}</td>
        <td><span style="font-size:12px; color:var(--text-muted);">${p.date}</span></td>
        <td style="text-align:right;">
          <div style="display:flex; gap:6px; justify-content:flex-end; align-items:center;">
            <button class="btn-secondary" style="font-size:11px; padding:4px 10px;" onclick="printPaymentReceipt('${p.transaction_ref}', '${p.patient_name.replace(/'/g, "\\'")}', '${p.amount}', '${p.payment_method.replace(/'/g, "\\'")}', '${p.date}', '${invId}')">
              <i class="fas fa-print"></i> Receipt
            </button>
            <button class="btn btn-sm btn-red" style="padding:4px 10px; font-size:11px; background:#ef4444; color:#ffffff; border:none; border-radius:6px; cursor:pointer;" onclick="deletePayment(${p.id})">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderPaginationFooter("paymentsTableBody", pageInfo, "changePaymentsPage");
}

function changePaymentsPage(newPage) {
  renderPaymentsTable(currentPaymentsFiltered, newPage);
}

function filterPaymentsTable() {
  const query = (document.getElementById("paySearchInput")?.value || "").toLowerCase().trim();
  const methodFilter = document.getElementById("payMethodFilter")?.value || "ALL";

  let filtered = allPaymentsData.filter(p => {
    const matchesSearch = !query || 
      (p.patient_name || "").toLowerCase().includes(query) || 
      (p.transaction_ref || "").toLowerCase().includes(query) ||
      (p.invoice_id || "").toLowerCase().includes(query);

    let matchesMethod = true;
    if (methodFilter !== "ALL") {
      const m = (p.payment_method || "").toLowerCase();
      const mf = methodFilter.toLowerCase();
      matchesMethod = m.includes(mf);
    }
    return matchesSearch && matchesMethod;
  });

  renderPaymentsTable(filtered);
}

async function deletePayment(paymentId) {
  if (!confirm("Are you sure you want to delete this payment record? This action cannot be undone.")) return;
  try {
    const res = await fetch(`/api/payments/${paymentId}`, { method: 'DELETE' });
    if (res.ok) {
      alert("🗑️ Payment record deleted successfully!");
      loadPaymentsData();
    } else {
      const data = await res.json();
      alert("Error: " + (data.detail || "Failed to delete payment"));
    }
  } catch (err) {
    console.error(err);
    alert("Request failed to delete payment.");
  }
}

async function submitQuickPayment() {
  const invoice_id = document.getElementById("payInvoiceId").value;
  const patient_name = document.getElementById("payPatientName").value;
  const amount = parseFloat(document.getElementById("payAmount").value);
  const payment_method = document.getElementById("payMethod").value;

  if (!patient_name || isNaN(amount) || amount <= 0) {
    alert("Please enter a valid Patient Name and Payment Amount.");
    return;
  }

  try {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice_id, patient_name, amount, payment_method })
    });
    const data = await res.json();

    if (data.success) {
      alert(`✅ Payment Processed Successfully!\n\nTxn Ref: ${data.transaction_ref}\nPatient: ${patient_name}\nAmount: ₹${amount.toFixed(2)}\nGateway: ${payment_method}\n\nStatus: Completed`);
      
      // Auto increment next invoice ID
      const numMatch = invoice_id.match(/\d+/);
      if (numMatch) {
        const nextNum = parseInt(numMatch[0]) + 1;
        document.getElementById("payInvoiceId").value = `INV-${nextNum}`;
      }

      await loadPaymentsData();
    } else {
      alert("Failed to process payment. Please try again.");
    }
  } catch (err) {
    console.error("Payment error:", err);
    alert("Server error processing payment.");
  }
}

function toggleUpiQrModal() {
  const modal = document.getElementById("upiQrModal");
  if (!modal) return;
  modal.classList.toggle("active");

  if (modal.classList.contains("active")) {
    const amount = parseFloat(document.getElementById("payAmount")?.value) || 1500;
    const patientName = document.getElementById("payPatientName")?.value || "Patient";
    const amountStr = `₹${amount.toFixed(2)}`;
    
    document.getElementById("upiModalAmount").innerText = amountStr;
    const upiUri = `upi://pay?pa=auracare@icici&pn=AuraCare%20AI%20Hospital&am=${amount.toFixed(2)}&cu=INR&tn=Invoice%20Payment%20${encodeURIComponent(patientName)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiUri)}`;
    
    const qrImg = document.getElementById("upiQrImage");
    if (qrImg) qrImg.src = qrUrl;
  }
}

function printPaymentReceipt(txnRef, patientName, amount, method, date, invId) {
  const formattedAmt = parseFloat(amount).toLocaleString('en-IN', {minimumFractionDigits: 2});
  const printWindow = window.open('', '_blank', 'width=700,height=800');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Receipt - ${txnRef}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #f8fafc; color: #1e293b; }
        .receipt-card { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 36px; max-width: 580px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
        .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 20px; margin-bottom: 24px; }
        .brand { font-size: 24px; font-weight: 800; color: #0f172a; }
        .brand span { color: #10b981; }
        .subtext { font-size: 13px; color: #64748b; margin-top: 4px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
        .label { color: #64748b; font-weight: 500; }
        .val { font-weight: 700; color: #0f172a; }
        .total-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center; }
        .total-title { font-size: 12px; color: #047857; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
        .total-amount { font-size: 28px; font-weight: 900; color: #064e3b; margin-top: 4px; }
        .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        .btn-print { background: #0f172a; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; margin-top: 20px; }
        @media print { .btn-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="header">
          <div class="brand">AuraCare <span>AI</span> Hospital</div>
          <div class="subtext">Multi-Specialty Super Specialty Hospital & Research Center</div>
          <div style="font-size:11px; color:#94a3b8; margin-top:4px;">GSTIN: 33AAAAA0000A1Z5 • 24x7 Helpline: +91 98765 43210</div>
        </div>

        <div style="text-align:center; font-weight:800; font-size:16px; color:#047857; margin-bottom:16px;">
          OFFICIAL PAYMENT RECEIPT
        </div>

        <div class="row"><span class="label">Transaction Reference</span><span class="val" style="font-family:monospace;">${txnRef}</span></div>
        <div class="row"><span class="label">Invoice Number</span><span class="val">${invId || 'INV-5501'}</span></div>
        <div class="row"><span class="label">Patient Name</span><span class="val">${patientName}</span></div>
        <div class="row"><span class="label">Payment Method</span><span class="val">${method}</span></div>
        <div class="row"><span class="label">Transaction Status</span><span class="val" style="color:#10b981;">SUCCESS / COMPLETED</span></div>
        <div class="row"><span class="label">Date & Time</span><span class="val">${date}</span></div>

        <div class="total-box">
          <div class="total-title">Amount Received In Full</div>
          <div class="total-amount">₹${formattedAmt}</div>
        </div>

        <div class="footer">
          <div>This is a computer-generated digital receipt. Verified by AuraCare AI Gateway.</div>
          <div>Thank you for choosing AuraCare AI Hospital. Wish you good health!</div>
          <button class="btn-print" onclick="window.print()">Print Receipt 🖨️</button>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}

async function loadWhatsAppBookedPatients(page = 1) {
  try {
    const filterInput = document.getElementById("waDateFilter");
    let targetDate = "";
    if (filterInput) {
      targetDate = filterInput.value;
    }

    console.log("Loading WhatsApp booked patients...");
    const res = await fetch("/api/appointments");
    const appts = await res.json();
    const container = document.getElementById("waBookedPatientsBody");
    const emptyMsg = document.getElementById("waBookedEmpty");
    if (!container) return;

    const waBookings = appts.filter(a => {
      const isWhatsApp = a.booking_source === 'WhatsApp' || a.patient_email === 'whatsapp.patient@auracare.ai' || (a.booking_code && a.booking_code.startsWith('AURA-B'));
      const dateMatch = !targetDate || (a.appointment_date === targetDate);
      return isWhatsApp && dateMatch;
    });

    currentWhatsAppFiltered = waBookings;
    currentPageState.whatsapp = page;

    if (waBookings.length === 0) {
      container.innerHTML = '';
      if (emptyMsg) emptyMsg.style.display = 'block';
      renderPaginationFooter("waBookedPatientsBody", { totalItems: 0 }, "changeWhatsAppPage");
      return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';
    const pageInfo = getPaginatedItems(waBookings, page, PAGE_SIZE);

    container.innerHTML = pageInfo.items.map((a, i) => {
      const rowIdx = (pageInfo.startIdx + i);
      const phone = a.patient_phone || 'N/A';
      const name = a.patient_name || 'N/A';
      const docName = a.doctor_name || 'N/A';
      const deptName = a.department_name || 'N/A';
      const apptDate = a.appointment_date || 'N/A';
      const timeSlot = a.time_slot || 'N/A';
      const symptoms = a.symptoms || 'N/A';
      const code = a.booking_code || 'N/A';
      const status = a.status || 'Scheduled';
      
      const badgeClass = status === 'Completed' ? 'badge-green' : status === 'In Consultation' ? 'badge-orange' : 'badge-lime';

      return `
        <tr>
          <td>${rowIdx}</td>
          <td><strong style="color:var(--text-dark);">${name}</strong></td>
          <td><span style="color:#25d366; font-weight:600;"><i class="fab fa-whatsapp"></i> ${phone}</span></td>
          <td>${docName}</td>
          <td><span style="font-size:11px; color:var(--text-muted);">${deptName}</span></td>
          <td>${apptDate}<br><span style="font-size:11px; color:var(--text-muted);">${timeSlot}</span></td>
          <td>${symptoms}</td>
          <td><strong style="color:var(--text-dark);">${code}</strong></td>
          <td><span class="badge ${badgeClass}">${status}</span></td>
          <td>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-sm btn-blue" style="padding:4px 8px; font-size:12px;" onclick="openEditApptModal(${a.id})"><i class="fas fa-edit"></i> Edit</button>
              <button class="btn btn-sm btn-red" style="padding:5px 10px; font-size:12px; background:#ef4444 !important; color:#ffffff !important; border:none !important; border-radius:6px; cursor:pointer; font-weight:600;" onclick="deleteAppointment(${a.id})"><i class="fas fa-trash"></i> Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    renderPaginationFooter("waBookedPatientsBody", pageInfo, "changeWhatsAppPage");
  } catch (err) {
    console.error(err);
  }
}

function changeWhatsAppPage(newPage) {
  loadWhatsAppBookedPatients(newPage);
}

// Add WhatsApp Booking Manually Handlers
async function openAddBookingModal() {
  try {
    // Clear and set defaults
    document.getElementById("addApptPatientName").value = "";
    document.getElementById("addApptPatientAge").value = "";
    document.getElementById("addApptPatientGender").value = "Male";
    document.getElementById("addApptPatientPhone").value = "";
    document.getElementById("addApptSymptoms").value = "";
    document.getElementById("addApptTimeSlot").value = "10:00 AM";
    
    // Set date to today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("addApptDate").value = today;

    // Fetch doctors and populate select element
    try {
      const res = await fetch("/api/doctors");
      const doctors = await res.json();
      const selectEl = document.getElementById("addApptDoctorId");
      if (selectEl && doctors && doctors.length > 0) {
        selectEl.innerHTML = doctors.map(d => `<option value="${d.id}">${d.name} (${d.specialty})</option>`).join('');
      }
    } catch (e) {
      const selectEl = document.getElementById("addApptDoctorId");
      if (selectEl) {
        selectEl.innerHTML = `
          <option value="1">Dr. Rajesh Kumar (Cardiology)</option>
          <option value="2">Dr. Ananya Sharma (Pediatrics)</option>
          <option value="3">Dr. Vikramaditya (Neurology)</option>
        `;
      }
    }

    document.getElementById("addAppointmentModal").classList.add("active");
  } catch (err) {
    console.error("Failed to initialize booking form:", err);
    document.getElementById("addAppointmentModal").classList.add("active");
  }
}

function closeAddApptModal() {
  document.getElementById("addAppointmentModal").classList.remove("active");
}

function clearAddApptForm() {
  const fieldsToClear = [
    "addApptPatientName", "addApptPatientAge", "addApptPatientPhone", "addApptSymptoms",
    "pageAddApptPatientName", "pageAddApptAge", "pageAddApptPhone", "pageAddApptSymptoms"
  ];
  fieldsToClear.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  
  // Reset selects to defaults
  ["addApptPatientGender", "pageAddApptGender"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "Male";
  });
  ["addApptTimeSlot", "pageAddApptTime"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "10:00 AM";
  });
  
  const today = new Date().toISOString().split('T')[0];
  ["addApptDate", "pageAddApptDate"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = today;
  });

  // Reset doctor selects
  ["addApptDoctorId", "pageAddApptDoctor"].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.options.length > 0) el.selectedIndex = 0;
  });
}

async function submitAddAppt() {
  const modal = document.getElementById("addAppointmentModal");
  const isModalActive = modal && modal.classList.contains("active");

  let patientName = "", rawPhone = "", doctorId = "", apptDate = "", timeSlot = "", patientAge = 30, patientGender = "Male", symptoms = "";

  if (isModalActive) {
    patientName = (document.getElementById("addApptPatientName")?.value || "").trim();
    rawPhone = (document.getElementById("addApptPatientPhone")?.value || "").trim();
    doctorId = document.getElementById("addApptDoctorId")?.value || "1";
    apptDate = document.getElementById("addApptDate")?.value || new Date().toISOString().split('T')[0];
    timeSlot = document.getElementById("addApptTimeSlot")?.value || "10:00 AM";
    patientAge = parseInt(document.getElementById("addApptPatientAge")?.value) || 30;
    patientGender = document.getElementById("addApptPatientGender")?.value || "Male";
    symptoms = (document.getElementById("addApptSymptoms")?.value || "").trim();
  } else {
    patientName = (document.getElementById("pageAddApptPatientName") || document.getElementById("addApptPatientName"))?.value.trim() || "";
    rawPhone = (document.getElementById("pageAddApptPhone") || document.getElementById("addApptPatientPhone"))?.value.trim() || "";
    doctorId = (document.getElementById("pageAddApptDoctor") || document.getElementById("addApptDoctorId"))?.value || "1";
    apptDate = (document.getElementById("pageAddApptDate") || document.getElementById("addApptDate"))?.value || new Date().toISOString().split('T')[0];
    timeSlot = (document.getElementById("pageAddApptTime") || document.getElementById("addApptTimeSlot"))?.value || "10:00 AM";
    patientAge = parseInt((document.getElementById("pageAddApptAge") || document.getElementById("addApptPatientAge"))?.value) || 30;
    patientGender = (document.getElementById("pageAddApptGender") || document.getElementById("addApptPatientGender"))?.value || "Male";
    symptoms = (document.getElementById("pageAddApptSymptoms") || document.getElementById("addApptSymptoms"))?.value.trim() || "";
  }

  const patientPhone = rawPhone.replace(/[^0-9]/g, '').slice(0, 10);
  
  if (!patientName || !patientPhone) {
    alert("Patient Name and Phone Number are required!");
    return;
  }
  if (patientPhone.length !== 10) {
    alert("⚠️ Mobile number must be exactly 10 digits (e.g. 9876543210)!");
    return;
  }

  const payload = {
    doctor_id: parseInt(doctorId) || 1,
    appointment_date: apptDate,
    time_slot: timeSlot,
    patient_name: patientName,
    patient_age: patientAge,
    patient_gender: patientGender,
    patient_phone: patientPhone,
    patient_email: "manual.opd@auracare.ai", // Manual OPD Booking (NOT WhatsApp)
    symptoms: symptoms || "No symptoms specified",
    triage_level: "Routine",
    urgency_score: 1,
    payment_method: "UPI",
    booking_source: "Manual"
  };

  try {
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    if (res.ok && data.success) {
      alert("🎉 Appointment booking created successfully!");
      
      // Clear form fields after success
      clearAddApptForm();

      // Update table date filter to match the newly added booking's date
      const filterInput = document.getElementById("queueDateFilter");
      if (filterInput && payload.appointment_date) {
        filterInput.value = payload.appointment_date;
      }
      const waFilterInput = document.getElementById("waDateFilter");
      if (waFilterInput && payload.appointment_date) {
        waFilterInput.value = payload.appointment_date;
      }

      closeAddApptModal();
      loadQueueData(); // Reload Queue Board list immediately!
      
      if (typeof loadWhatsAppBookedPatients === 'function') {
        loadWhatsAppBookedPatients();
      }
      
      // Update notifications list if exists
      if (typeof checkNewWhatsAppBookings === 'function') {
        checkNewWhatsAppBookings();
      }
    } else {
      alert("Error: " + (data.detail || "Failed to create appointment booking"));
    }
  } catch (err) {
    console.error("Error creating booking:", err);
    alert("Request failed. Please try again.");
  }
}

// Edit/Delete WhatsApp Booking Handlers
async function openEditApptModal(apptId) {
  try {
    const res = await fetch(`/api/appointments/${apptId}`);
    const a = await res.json();
    if (!a || !a.id) return;

    // Populate Modal inputs
    const editId = document.getElementById("editApptId");
    if (editId) editId.value = a.id;
    const editName = document.getElementById("editApptPatientName");
    if (editName) editName.value = a.patient_name || '';
    const editPhone = document.getElementById("editApptPatientPhone");
    if (editPhone) editPhone.value = a.patient_phone || '';
    const editSymp = document.getElementById("editApptSymptoms");
    if (editSymp) editSymp.value = a.symptoms || '';
    const editDate = document.getElementById("editApptDate");
    if (editDate) editDate.value = a.appointment_date || '';
    const editTime = document.getElementById("editApptTimeSlot");
    if (editTime) editTime.value = a.time_slot || '10:00 AM';
    const editStatus = document.getElementById("editApptStatus");
    if (editStatus) editStatus.value = a.status || 'Scheduled';

    // Populate Standalone Full Page View inputs
    const pageId = document.getElementById("pageEditApptId");
    if (pageId) pageId.value = a.id;
    const pageName = document.getElementById("pageEditApptPatientName");
    if (pageName) pageName.value = a.patient_name || '';
    const pagePhone = document.getElementById("pageEditApptPatientPhone");
    if (pagePhone) pagePhone.value = a.patient_phone || '';
    const pageSymp = document.getElementById("pageEditApptSymptoms");
    if (pageSymp) pageSymp.value = a.symptoms || '';
    const pageDate = document.getElementById("pageEditApptDate");
    if (pageDate) pageDate.value = a.appointment_date || '';
    const pageTime = document.getElementById("pageEditApptTimeSlot");
    if (pageTime) pageTime.value = a.time_slot || '10:00 AM';
    const pageStatus = document.getElementById("pageEditApptStatus");
    if (pageStatus) pageStatus.value = a.status || 'Scheduled';

    // Open dedicated standalone full page view!
    switchView('edit-appointment');
  } catch (err) {
    console.error(err);
    alert("Failed to load booking details.");
  }
}

function closeEditApptModal() {
  const modal = document.getElementById("editAppointmentModal");
  if (modal) modal.classList.remove("active");
  switchView('queue');
}

async function submitEditAppt() {
  const modal = document.getElementById("editAppointmentModal");
  const isModalActive = modal && modal.classList.contains("active");

  let apptId = "", name = "", rawPhone = "", symptoms = "", status = "Scheduled", date = "", time = "10:00 AM";

  if (isModalActive) {
    apptId = document.getElementById("editApptId")?.value || "";
    name = (document.getElementById("editApptPatientName")?.value || "").trim();
    rawPhone = (document.getElementById("editApptPatientPhone")?.value || "").trim();
    symptoms = (document.getElementById("editApptSymptoms")?.value || "").trim();
    status = document.getElementById("editApptStatus")?.value || "Scheduled";
    date = document.getElementById("editApptDate")?.value || "";
    time = document.getElementById("editApptTimeSlot")?.value || "10:00 AM";
  } else {
    apptId = (document.getElementById("pageEditApptId") || document.getElementById("editApptId"))?.value || "";
    name = (document.getElementById("pageEditApptPatientName") || document.getElementById("editApptPatientName"))?.value.trim() || "";
    rawPhone = (document.getElementById("pageEditApptPatientPhone") || document.getElementById("editApptPatientPhone"))?.value.trim() || "";
    symptoms = (document.getElementById("pageEditApptSymptoms") || document.getElementById("editApptSymptoms"))?.value.trim() || "";
    status = (document.getElementById("pageEditApptStatus") || document.getElementById("editApptStatus"))?.value || "Scheduled";
    date = (document.getElementById("pageEditApptDate") || document.getElementById("editApptDate"))?.value || "";
    time = (document.getElementById("pageEditApptTimeSlot") || document.getElementById("editApptTimeSlot"))?.value || "10:00 AM";
  }

  const patientPhone = rawPhone.replace(/[^0-9]/g, '').slice(0, 10);

  if (!name || !patientPhone) {
    alert("Name and Phone fields are required!");
    return;
  }
  if (patientPhone.length !== 10) {
    alert("⚠️ Mobile number must be exactly 10 digits (e.g. 9876543210)!");
    return;
  }

  const payload = {
    patient_name: name,
    patient_phone: patientPhone,
    symptoms: symptoms,
    status: status,
    appointment_date: date,
    time_slot: time
  };

  try {
    const res = await fetch(`/api/appointments/${apptId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.ok) {
      
      closeEditApptModal();
      loadQueueData(); // Refresh Queue Board
      
      if (typeof loadWhatsAppBookedPatients === 'function') {
        loadWhatsAppBookedPatients();
      }
    } else {
      alert("Error: " + (result.message || "Failed to update booking"));
    }
  } catch (err) {
    console.error(err);
    alert("Request failed to update booking.");
  }
}

async function deleteAppointment(apptId) {
  if (!confirm("Are you sure you want to delete this booking? This action cannot be undone.")) {
    return;
  }

  try {
    const res = await fetch(`/api/appointments/${apptId}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (res.ok) {
      alert("Booking deleted successfully!");
      if (typeof loadQueueData === 'function') loadQueueData();
      if (typeof loadWhatsAppBookedPatients === 'function') loadWhatsAppBookedPatients();
      if (typeof loadPrescriptionsData === 'function') loadPrescriptionsData();
      if (typeof loadDashboardData === 'function') loadDashboardData();
    } else {
      alert("Error: " + (result.detail || result.message || "Failed to delete booking"));
    }
  } catch (err) {
    console.error(err);
    alert("Request failed to delete booking.");
  }
}

// WhatsApp Appointment Booking Notifications Engine
let seenNotifications = [];
let alertedNotifications = [];

function initNotificationEngine() {
  // Load previously seen notification booking codes from localStorage
  const savedSeen = localStorage.getItem('auracare_seen_bookings');
  if (savedSeen) {
    try {
      seenNotifications = JSON.parse(savedSeen);
    } catch(e) {
      seenNotifications = [];
    }
  }
  const savedAlerted = localStorage.getItem('auracare_alerted_bookings');
  if (savedAlerted) {
    try {
      alertedNotifications = JSON.parse(savedAlerted);
    } catch(e) {
      alertedNotifications = [...seenNotifications];
    }
  } else {
    alertedNotifications = [...seenNotifications];
  }

  // Initial fetch
  checkNewWhatsAppBookings();

  // Poll for new bookings every 10 seconds
  setInterval(checkNewWhatsAppBookings, 10000);

  // Close notification dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notiDropdown');
    const bellBtn = document.getElementById('notiBellBtn');
    if (dropdown && dropdown.classList.contains('active') && !dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

function toggleNotificationDropdown(event) {
  event.stopPropagation();
  const dropdown = document.getElementById('notiDropdown');
  if (!dropdown) return;
  
  dropdown.classList.toggle('active');
  
  // When opened, hide notification dot (marks them as viewed/read)
  if (dropdown.classList.contains('active')) {
    const dot = document.getElementById('notiDot');
    if (dot) dot.style.display = 'none';
  }
}

async function checkNewWhatsAppBookings() {
  try {
    const currentRole = localStorage.getItem('auracare_user_role') || (typeof selectedLoginRole !== 'undefined' ? selectedLoginRole : 'DOCTOR');
    const isDoctor = (currentRole === 'DOCTOR' || currentRole === 'Doctor' || currentRole === 'ADMIN');
    const isStaff = (currentRole === 'STAFF' || currentRole === 'Staff' || currentRole === 'RECEPTION');

    const dot = document.getElementById('notiDot');
    const notiList = document.getElementById('notiList');

    // Hide for roles other than Doctor and Staff
    if (!isDoctor && !isStaff) {
      if (dot) dot.style.display = 'none';
      if (notiList) notiList.innerHTML = '<div class="noti-empty"><i class="fas fa-user-shield" style="color:#64748b; margin-right:6px;"></i>Notifications active for Doctor & Reception staff only.</div>';
      return;
    }

    const res = await fetch("/api/appointments");
    const appts = await res.json();
    const todayStr = new Date().toISOString().split('T')[0];

    // Notification Matrix:
    // - DOCTOR Login: Manual OPD + WhatsApp Bookings
    // - STAFF Login: WhatsApp Bookings ONLY (Exclude Manual)
    const filteredBookings = appts.filter(a => {
      const isTodayOrFuture = (a.appointment_date >= todayStr || a.date >= todayStr);
      if (!isTodayOrFuture) return false;

      const isManual = (
        (a.patient_email && (a.patient_email.includes('manual') || a.patient_email === 'manual.opd@auracare.ai')) ||
        (a.booking_code && a.booking_code.startsWith('MAN-'))
      );

      if (isDoctor) {
        return true; // Doctor gets Manual + WhatsApp
      } else if (isStaff) {
        return !isManual; // Staff gets WhatsApp ONLY
      }
      return false;
    });

    if (!notiList) return;

    if (filteredBookings.length === 0) {
      notiList.innerHTML = `<div class="noti-empty"><i class="fas fa-calendar-day" style="color:#0284c7; margin-right:6px;"></i>No ${isStaff ? 'WhatsApp ' : ''}bookings for today.</div>`;
      if (dot) dot.style.display = 'none';
      return;
    }

    // Sort newest first
    filteredBookings.sort((a, b) => b.id - a.id);

    // Render list items
    let html = '';
    filteredBookings.forEach(b => {
      const isUnread = !seenNotifications.includes(b.booking_code);
      const isManual = (b.patient_email && (b.patient_email.includes('manual') || b.patient_email === 'manual.opd@auracare.ai'));
      
      const badgeText = isManual ? 'Manual OPD' : 'WhatsApp';
      const badgeBg = isManual ? '#fef3c7' : '#e0f2fe';
      const badgeColor = isManual ? '#d97706' : '#0c8ee6';

      html += `
        <div class="noti-item ${isUnread ? 'unread' : ''}" onclick="handleNotiClick('${b.booking_code}')" style="${isUnread ? 'border-left: 4px solid #0c8ee6; background: #f0f9ff; padding: 10px 14px; margin-bottom: 6px; border-radius: 8px;' : 'padding: 10px 14px; margin-bottom: 6px; border-radius: 8px;'}">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color: #0f172a;">${b.patient_name}</strong>
            <span class="badge" style="background:${badgeBg}; color:${badgeColor}; font-size:10px; padding:2px 8px; border-radius:12px; font-weight:600;">${badgeText}</span>
          </div>
          <div style="font-size:12px; color:#475569; margin-top:2px;">
            Booked ${b.doctor_name || 'Doctor'} (${b.department_name || 'OPD'})
          </div>
          <div style="font-size:11px; color:#64748b; margin-top:3px; font-family:var(--font-mono);">
            ${b.appointment_date || 'Today'} @ ${b.time_slot || '10:00 AM'} | Code: ${b.booking_code}
          </div>
        </div>
      `;
    });
    notiList.innerHTML = html;

    // Trigger loud audio alert for new un-alerted WhatsApp bookings
    const unalertedBookings = filteredBookings.filter(b => !alertedNotifications.includes(b.booking_code));
    if (unalertedBookings.length > 0) {
      unalertedBookings.forEach(b => alertedNotifications.push(b.booking_code));
      localStorage.setItem('auracare_alerted_bookings', JSON.stringify(alertedNotifications));
      playWhatsAppNotificationAlert(unalertedBookings.length);
    }

    // Check if there are unseen bookings for current role
    let hasNewUnseen = filteredBookings.some(b => !seenNotifications.includes(b.booking_code));
    const dropdown = document.getElementById('notiDropdown');
    if (dot) {
      dot.style.display = (hasNewUnseen && (!dropdown || !dropdown.classList.contains('active'))) ? 'block' : 'none';
    }

  } catch (err) {
    console.error("Error in checkNewWhatsAppBookings:", err);
  }
}

function handleNotiClick(bookingCode) {
  // Mark as seen
  if (!seenNotifications.includes(bookingCode)) {
    seenNotifications.push(bookingCode);
    localStorage.setItem('auracare_seen_bookings', JSON.stringify(seenNotifications));
  }
  
  // Refresh notifications list to update borders
  checkNewWhatsAppBookings();
  
  // Close dropdown
  const dropdown = document.getElementById('notiDropdown');
  if (dropdown) dropdown.classList.remove('active');
  
  // Switch to WhatsApp Booked Patients view
  switchView('whatsapp');
}

function clearNotifications(event) {
  if (event) event.stopPropagation();
  
  // Fetch current appointments to add all of their booking codes
  fetch("/api/appointments")
    .then(res => res.json())
    .then(appts => {
      appts.forEach(a => {
        if (!seenNotifications.includes(a.booking_code)) {
          seenNotifications.push(a.booking_code);
        }
        if (!alertedNotifications.includes(a.booking_code)) {
          alertedNotifications.push(a.booking_code);
        }
      });
      localStorage.setItem('auracare_seen_bookings', JSON.stringify(seenNotifications));
      localStorage.setItem('auracare_alerted_bookings', JSON.stringify(alertedNotifications));
      checkNewWhatsAppBookings();
      showToast('Notifications Cleared', 'All WhatsApp booking notifications marked as read.', 'info', 3000);
      
      const dot = document.getElementById('notiDot');
      if (dot) dot.style.display = 'none';
    })
    .catch(err => console.error("Error clearing notifications:", err));
}

// ==========================================
// THEME & SETTINGS CONTROL PANEL ENGINE
// ==========================================

// 1. WhatsApp Booking Tone & Alert Sound Generator (using Web Audio API)
let globalAudioCtx = null;
function unlockAudioEngine() {
  try {
    if (!globalAudioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) globalAudioCtx = new AudioContext();
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }
  } catch(e) {}
}
document.addEventListener('click', unlockAudioEngine, { once: true });
document.addEventListener('keydown', unlockAudioEngine, { once: true });

function playNotificationSound(tone = 'chime', volume = 80) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = globalAudioCtx || new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const gainNode = ctx.createGain();
    const vol = Math.max(0, Math.min(100, parseInt(volume) || 100)) / 100;
    gainNode.gain.setValueAtTime(vol * 1.0, ctx.currentTime);
    gainNode.connect(ctx.destination);

    if (tone === 'ping') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.connect(gainNode);
      osc.start();
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      osc.stop(ctx.currentTime + 0.45);
    } else if (tone === 'bell') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc2.frequency.setValueAtTime(1046.50, ctx.currentTime);
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      osc1.start();
      osc2.start();
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
      osc1.stop(ctx.currentTime + 0.75);
      osc2.stop(ctx.currentTime + 0.75);
    } else if (tone === 'pulse') {
      [0, 0.15].forEach(offset => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + offset);
        osc.connect(gainNode);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.1);
      });
    } else {
      // Default 'chime' (ascending 3-note chime C5 -> E5 -> G5)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        osc.connect(gainNode);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.15);
      });
    }
  } catch (err) {
    console.error("Audio error:", err);
  }
}

function setToggle(groupId, clickedEl, val) {
  const group = document.getElementById(groupId);
  if (!group) return;
  Array.from(group.children).forEach(c => c.classList.remove('active'));
  if (clickedEl) clickedEl.classList.add('active');
}

function testAlertSoundAndVibe(volumeVal) {
  const tone = document.getElementById('settingWaTone')?.value || 'chime';
  playNotificationSound(tone, volumeVal);

  const vibeToggle = document.getElementById('vibeToggle');
  const activeVibe = vibeToggle?.querySelector('.active')?.innerText;
  if (activeVibe === 'ON' && navigator.vibrate) {
    navigator.vibrate([40, 30, 40]);
  }
  showToast('Audio & Vibration Test 🔊', `WhatsApp Booking Tone: ${tone.toUpperCase()} (Volume: ${volumeVal}%)`, 'info', 3500);
}

function playWhatsAppNotificationAlert(newBookingsCount) {
  const settingsStr = localStorage.getItem('auracare_settings');
  let tone = 'chime';
  let volume = 80;
  let vibe = 'ON';
  let soundAlert = 'ON';
  if (settingsStr) {
    try {
      const s = JSON.parse(settingsStr);
      if (s.waTone) tone = s.waTone;
      if (s.waVolume) volume = s.waVolume;
      if (s.vibration) vibe = s.vibration;
      if (s.soundAlert) soundAlert = s.soundAlert;
    } catch (e) {}
  }
  if (soundAlert === 'OFF') {
    return; // Silent mode - Sound Alert is turned OFF in Settings!
  }
  playNotificationSound(tone, volume);
  if (vibe === 'ON' && navigator.vibrate) {
    navigator.vibrate([50, 40, 50, 40, 50]);
  }
}

function isLightColor(hex) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return false;
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = parseInt(c.slice(0, 2), 16) || 0;
  const g = parseInt(c.slice(2, 4), 16) || 0;
  const b = parseInt(c.slice(4, 6), 16) || 0;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b);
  return lum > 180;
}

function updateCustomTheme(type, colorVal) {
  let themeMap = {};
  try { themeMap = JSON.parse(localStorage.getItem('auracare_custom_theme_colors') || '{}'); } catch(e){}

  if (type === 'sidebar') {
    themeMap['--bg-sidebar'] = colorVal;
    document.documentElement.style.setProperty('--bg-sidebar', colorVal);
    const picker = document.getElementById('pickerSidebar');
    if (picker) picker.value = colorVal;

    let sEl = document.getElementById('custom-sidebar-override');
    if (!sEl) {
      sEl = document.createElement('style');
      sEl.id = 'custom-sidebar-override';
      document.head.appendChild(sEl);
    }
    const isLight = (colorVal === '#ffffff' || colorVal === '#f8fafc' || colorVal.toLowerCase() === '#fff');
    sEl.innerHTML = `
      html, body, #app { margin: 0 !important; padding: 0 !important; }
      body:not(.dark-theme) .sidebar, body:not(.dark-theme) #sidebarEl,
      body:not(.dark-theme).pro-clinic-theme .sidebar, body:not(.dark-theme).pro-clinic-theme #sidebarEl,
      body:not(.dark-theme).sky-aqua-theme .sidebar, body:not(.dark-theme).sky-aqua-theme #sidebarEl {
        background: ${colorVal} !important;
        border-right: 1px solid ${isLight ? '#e2e8f0' : '#1e293b'} !important;
      }
      body:not(.dark-theme) .sidebar .brand-name, body:not(.dark-theme) #sidebarEl .brand-name,
      body:not(.dark-theme).pro-clinic-theme .sidebar .brand-name, body:not(.dark-theme).sky-aqua-theme .sidebar .brand-name {
        color: ${isLight ? '#0f2942' : '#ffffff'} !important;
      }
      body:not(.dark-theme) .sidebar .nav-item, body:not(.dark-theme) #sidebarEl .nav-item,
      body:not(.dark-theme).pro-clinic-theme .nav-item {
        color: ${isLight ? '#475569' : '#9eb9cb'} !important;
      }
      body:not(.dark-theme) .sidebar .nav-item:hover, body:not(.dark-theme) #sidebarEl .nav-item:hover,
      body:not(.dark-theme).pro-clinic-theme .nav-item:hover {
        background: ${isLight ? '#f1f5f9' : 'rgba(255,255,255,0.1)'} !important;
        color: ${isLight ? '#0f172a' : '#ffffff'} !important;
      }
    `;
  } else if (type === 'card') {
    themeMap['--bg-card'] = colorVal;
    themeMap['--bg-modal'] = colorVal;
    document.documentElement.style.setProperty('--bg-card', colorVal);
    document.documentElement.style.setProperty('--bg-modal', colorVal);
    const picker = document.getElementById('pickerCard');
    if (picker) picker.value = colorVal;

    let cEl = document.getElementById('custom-card-override');
    if (!cEl) {
      cEl = document.createElement('style');
      cEl.id = 'custom-card-override';
      document.head.appendChild(cEl);
    }
    cEl.innerHTML = `
      body:not(.dark-theme) .kpi-card-lodgify,
      body:not(.dark-theme) .card-box,
      body:not(.dark-theme) .uiux-theme-card,
      body:not(.dark-theme) .widget-card,
      body:not(.dark-theme).pro-clinic-theme .kpi-card-lodgify,
      body:not(.dark-theme).pro-clinic-theme .card-box,
      body:not(.dark-theme).sky-aqua-theme .kpi-card-lodgify,
      body:not(.dark-theme).sky-aqua-theme .card-box {
        background: ${colorVal} !important;
        border-color: #e2e8f0 !important;
      }
    `;
  } else if (type === 'accent') {
    themeMap['--accent'] = colorVal;
    themeMap['--accent-light'] = colorVal;
    themeMap['--primary-lime'] = colorVal;
    document.documentElement.style.setProperty('--accent', colorVal);
    document.documentElement.style.setProperty('--accent-light', colorVal);
    document.documentElement.style.setProperty('--primary-lime', colorVal);
    const picker = document.getElementById('pickerAccent');
    if (picker) picker.value = colorVal;

    let styleEl = document.getElementById('custom-accent-override');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'custom-accent-override';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
      .btn-primary, button.btn-primary, .badge-primary,
      .nav-item.active,
      body.pro-clinic-theme .nav-item.active,
      body.sky-aqua-theme .nav-item.active {
        background-color: ${colorVal} !important;
        border-color: ${colorVal} !important;
        color: #ffffff !important;
      }
      .nav-item.active i,
      body.pro-clinic-theme .nav-item.active i,
      body.sky-aqua-theme .nav-item.active i {
        color: #ffffff !important;
      }
      .kpi-card-lodgify,
      body.pro-clinic-theme .kpi-card-lodgify,
      body.sky-aqua-theme .kpi-card-lodgify {
        border-bottom: 3px solid ${colorVal} !important;
      }
      .kpi-card-lodgify .kpi-card-icon,
      body.pro-clinic-theme .kpi-card-lodgify .kpi-card-icon,
      body.sky-aqua-theme .kpi-card-lodgify .kpi-card-icon {
        background-color: ${colorVal} !important;
        color: #ffffff !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 14px ${colorVal}44 !important;
      }
    `;
  } else if (type === 'logo') {
    themeMap['--logo-color'] = colorVal;
    const picker = document.getElementById('pickerLogo');
    if (picker) picker.value = colorVal;

    let logoEl = document.getElementById('custom-logo-override');
    if (!logoEl) {
      logoEl = document.createElement('style');
      logoEl.id = 'custom-logo-override';
      document.head.appendChild(logoEl);
    }
    logoEl.innerHTML = `
      .kpi-card-lodgify .kpi-card-icon,
      body.pro-clinic-theme .kpi-card-lodgify .kpi-card-icon,
      body.sky-aqua-theme .kpi-card-lodgify .kpi-card-icon {
        background-color: ${colorVal} !important;
        color: #ffffff !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 14px ${colorVal}44 !important;
      }
      .brand-logo, .brand-name i,
      body.pro-clinic-theme .brand-name i,
      body.sky-aqua-theme .brand-logo {
        color: ${colorVal} !important;
      }
    `;
  } else if (type === 'sidebar-icon') {
    themeMap['--sidebar-icon-color'] = colorVal;
    const picker = document.getElementById('pickerSidebarIcon');
    if (picker) picker.value = colorVal;

    let siEl = document.getElementById('custom-sidebar-icon-override');
    if (!siEl) {
      siEl = document.createElement('style');
      siEl.id = 'custom-sidebar-icon-override';
      document.head.appendChild(siEl);
    }
    siEl.innerHTML = `
      body:not(.dark-theme) .sidebar .nav-item i,
      body:not(.dark-theme) #sidebarEl .nav-item i,
      body:not(.dark-theme).pro-clinic-theme .sidebar .nav-item i,
      body:not(.dark-theme).sky-aqua-theme .sidebar .nav-item i {
        color: ${colorVal} !important;
      }
    `;
  } else if (type === 'header-bg') {
    themeMap['--bg-header'] = colorVal;
    const picker = document.getElementById('pickerHeaderBg');
    if (picker) picker.value = colorVal;

    let hEl = document.getElementById('custom-header-override');
    if (!hEl) {
      hEl = document.createElement('style');
      hEl.id = 'custom-header-override';
      document.head.appendChild(hEl);
    }
    hEl.innerHTML = `
      body:not(.dark-theme) .main-header,
      body:not(.dark-theme) #appMainHeader {
        background: ${colorVal} !important;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
      }
    `;
  } else if (type === 'text') {
    themeMap['--text-dark'] = colorVal;
    themeMap['--text-main'] = colorVal;
    document.documentElement.style.setProperty('--text-dark', colorVal);
    document.documentElement.style.setProperty('--text-main', colorVal);
    const picker = document.getElementById('pickerText');
    if (picker) picker.value = colorVal;

    let styleEl = document.getElementById('custom-text-override');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'custom-text-override';
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
      body:not(.dark-theme) .main-content,
      body:not(.dark-theme) .main-content h1,
      body:not(.dark-theme) .main-content h2,
      body:not(.dark-theme) .main-content h3,
      body:not(.dark-theme) .main-content h4,
      body:not(.dark-theme) .main-content label,
      body:not(.dark-theme) .main-content p,
      body:not(.dark-theme) .main-content div:not(.uiux-theme-badge):not(.badge),
      body:not(.dark-theme) .main-content table td,
      body:not(.dark-theme) .main-content table th,
      body:not(.dark-theme).pro-clinic-theme .main-content,
      body:not(.dark-theme).sky-aqua-theme .main-content {
        color: ${colorVal} !important;
      }
    `;
  }

  localStorage.setItem('auracare_custom_theme_colors', JSON.stringify(themeMap));
}

function toggleSystemDarkMode(isActive) {
  if (isActive) {
    document.documentElement.classList.add('dark-theme');
    document.body.classList.add('dark-theme');
    localStorage.setItem('auracare_dark_mode', 'true');
    const toggle = document.getElementById('settingDarkModeToggle');
    if (toggle) toggle.checked = true;
    showToast('Dark Mode Enabled 🌙', 'System appearance switched to dark theme.', 'info', 2500);
  } else {
    document.documentElement.classList.remove('dark-theme');
    document.body.classList.remove('dark-theme');
    localStorage.setItem('auracare_dark_mode', 'false');
    const toggle = document.getElementById('settingDarkModeToggle');
    if (toggle) toggle.checked = false;
    showToast('Light Mode Enabled ☀️', 'System appearance switched to light theme.', 'info', 2500);
  }
}

function applyUIUXTheme(themeName, cardEl) {
  const container = document.getElementById('uiuxThemeSwitcher');
  if (container) {
    Array.from(container.querySelectorAll('.uiux-theme-card')).forEach(el => el.classList.remove('active'));
  }
  if (cardEl) cardEl.classList.add('active');

  // Reset theme classes & banners (preserving dark-theme!)
  document.body.classList.remove('pro-clinic-theme', 'sky-aqua-theme');
  document.documentElement.classList.remove('pro-clinic-theme', 'sky-aqua-theme');
  const hb1 = document.getElementById('proClinicHeroBanner');
  if (hb1) hb1.style.display = 'none';
  const hb2 = document.getElementById('skyCareHeroBanner');
  if (hb2) hb2.style.display = 'none';

  let themeMap = {};
  try { themeMap = JSON.parse(localStorage.getItem('auracare_custom_theme_colors') || '{}'); } catch(e){}

  if (themeName === 'ocean-navy') {
    // Theme 1: Ocean Navy UI/UX
    document.body.classList.remove('sky-aqua-theme');
    document.documentElement.classList.remove('sky-aqua-theme');
    updateCustomTheme('sidebar', '#083852');
    updateCustomTheme('card', '#ffffff');
    updateCustomTheme('accent', '#0c8ee6');
    updateCustomTheme('text', '#0f2942');
    document.documentElement.style.setProperty('--bg-page', '#cee0ec');
    document.documentElement.style.setProperty('--bg-app', '#cee0ec');
    themeMap['--bg-page'] = '#cee0ec';
    themeMap['--bg-app'] = '#cee0ec';
    themeMap['--active-uiux-theme'] = 'ocean-navy';
    localStorage.setItem('auracare_custom_theme_colors', JSON.stringify(themeMap));
    showToast('Theme 1 Applied 🌊', 'Deep Navy Sidebar & Teal Highlights layout is now active!', 'info', 3500);
  } else if (themeName === 'sky-aqua') {
    // Theme 2: Sky Care Aqua UI/UX (Hard Default)
    document.body.classList.add('sky-aqua-theme');
    document.documentElement.classList.add('sky-aqua-theme');
    if (hb2) hb2.style.display = 'block';

    updateCustomTheme('sidebar', '#ffffff');
    updateCustomTheme('card', '#ffffff');
    updateCustomTheme('accent', '#0c8ee6');
    updateCustomTheme('text', '#1e293b');
    document.documentElement.style.setProperty('--bg-page', '#f3f6f9');
    document.documentElement.style.setProperty('--bg-app', '#f3f6f9');
    themeMap['--bg-page'] = '#f3f6f9';
    themeMap['--bg-app'] = '#f3f6f9';
    themeMap['--active-uiux-theme'] = 'sky-aqua';
    localStorage.setItem('auracare_custom_theme_colors', JSON.stringify(themeMap));
    showToast('Theme 2 Applied 💎', 'Cyan Banner, Cool Slate & Aqua Badges layout is now active!', 'info', 3500);
  }
}

function selectThemeStyleBox(boxEl, sidebarCol, cardCol, accentCol, textCol, pageBgCol) {
  const grid = document.getElementById('themeStyleGrid');
  if (grid) {
    Array.from(grid.querySelectorAll('.theme-style-box')).forEach(el => el.classList.remove('active'));
  }
  if (boxEl) boxEl.classList.add('active');

  updateCustomTheme('sidebar', sidebarCol);
  updateCustomTheme('card', cardCol);
  updateCustomTheme('accent', accentCol);
  if (textCol) updateCustomTheme('text', textCol);
  if (pageBgCol) {
    document.documentElement.style.setProperty('--bg-page', pageBgCol);
    document.documentElement.style.setProperty('--bg-app', pageBgCol);
    let themeMap = {};
    const existing = localStorage.getItem('auracare_custom_theme_colors');
    if (existing) {
      try { themeMap = JSON.parse(existing); } catch(e) {}
    }
    themeMap['--bg-page'] = pageBgCol;
    themeMap['--bg-app'] = pageBgCol;
    localStorage.setItem('auracare_custom_theme_colors', JSON.stringify(themeMap));
  }

  showToast('Theme Style Switched 🎨', 'Theme previewed! Click Save Settings at the bottom to save permanently.', 'info', 3500);
}

function applySavedCustomThemeColors() {
  const existing = localStorage.getItem('auracare_custom_theme_colors');
  if (!existing) {
    applyUIUXTheme('sky-aqua');
    return;
  }
  try {
    const map = JSON.parse(existing);
    Object.keys(map).forEach(varName => {
      document.documentElement.style.setProperty(varName, map[varName]);
    });
    if (map['--bg-sidebar']) {
      const p = document.getElementById('pickerSidebar');
      if (p) p.value = map['--bg-sidebar'];
      updateCustomTheme('sidebar', map['--bg-sidebar']);
    }
    if (map['--bg-card']) {
      const p = document.getElementById('pickerCard');
      if (p) p.value = map['--bg-card'];
    }
    if (map['--accent']) {
      const p = document.getElementById('pickerAccent');
      if (p) p.value = map['--accent'];
      updateCustomTheme('accent', map['--accent']);
    }
    if (map['--logo-color']) {
      const p = document.getElementById('pickerLogo');
      if (p) p.value = map['--logo-color'];
      updateCustomTheme('logo', map['--logo-color']);
    }
    if (map['--text-dark']) {
      const p = document.getElementById('pickerText');
      if (p) p.value = map['--text-dark'];
      updateCustomTheme('text', map['--text-dark']);
    }
    if (map['--sidebar-icon-color']) {
      const p = document.getElementById('pickerSidebarIcon');
      if (p) p.value = map['--sidebar-icon-color'];
      updateCustomTheme('sidebar-icon', map['--sidebar-icon-color']);
    }
    if (map['--bg-header']) {
      const p = document.getElementById('pickerHeaderBg');
      if (p) p.value = map['--bg-header'];
      updateCustomTheme('header-bg', map['--bg-header']);
    }
    if (map['--sidebar-active-style']) {
      updateSidebarActiveStyle(map['--sidebar-active-style']);
    }
    if (map['--card-border-radius']) {
      updatePageBorderRadius(map['--card-border-radius']);
    }

    if (map['--active-uiux-theme'] === 'ocean-navy') {
      document.body.classList.remove('sky-aqua-theme');
      document.documentElement.classList.remove('sky-aqua-theme');
      const hb1 = document.getElementById('proClinicHeroBanner');
      if (hb1) hb1.style.display = 'none';
      const hb2 = document.getElementById('skyCareHeroBanner');
      if (hb2) hb2.style.display = 'none';
      const container = document.getElementById('uiuxThemeSwitcher');
      if (container) {
        const cards = container.querySelectorAll('.uiux-theme-card');
        if (cards[0]) cards[0].classList.add('active');
        if (cards[1]) cards[1].classList.remove('active');
      }
    } else {
      document.body.classList.add('sky-aqua-theme');
      document.documentElement.classList.add('sky-aqua-theme');
      const hb1 = document.getElementById('proClinicHeroBanner');
      if (hb1) hb1.style.display = 'none';
      const hb2 = document.getElementById('skyCareHeroBanner');
      if (hb2) hb2.style.display = 'block';
      const container = document.getElementById('uiuxThemeSwitcher');
      if (container) {
        const cards = container.querySelectorAll('.uiux-theme-card');
        if (cards[0]) cards[0].classList.remove('active');
        if (cards[1]) cards[1].classList.add('active');
      }
    }
  } catch(e) {
    applyUIUXTheme('sky-aqua');
  }
}

function updateSidebarActiveStyle(styleVal) {
  let themeMap = {};
  try { themeMap = JSON.parse(localStorage.getItem('auracare_custom_theme_colors') || '{}'); } catch(e){}
  themeMap['--sidebar-active-style'] = styleVal;
  localStorage.setItem('auracare_custom_theme_colors', JSON.stringify(themeMap));

  let styleEl = document.getElementById('custom-sidebar-active-style-override');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'custom-sidebar-active-style-override';
    document.head.appendChild(styleEl);
  }

  let css = '';
  if (styleVal === 'left-line') {
    css = `
      body .sidebar .nav-item.active,
      body.pro-clinic-theme .sidebar .nav-item.active,
      body.sky-aqua-theme .sidebar .nav-item.active {
        background: rgba(2, 132, 199, 0.08) !important;
        color: var(--accent, #0284c7) !important;
        border-left: 4px solid var(--accent, #0284c7) !important;
        border-radius: 0 12px 12px 0 !important;
      }
    `;
  } else if (styleVal === 'bordered') {
    css = `
      body .sidebar .nav-item.active,
      body.pro-clinic-theme .sidebar .nav-item.active,
      body.sky-aqua-theme .sidebar .nav-item.active {
        background: transparent !important;
        border: 1.5px solid var(--accent, #0284c7) !important;
        border-radius: 12px !important;
        color: var(--accent, #0284c7) !important;
      }
    `;
  } else if (styleVal === 'glow') {
    css = `
      body .sidebar .nav-item.active,
      body.pro-clinic-theme .sidebar .nav-item.active,
      body.sky-aqua-theme .sidebar .nav-item.active {
        background: linear-gradient(135deg, rgba(2,132,199,0.15) 0%, rgba(2,132,199,0.02) 100%) !important;
        box-shadow: inset 0 0 12px rgba(2, 132, 199, 0.1) !important;
        border-radius: 12px !important;
      }
    `;
  } else {
    // capsule (default)
    css = `
      body .sidebar .nav-item.active,
      body.pro-clinic-theme .sidebar .nav-item.active,
      body.sky-aqua-theme .sidebar .nav-item.active {
        border-radius: 12px !important;
        border-left: none !important;
      }
    `;
  }
  styleEl.innerHTML = css;
  const selectEl = document.getElementById('settingSidebarActiveStyle');
  if (selectEl) selectEl.value = styleVal;
}

function updatePageBorderRadius(radiusVal) {
  let themeMap = {};
  try { themeMap = JSON.parse(localStorage.getItem('auracare_custom_theme_colors') || '{}'); } catch(e){}
  themeMap['--card-border-radius'] = radiusVal;
  localStorage.setItem('auracare_custom_theme_colors', JSON.stringify(themeMap));

  let styleEl = document.getElementById('custom-border-radius-override');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'custom-border-radius-override';
    document.head.appendChild(styleEl);
  }
  styleEl.innerHTML = `
    .card-box, .kpi-card-lodgify, .widget-card, .btn, .form-control, .sidebar .nav-item {
      border-radius: ${radiusVal} !important;
    }
  `;
  const selectEl = document.getElementById('settingBorderRadius');
  if (selectEl) selectEl.value = radiusVal;
}

// 3. Display Mode & Fullscreen Mode
function applyDisplayMode(modeVal) {
  const sidebar = document.getElementById('sidebarEl');
  const mainContent = document.querySelector('.main-content');
  if (modeVal === 'fullscreen') {
    if (sidebar) sidebar.style.display = 'none';
    if (mainContent) mainContent.style.marginLeft = '0px';
    showToast('Full Width Mode 🔲', 'Sidebar is hidden. Use the menu (≡) button at top-left to reopen it anytime!', 'info', 4000);
  } else {
    if (sidebar) sidebar.style.display = 'flex';
    if (mainContent) mainContent.style.marginLeft = '';
  }
}

function updatePageFontSize(sizeVal) {
  if (!sizeVal) return;
  document.documentElement.style.setProperty('--font-size-base', sizeVal);

  let styleEl = document.getElementById('custom-page-font-override');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'custom-page-font-override';
    document.head.appendChild(styleEl);
  }

  // If 14px (default), clear override so standard layout is used
  if (sizeVal === '14px') {
    styleEl.innerHTML = '';
    return;
  }

  styleEl.innerHTML = `
    /* Main Content Typography */
    .main-content,
    .main-content span:not(.badge),
    .main-content div,
    .main-content p,
    .main-content label,
    .main-content input,
    .main-content select,
    .main-content textarea,
    .main-content table td, .main-content table th,
    .settings-row, .settings-row-label, .settings-dropdown,
    .card-title, .card-subtitle, .stat-label, .stat-desc,
    .patient-name, .doctor-name, .appt-time,
    .modal-body, .modal-title, .btn, button.btn {
      font-size: ${sizeVal} !important;
    }
    .main-content h1, .main-content .page-title {
      font-size: calc(${sizeVal} * 1.6) !important;
    }
    .main-content h2, .settings-section-title {
      font-size: calc(${sizeVal} * 1.3) !important;
    }
    .main-content h3, .main-content h4 {
      font-size: calc(${sizeVal} * 1.15) !important;
    }
    .main-content .badge {
      font-size: calc(${sizeVal} * 0.8) !important;
    }
  `;
}

function updateSidebarFontSize(sizeVal) {
  if (!sizeVal) return;

  let styleEl = document.getElementById('custom-sidebar-font-override');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'custom-sidebar-font-override';
    document.head.appendChild(styleEl);
  }

  if (sizeVal === '13.5px') {
    styleEl.innerHTML = '';
    return;
  }

  styleEl.innerHTML = `
    /* Sidebar Typography */
    #sidebarEl, .sidebar,
    #sidebarEl span:not(.badge), .sidebar span:not(.badge),
    #sidebarEl div, .sidebar div,
    #sidebarEl p, .sidebar p,
    #sidebarEl label, .sidebar label,
    #sidebarEl input, .sidebar input,
    #sidebarEl select, .sidebar select,
    .nav-item, .nav-item span, .nav-label, .sidebar-link, .sidebar-title {
      font-size: ${sizeVal} !important;
    }
    #sidebarEl .brand-name, .sidebar .brand-name {
      font-size: calc(${sizeVal} * 1.3) !important;
    }
    #sidebarEl .badge, .sidebar .badge {
      font-size: calc(${sizeVal} * 0.75) !important;
    }
  `;
}

function toggleFullscreenMode(targetState) {
  const fsToggle = document.getElementById('fullscreenToggle');
  if (!fsToggle) return;

  if (targetState === 'ON') {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
  } else {
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen && document.webkitFullscreenElement) {
      document.webkitExitFullscreen();
    }
  }

  Array.from(fsToggle.children).forEach(c => {
    c.classList.toggle('active', c.innerText.trim() === targetState);
  });
}

// 4. Save & Reset Settings Controls
function resetSettingsControls() {
  const waTone = document.getElementById('settingWaTone');
  if (waTone) waTone.value = 'ping';
  const waVol = document.getElementById('settingWaVolume');
  if (waVol) waVol.value = '80';
  const lang = document.getElementById('settingLang');
  if (lang) lang.value = 'ENGLISH';
  const res = document.getElementById('settingRes');
  if (res) res.value = 'with-sidebar';
  applyDisplayMode('with-sidebar');

  const fontEl = document.getElementById('settingFontFamily');
  if (fontEl) {
    fontEl.value = "'Inter', sans-serif";
    updateThemeVariable('--font-family', fontEl.value);
  }
  const sizeEl = document.getElementById('settingFontSize');
  if (sizeEl) {
    sizeEl.value = '14px';
    updatePageFontSize('14px');
  }
  const sbSizeEl = document.getElementById('settingSidebarFontSize');
  if (sbSizeEl) {
    sbSizeEl.value = '13.5px';
    updateSidebarFontSize('13.5px');
  }

  ['soundToggle', 'vibeToggle', 'pushToggle'].forEach(g => {
    const el = document.getElementById(g);
    if (el) {
      Array.from(el.children).forEach(c => c.classList.remove('active'));
      if (el.children[0]) el.children[0].classList.add('active');
    }
  });

  const fullEl = document.getElementById('fullscreenToggle');
  if (fullEl) {
    Array.from(fullEl.children).forEach(c => c.classList.remove('active'));
    if (fullEl.children[0]) fullEl.children[0].classList.add('active');
  }

  // Reset theme to Theme 2 (Sky Care Aqua)
  applyUIUXTheme('sky-aqua');
  const accStyle = document.getElementById('custom-accent-override');
  if (accStyle) accStyle.innerHTML = '';
  const txtStyle = document.getElementById('custom-text-override');
  if (txtStyle) txtStyle.innerHTML = '';
  const siStyle = document.getElementById('custom-sidebar-icon-override');
  if (siStyle) siStyle.innerHTML = '';
  const hStyle = document.getElementById('custom-header-override');
  if (hStyle) hStyle.innerHTML = '';
  const saStyle = document.getElementById('custom-sidebar-active-style-override');
  if (saStyle) saStyle.innerHTML = '';
  const brStyle = document.getElementById('custom-border-radius-override');
  if (brStyle) brStyle.innerHTML = '';

  localStorage.setItem('auracare_dark_mode', 'false');
  const darkToggle = document.getElementById('settingDarkModeToggle');
  if (darkToggle) darkToggle.checked = false;
  document.documentElement.classList.remove('dark-theme');
  document.body.classList.remove('dark-theme');

  localStorage.removeItem('auracare_settings');
  localStorage.removeItem('auracare_custom_theme_colors');
  showToast('Settings Reset 🔄', 'Default Inter font, Theme 2, audio tones, and volume have been restored.', 'info', 4000);
}

function saveSettingsControls() {
  const settings = {
    waTone: document.getElementById('settingWaTone')?.value || 'chime',
    waVolume: document.getElementById('settingWaVolume')?.value || '80',
    language: document.getElementById('settingLang')?.value || 'ENGLISH',
    resolution: document.getElementById('settingRes')?.value || 'with-sidebar',
    font: document.getElementById('settingFontFamily')?.value || "'Plus Jakarta Sans', sans-serif",
    fontSize: document.getElementById('settingFontSize')?.value || '14px',
    sidebarFontSize: document.getElementById('settingSidebarFontSize')?.value || '13.5px'
  };

  const getActiveText = (id) => {
    const el = document.getElementById(id);
    if (!el) return '';
    const act = el.querySelector('.active');
    return act ? act.innerText.trim() : '';
  };

  settings.soundAlert = getActiveText('soundToggle') || 'ON';
  settings.vibration = getActiveText('vibeToggle');
  settings.fullscreen = getActiveText('fullscreenToggle');
  settings.pushAlarm = getActiveText('pushToggle');

  localStorage.setItem('auracare_settings', JSON.stringify(settings));
  showToast('Settings Saved ✨', 'All audio, alert, and theme preferences have been saved successfully!', 'success', 4000);
  switchView('dashboard');
}

function loadSavedSettingsControls() {
  applySavedCustomThemeColors();

  // ALWAYS check and apply Dark Mode state first so it doesn't return early
  const rawDark = localStorage.getItem('auracare_dark_mode');
  const isDark = rawDark === null ? true : rawDark === 'true';
  const darkToggle = document.getElementById('settingDarkModeToggle');
  if (darkToggle) {
    darkToggle.checked = isDark;
  }
  if (isDark) {
    document.documentElement.classList.add('dark-theme');
    document.body.classList.add('dark-theme');
  } else {
    document.documentElement.classList.remove('dark-theme');
    document.body.classList.remove('dark-theme');
  }

  const saved = localStorage.getItem('auracare_settings');
  if (!saved) return;
  try {
    const s = JSON.parse(saved);
    if (s.waTone) {
      const tEl = document.getElementById('settingWaTone');
      if (tEl) tEl.value = s.waTone;
    }
    if (s.waVolume) {
      const vEl = document.getElementById('settingWaVolume');
      if (vEl) vEl.value = s.waVolume;
    }
    if (s.language) {
      const lEl = document.getElementById('settingLang');
      if (lEl) lEl.value = s.language;
    }
    if (s.resolution) {
      const rEl = document.getElementById('settingRes');
      if (rEl) {
        rEl.value = s.resolution;
        applyDisplayMode(s.resolution);
      }
    }
    if (s.font) {
      const fEl = document.getElementById('settingFontFamily');
      if (fEl) {
        fEl.value = s.font;
        updateThemeVariable('--font-family', s.font);
      }
    }
    if (s.fontSize) {
      const sizeEl = document.getElementById('settingFontSize');
      if (sizeEl) {
        sizeEl.value = s.fontSize;
        updatePageFontSize(s.fontSize);
      }
    }
    if (s.sidebarFontSize) {
      const sbSizeEl = document.getElementById('settingSidebarFontSize');
      if (sbSizeEl) {
        sbSizeEl.value = s.sidebarFontSize;
        updateSidebarFontSize(s.sidebarFontSize);
      }
    }
    if (s.soundAlert) {
      const sToggle = document.getElementById('soundToggle');
      if (sToggle) {
        Array.from(sToggle.children).forEach(c => {
          c.classList.toggle('active', c.innerText.trim() === s.soundAlert);
        });
      }
    }
    if (s.vibration) {
      const vToggle = document.getElementById('vibeToggle');
      if (vToggle) {
        Array.from(vToggle.children).forEach(c => {
          c.classList.toggle('active', c.innerText.trim() === s.vibration);
        });
      }
    }
    if (s.pushAlarm) {
      const pToggle = document.getElementById('pushToggle');
      if (pToggle) {
        Array.from(pToggle.children).forEach(c => {
          c.classList.toggle('active', c.innerText.trim() === s.pushAlarm);
        });
      }
    }
  } catch (err) {
    console.error("Error loading saved settings:", err);
  }
}

let selectedLoginRole = 'DOCTOR';

function selectLoginRole(role, btnEl) {
  selectedLoginRole = role;
  document.querySelectorAll('.segmented-btn, .login-role-chip').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');

  const emailInp = document.getElementById('loginEmailInput');
  if (emailInp) {
    const emails = {
      'ADMIN': 'admin@auracare.hospital',
      'DOCTOR': 'doctor.rajesh@auracare.hospital',
      'STAFF': 'reception@auracare.hospital',
      'LAB': 'lab.tech@auracare.hospital',
      'PHARMACY': 'pharmacy@auracare.hospital'
    };
    emailInp.value = emails[role] || 'doctor.rajesh@auracare.hospital';
  }
}

function openHiddenAdminLoginModal(e) {
  if (e) e.preventDefault();
  const modal = document.getElementById('adminLoginModal');
  if (modal) modal.classList.add('active');
}

function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  if (btnEl) {
    const icon = btnEl.querySelector('i');
    if (icon) {
      icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
    }
  }
}

function checkCapsLock(event) {
  const warning = document.getElementById('capsLockWarning');
  if (!warning) return;
  if (event.getModifierState && event.getModifierState('CapsLock')) {
    warning.style.display = 'flex';
  } else {
    warning.style.display = 'none';
  }
}

function handleUserLogin(e) {
  if (e) e.preventDefault();

  const email = document.getElementById('loginEmailInput')?.value.trim();
  const password = document.getElementById('loginPasswordInput')?.value;

  if (!email || !password) {
    alert("Please enter both email and password!");
    return;
  }

  // Validate credentials based on selected role
  let isValid = false;
  if (selectedLoginRole === 'DOCTOR') {
    if (email === 'doctor.rajesh@auracare.hospital' && (password === 'doctor' || password === 'doctor123')) {
      isValid = true;
    } else {
      alert("Invalid Doctor credentials! (Hint: doctor.rajesh@auracare.hospital / doctor)");
    }
  } else if (selectedLoginRole === 'STAFF') {
    if (email === 'reception@auracare.hospital' && (password === 'staff' || password === 'staff123')) {
      isValid = true;
    } else {
      alert("Invalid Staff credentials! (Hint: reception@auracare.hospital / staff)");
    }
  } else if (selectedLoginRole === 'ADMIN') {
    if (email === 'admin@auracare.hospital' && (password === 'admin' || password === 'admin123')) {
      isValid = true;
    } else {
      alert("Invalid Admin credentials! (Hint: admin@auracare.hospital / admin)");
    }
  } else {
    if (password === 'staff' || password === 'staff123' || password === 'admin' || password === 'doctor') {
      isValid = true;
    } else {
      alert("Invalid credentials!");
    }
  }

  if (!isValid) return;

  const submitBtn = document.getElementById('loginSubmitBtn');
  const btnText = submitBtn?.querySelector('.btn-text');
  const btnSpinner = submitBtn?.querySelector('.btn-spinner');

  if (btnText && btnSpinner) {
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-flex';
  }

  setTimeout(() => {
    if (btnText && btnSpinner) {
      btnText.style.display = 'inline-flex';
      btnSpinner.style.display = 'none';
    }

    localStorage.setItem('auracare_logged_in', 'true');
    localStorage.setItem('auracare_user_role', selectedLoginRole);

    let syncStyle = document.getElementById('auth-sync-style');
    if (!syncStyle) {
      syncStyle = document.createElement('style');
      syncStyle.id = 'auth-sync-style';
      document.head.appendChild(syncStyle);
    }
    syncStyle.innerHTML = '#login-screen{display:none !important;} #app{display:flex !important;}';

    const loginScreen = document.getElementById('login-screen');
    const appShell = document.getElementById('app');

    if (loginScreen) loginScreen.style.setProperty('display', 'none', 'important');
    if (appShell) appShell.style.setProperty('display', 'flex', 'important');

    switchUserRole(selectedLoginRole);
    
    if (selectedLoginRole === 'ADMIN') {
      switchView('admin');
    } else {
      switchView('dashboard');
    }
    
    showToast('Welcome Back! 👋', `Signed in successfully as ${selectedLoginRole}`, 'success', 3500);
  }, 350);
}

function handleUserLogout() {
  const dropdown = document.getElementById('profileMenuDropdown');
  if (dropdown) dropdown.classList.remove('active');

  localStorage.setItem('auracare_logged_in', 'false');

  let syncStyle = document.getElementById('auth-sync-style');
  if (!syncStyle) {
    syncStyle = document.createElement('style');
    syncStyle.id = 'auth-sync-style';
    document.head.appendChild(syncStyle);
  }
  syncStyle.innerHTML = '#login-screen{display:flex !important;} #app{display:none !important;}';

  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app');

  if (appShell) appShell.style.setProperty('display', 'none', 'important');
  if (loginScreen) loginScreen.style.setProperty('display', 'flex', 'important');

  showToast('Logged Out 🔒', 'You have been safely signed out of the hospital portal.', 'info', 3500);
}

document.addEventListener("DOMContentLoaded", () => {
  loadSavedSettingsControls();
  let loggedInVal = localStorage.getItem('auracare_logged_in');
  if (loggedInVal === null) {
    loggedInVal = 'true';
    localStorage.setItem('auracare_logged_in', 'true');
  }

  const isLoggedIn = (loggedInVal === 'true');
  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app');

  if (isLoggedIn) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (appShell) appShell.style.display = 'flex';
    const savedRole = localStorage.getItem('auracare_user_role') || 'DOCTOR';
    switchUserRole(savedRole);
    
    // Maintain current active view on page refresh instead of overriding with dashboard
    const hashView = window.location.hash ? window.location.hash.replace('#', '') : null;
    const savedView = hashView || localStorage.getItem('auracare_active_view') || (savedRole === 'ADMIN' ? 'admin' : 'dashboard');
    switchView(savedView);
  } else {
    if (appShell) appShell.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'flex';
  }
});

// Sync view changes on browser back/forward/hash changes
window.addEventListener('hashchange', () => {
  const hashView = window.location.hash ? window.location.hash.replace('#', '') : null;
  if (hashView && document.getElementById(`view-${hashView}`)) {
    switchView(hashView);
  }
});

// Settings Subpage Tab Switcher
function switchSettingsTab(tabName) {
  const btnIds = ['stab-general', 'stab-appearance', 'stab-theme', 'stab-typography', 'stab-notifications', 'stab-security', 'stab-backup', 'stab-about', 'stab-administration'];
  const pageIds = ['spage-general', 'spage-appearance', 'spage-theme', 'spage-typography', 'spage-notifications', 'spage-security', 'spage-backup', 'spage-about', 'spage-administration'];

  btnIds.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', id === `stab-${tabName}`);
  });

  pageIds.forEach(id => {
    const page = document.getElementById(id);
    if (page) page.classList.toggle('active', id === `spage-${tabName}`);
  });
}

// Admin Panel Subtab Switcher
function switchAdminTab(tabName) {
  const btnIds = ['atab-staff', 'atab-doctors', 'atab-roles', 'atab-logs', 'atab-attendance'];
  const pageIds = ['apage-staff', 'apage-doctors', 'apage-roles', 'apage-logs', 'apage-attendance'];

  btnIds.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', id === `atab-${tabName}`);
  });

  pageIds.forEach(id => {
    const page = document.getElementById(id);
    if (page) page.classList.toggle('active', id === `apage-${tabName}`);
  });
}

// Global Role Switcher & Session Persistence
function switchUserRole(role) {
  localStorage.setItem('auracare_user_role', role);
  if (typeof checkNewWhatsAppBookings === 'function') checkNewWhatsAppBookings();

  const select = document.getElementById('globalRoleSelect');
  if (select && select.value !== role) select.value = role;

  const nameEl = document.getElementById('topNavUserName');
  const roleEl = document.getElementById('topNavUserRole');
  const dropdown = document.getElementById('profileMenuDropdown');

  const adminNav = document.getElementById('nav-admin');
  const secManagement = document.getElementById('sec-management');
  const paymentsNav = document.getElementById('nav-payments');
  const pharmacyNav = document.getElementById('nav-pharmacy');

  if (role === 'STAFF') {
    if (nameEl) nameEl.innerText = 'Meena Swaminathan';
    if (roleEl) roleEl.innerText = 'Reception Lead';
    if (adminNav) adminNav.style.display = 'none';
    if (secManagement) secManagement.style.display = 'none';
    if (paymentsNav) paymentsNav.style.display = 'none';
    if (pharmacyNav) pharmacyNav.style.display = 'none';

    if (dropdown) {
      dropdown.innerHTML = `
        <div style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
          <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Meena Swaminathan</div>
          <div style="font-size: 11px; color: #0284c7; font-weight:600;">Reception Lead</div>
        </div>
        <div class="profile-menu-item" onclick="switchView('settings')">
          <i class="fas fa-sliders-h" style="color:#7c3aed;"></i> System Settings
        </div>
        <div style="border-top: 1px solid #f1f5f9; margin: 4px 0;"></div>
        <div class="profile-menu-item" onclick="handleUserLogout()" style="color:#ef4444; font-weight:600;">
          <i class="fas fa-sign-out-alt" style="color:#ef4444;"></i> Log Out of Portal
        </div>
      `;
    }
  } else if (role === 'DOCTOR') {
    if (nameEl) nameEl.innerText = 'Dr. Rajesh Kumar';
    if (roleEl) roleEl.innerText = 'Consultant Physician';
    if (adminNav) adminNav.style.display = 'none';
    if (secManagement) secManagement.style.display = 'none';
    if (paymentsNav) paymentsNav.style.display = 'none';
    if (pharmacyNav) pharmacyNav.style.display = 'none';

    if (dropdown) {
      dropdown.innerHTML = `
        <div style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
          <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Dr. Rajesh Kumar</div>
          <div style="font-size: 11px; color: #059669; font-weight:600;">Senior Consultant Physician</div>
        </div>
        <div class="profile-menu-item" onclick="switchView('dashboard')">
          <i class="fas fa-user-md" style="color:#059669;"></i> Doctor Clinical Dashboard
        </div>
        <div class="profile-menu-item" onclick="switchView('prescriptions')">
          <i class="fas fa-file-prescription" style="color:#0284c7;"></i> E-Prescriptions Log
        </div>
        <div class="profile-menu-item" onclick="switchView('settings')">
          <i class="fas fa-sliders-h" style="color:#7c3aed;"></i> System Settings
        </div>
        <div style="border-top: 1px solid #f1f5f9; margin: 4px 0;"></div>
        <div class="profile-menu-item" onclick="handleUserLogout()" style="color:#ef4444; font-weight:600;">
          <i class="fas fa-sign-out-alt" style="color:#ef4444;"></i> Log Out of Portal
        </div>
      `;
    }
  } else if (role === 'ADMIN') {
    if (nameEl) nameEl.innerText = 'Dr. Rajesh Kumar';
    if (roleEl) roleEl.innerText = 'Medical Director';
    if (adminNav) adminNav.style.display = 'flex';
    if (secManagement) secManagement.style.display = 'block';
    if (paymentsNav) paymentsNav.style.display = 'flex';
    if (pharmacyNav) pharmacyNav.style.display = 'flex';

    if (dropdown) {
      dropdown.innerHTML = `
        <div style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
          <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Dr. Rajesh Kumar</div>
          <div style="font-size: 11px; color: #7c3aed; font-weight:600;">Chief Medical Director & Admin</div>
        </div>
        <div class="profile-menu-item" onclick="switchView('admin')">
          <i class="fas fa-user-shield" style="color:#0284c7;"></i> Main Admin Management
        </div>
        <div class="profile-menu-item" onclick="switchView('dashboard')">
          <i class="fas fa-user-md" style="color:#059669;"></i> Doctor View
        </div>
        <div class="profile-menu-item" onclick="switchView('settings')">
          <i class="fas fa-sliders-h" style="color:#7c3aed;"></i> System Settings
        </div>
        <div style="border-top: 1px solid #f1f5f9; margin: 4px 0;"></div>
        <div class="profile-menu-item" onclick="handleUserLogout()" style="color:#ef4444; font-weight:600;">
          <i class="fas fa-sign-out-alt" style="color:#ef4444;"></i> Log Out of Portal
        </div>
      `;
    }
  }
}

function switchStaffAccount(name, title) {
  const nameEl = document.getElementById('topNavUserName');
  const roleEl = document.getElementById('topNavUserRole');
  if (nameEl) nameEl.innerText = name;
  if (roleEl) roleEl.innerText = title;
  const pName = document.getElementById('profileStaffName');
  const pRole = document.getElementById('profileStaffRole');
  if (pName) pName.innerText = name;
  if (pRole) pRole.innerText = title;
  const dropdown = document.getElementById('profileMenuDropdown');
  if (dropdown) dropdown.classList.remove('active');
}

// Profile Menu Popover & Admin Login Controls
function toggleProfileMenu(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById('profileMenuDropdown');
  if (dropdown) dropdown.classList.toggle('active');
}

document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('profileMenuDropdown');
  if (dropdown && !e.target.closest('.user-profile-widget')) {
    dropdown.classList.remove('active');
  }
});

function openAdminLoginModal() {
  const dropdown = document.getElementById('profileMenuDropdown');
  if (dropdown) dropdown.classList.remove('active');

  const m = document.getElementById('adminLoginModal');
  if (m) m.classList.add('active');
}

function closeAdminLoginModal() {
  const m = document.getElementById('adminLoginModal');
  if (m) m.classList.remove('active');
}

function submitAdminLogin() {
  const email = document.getElementById('adminEmailInput')?.value.trim() || 'admin@auracare.hospital';
  const password = document.getElementById('adminPassInput')?.value;

  if (!email || !password) {
    alert("Please enter both Admin username/email and passcode!");
    return;
  }

  if (email === 'admin@auracare.hospital' && (password === 'admin' || password === 'admin123')) {
    closeAdminLoginModal();
    
    // Set login state
    localStorage.setItem('auracare_logged_in', 'true');
    localStorage.setItem('auracare_user_role', 'ADMIN');

    let syncStyle = document.getElementById('auth-sync-style');
    if (!syncStyle) {
      syncStyle = document.createElement('style');
      syncStyle.id = 'auth-sync-style';
      document.head.appendChild(syncStyle);
    }
    syncStyle.innerHTML = '#login-screen{display:none !important;} #app{display:flex !important;}';

    const loginScreen = document.getElementById('login-screen');
    const appShell = document.getElementById('app');

    if (loginScreen) loginScreen.style.setProperty('display', 'none', 'important');
    if (appShell) appShell.style.setProperty('display', 'flex', 'important');

    switchUserRole('ADMIN');
    switchView('admin');
    showToast('Admin Authenticated 🔐', `Logged in as Main Admin (${email}). Full management panel unlocked!`, 'success', 4000);
  } else {
    alert("Invalid Admin passcode or credentials! (Hint: admin@auracare.hospital / admin)");
  }
}

// Modal Open/Close Controls
function openCreateStaffModal() {
  const m = document.getElementById('createStaffModal');
  if (m) m.classList.add('active');
}
function closeCreateStaffModal() {
  const m = document.getElementById('createStaffModal');
  if (m) m.classList.remove('active');
}
function submitCreateStaff() {
  const name = document.getElementById('staffNameInput')?.value || 'New Staff';
  const role = document.getElementById('staffRoleInput')?.value || 'Staff';
  const dept = document.getElementById('staffDeptInput')?.value || 'General';
  const email = document.getElementById('staffEmailInput')?.value || 'staff@auracare.hospital';

  const tbody = document.getElementById('adminStaffTableBody');
  if (tbody) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${tbody.children.length + 1}</td>
      <td><strong>${name}</strong></td>
      <td><span class="badge" style="background:#ebf2ff; color:#2563eb;">${role}</span></td>
      <td>${dept}</td>
      <td>${email}</td>
      <td><span class="badge" style="background:#e6f4ea; color:#059669;">Active</span></td>
      <td style="text-align:right;">
        <button class="btn btn-sm btn-secondary" onclick="showToast('Staff Action', 'Edit staff profile modal', 'info', 2500)"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger" onclick="showToast('Staff Action', 'Suspend staff account', 'warning', 2500)"><i class="fas fa-user-slash"></i></button>
      </td>
    `;
    tbody.appendChild(row);
  }

  closeCreateStaffModal();
  showToast('Staff Created 👤', `Staff account for ${name} created successfully!`, 'success', 3500);
}

function openCreateDoctorModal() {
  const m = document.getElementById('createDoctorModal');
  if (m) m.classList.add('active');
}
function closeCreateDoctorModal() {
  const m = document.getElementById('createDoctorModal');
  if (m) m.classList.remove('active');
}
function submitCreateDoctor() {
  const name = document.getElementById('docNameInput')?.value || 'Dr. New Doctor';
  const spec = document.getElementById('docSpecInput')?.value || 'General';
  const room = document.getElementById('docRoomInput')?.value || 'Room 101';

  const tbody = document.getElementById('adminDoctorTableBody');
  if (tbody) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${tbody.children.length + 1}</td>
      <td><strong>${name}</strong></td>
      <td>${spec}</td>
      <td>${room}</td>
      <td>09:00 AM - 05:00 PM</td>
      <td><span class="badge" style="background:#e6f4ea; color:#059669;">On Duty</span></td>
      <td style="text-align:right;">
        <button class="btn btn-sm btn-secondary" onclick="showToast('Doctor Action', 'Edit doctor schedule', 'info', 2500)"><i class="fas fa-edit"></i></button>
      </td>
    `;
    tbody.appendChild(row);
  }

  closeCreateDoctorModal();
  showToast('Doctor Registered 🩺', `${name} registered successfully!`, 'success', 3500);
}



function openPrescriptionModal(apptId, patientName, docName) {
  const modal = document.getElementById("prescriptionModal");
  if (!modal) return;
  const pEl = document.getElementById("prescPatientName");
  const dEl = document.getElementById("prescDoctorName");
  const idEl = document.getElementById("prescApptId");
  if (pEl) pEl.innerText = patientName || "Patient";
  if (dEl) dEl.innerText = docName || "Doctor";
  if (idEl) idEl.value = apptId || 1;
  modal.classList.add("active");
}

function closePrescriptionModal() {
  const modal = document.getElementById("prescriptionModal");
  if (modal) modal.classList.remove("active");
}

async function submitPrescription(e) {
  if (e) e.preventDefault();
  const apptId = document.getElementById("prescApptId")?.value || document.getElementById("prescApptSelect")?.value || 1;
  const diagnosis = document.getElementById("prescDiagnosis")?.value || "General Checkup & Routine Care";
  const rawMeds = (document.getElementById("prescMedicines")?.value || "").split("\n").filter(l => l.trim().length > 0);
  const parsedMeds = rawMeds.map(l => {
    const parts = l.split("-").map(p => p.trim());
    return {
      name: parts[0] || "General Medicine",
      dosage: parts[1] || "1 Tablet",
      frequency: parts[2] || "Once Daily",
      duration: parts[3] || "7 Days"
    };
  });

  const advice = document.getElementById("prescAdvice")?.value || "Take after meals and rest.";
  const nextVisit = document.getElementById("prescNextVisit")?.value || "After 14 Days";

  try {
    const res = await fetch("/api/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointment_id: parseInt(apptId) || 1,
        diagnosis: diagnosis,
        medicines: parsedMeds.length > 0 ? parsedMeds : [{ name: "Paracetamol 500mg", dosage: "1 Tablet", frequency: "Twice Daily", duration: "5 Days" }],
        advice: advice,
        next_visit: nextVisit
      })
    });
    const data = await res.json();
    if (res.ok) {
      alert("🎉 Digital E-Prescription Issued Successfully!");
      closePrescriptionModal();
      loadPrescriptionsList();
    } else {
      alert("Error issuing prescription: " + (data.detail || "Failed"));
    }
  } catch(err) {
    console.error(err);
    alert("Request failed to issue prescription.");
  }
}

function initDashboardCharts() {
  const canvas1 = document.getElementById("revenueChart") || document.getElementById("kpiTrendChart");
  if (!canvas1) return;
  if (window.kpiTrendChartInstance) {
    try { window.kpiTrendChartInstance.destroy(); } catch(e){}
  }
  try {
    const ctx1 = canvas1.getContext("2d");
    window.kpiTrendChartInstance = new Chart(ctx1, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
        datasets: [{
          label: "Hospital Revenue (₹)",
          data: [280000, 320000, 450000, 410000, 520000, 490000, 610000, 580000],
          borderColor: "#0284c7",
          backgroundColor: "rgba(2, 132, 199, 0.08)",
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: "#0284c7"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: "#f1f5f9" }, ticks: { callback: v => '₹' + (v/1000) + 'k' } },
          x: { grid: { display: false } }
        }
      }
    });
  } catch(e) {
    console.warn("Chart.js notice:", e);
  }
}

function closeNotificationDropdown() {
  const dd = document.getElementById("notificationDropdown");
  if (dd) dd.classList.remove("active");
}

function loadPrescriptionsView() {
  if (typeof loadPrescriptionsList === 'function') loadPrescriptionsList();
}

// ========================================================
//  ADD MODAL CONTROLLERS (Patient, Lab, Pharmacy)
// ========================================================

// 1. Patient EMR Add Handlers
function openAddPatientModal() {
  document.getElementById("addPatientName").value = "";
  document.getElementById("addPatientAge").value = "";
  document.getElementById("addPatientPhone").value = "";
  document.getElementById("addPatientAllergies").value = "";
  document.getElementById("addPatientInsurance").value = "";
  document.getElementById("addPatientPolicyNo").value = "";
  document.getElementById("addPatientHistory").value = "";
  document.getElementById("addPatientModal").classList.add("active");
}

function closeAddPatientModal() {
  document.getElementById("addPatientModal").classList.remove("active");
}

async function submitAddPatient() {
  const modal = document.getElementById("addPatientModal");
  const isModalActive = modal && modal.classList.contains("active");

  let name = "", rawPhone = "", age = 30, gender = "Male", allergies = "None", insurance = "Star Health Insurance", history = "No chronic conditions.";

  if (isModalActive) {
    name = (document.getElementById("addPatientName")?.value || "").trim();
    rawPhone = (document.getElementById("addPatientPhone")?.value || "").trim();
    age = parseInt(document.getElementById("addPatientAge")?.value) || 30;
    gender = document.getElementById("addPatientGender")?.value || "Male";
    allergies = document.getElementById("addPatientAllergies")?.value || "None";
    insurance = document.getElementById("addPatientInsurance")?.value || "Star Health Insurance";
    history = document.getElementById("addPatientHistory")?.value || "No chronic conditions.";
  } else {
    name = (document.getElementById("pageAddPatientName") || document.getElementById("addPatientName"))?.value.trim() || "";
    rawPhone = (document.getElementById("pageAddPatientPhone") || document.getElementById("addPatientPhone"))?.value.trim() || "";
    age = parseInt((document.getElementById("pageAddPatientAge") || document.getElementById("addPatientAge"))?.value) || 30;
    gender = (document.getElementById("pageAddPatientGender") || document.getElementById("addPatientGender"))?.value || "Male";
    allergies = (document.getElementById("pageAddPatientAllergies") || document.getElementById("addPatientAllergies"))?.value || "None";
    insurance = (document.getElementById("pageAddPatientInsurance") || document.getElementById("addPatientInsurance"))?.value || "Star Health Insurance";
    history = (document.getElementById("pageAddPatientHistory") || document.getElementById("addPatientHistory"))?.value || "No chronic conditions.";
  }

  const phone = rawPhone.replace(/[^0-9]/g, '').slice(0, 10);

  if (!name || !phone) {
    alert("Patient Name and Phone Number are required!");
    return;
  }
  if (phone.length !== 10) {
    alert("⚠️ Mobile number must be exactly 10 digits (e.g. 9876543210)!");
    return;
  }
  const payload = {
    name: name,
    age: age,
    gender: gender,
    phone: phone,
    email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    blood_group: (document.getElementById("pageAddPatientBlood") || document.getElementById("addPatientBlood"))?.value || "O+",
    allergies: allergies,
    insurance_provider: insurance,
    medical_history: history
  };
  try {
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert("🎉 New Patient EMR Record created successfully!");
      if (isModalActive) closeAddPatientModal();
      loadPatientsList();
    } else {
      alert("Failed to create patient record.");
    }
  } catch (err) {
    console.error(err);
    alert("Error connecting to server.");
  }
}

// 2. Lab Diagnostic Booking Add Handlers
function openAddLabModal() {
  document.getElementById("addLabPatientName").value = "";
  document.getElementById("addLabPhone").value = "";
  const today = new Date().toISOString().split('T')[0];
  document.getElementById("addLabDate").value = today;
  document.getElementById("addLabModal").classList.add("active");
}

function closeAddLabModal() {
  document.getElementById("addLabModal").classList.remove("active");
}

async function submitAddLab() {
  const modal = document.getElementById("addLabModal");
  const isModalActive = modal && modal.classList.contains("active");

  let patientName = "", rawPhone = "", testName = "", date = "";
  if (isModalActive) {
    patientName = (document.getElementById("addLabPatientName")?.value || "").trim();
    rawPhone = (document.getElementById("addLabPhone")?.value || "").trim();
    testName = document.getElementById("addLabTestName")?.value || "Complete Blood Count (CBC)";
    date = document.getElementById("addLabDate")?.value || new Date().toISOString().split('T')[0];
  } else {
    patientName = (document.getElementById("pageAddLabPatientName") || document.getElementById("addLabPatientName"))?.value.trim() || "";
    rawPhone = (document.getElementById("pageAddLabPhone") || document.getElementById("addLabPhone"))?.value.trim() || "";
    testName = (document.getElementById("pageAddLabTestName") || document.getElementById("addLabTestName"))?.value || "Complete Blood Count (CBC)";
    date = (document.getElementById("pageAddLabSampleDate") || document.getElementById("addLabDate"))?.value || new Date().toISOString().split('T')[0];
  }

  const phone = rawPhone.replace(/[^0-9]/g, '').slice(0, 10);

  if (!patientName || !phone) {
    alert("Patient Name and Phone Number are required!");
    return;
  }

  try {
    const res = await fetch("/api/lab/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_name: patientName,
        phone: phone,
        test_name: testName,
        date: date
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert(`🎉 Lab Test Booked! Code: ${data.booking_code}`);
      if (isModalActive) closeAddLabModal();
      loadLabData();
    } else {
      alert("Failed to book lab test.");
    }
  } catch (err) {
    console.error(err);
    alert("Error connecting to server.");
  }
}

// 3. Pharmacy Stock Item Add Handlers
function openAddPharmacyModal() {
  document.getElementById("addPharmName").value = "";
  document.getElementById("addPharmQty").value = "";
  document.getElementById("addPharmPrice").value = "";
  document.getElementById("addPharmManufacturer").value = "";
  document.getElementById("addPharmExpiry").value = "";
  document.getElementById("addPharmacyModal").classList.add("active");
}

function closeAddPharmacyModal() {
  document.getElementById("addPharmacyModal").classList.remove("active");
}

async function submitAddPharmacy() {
  const modal = document.getElementById("addPharmacyModal");
  const isModalActive = modal && modal.classList.contains("active");

  let name = "", category = "", qty = 0, price = 0, manufacturer = "", expiry = "";

  if (isModalActive) {
    name = (document.getElementById("addPharmName")?.value || "").trim();
    category = document.getElementById("addPharmCategory")?.value || "General";
    qty = parseInt(document.getElementById("addPharmQty")?.value) || 0;
    price = parseFloat(document.getElementById("addPharmPrice")?.value) || 0;
    manufacturer = (document.getElementById("addPharmManufacturer")?.value || "").trim();
    expiry = document.getElementById("addPharmExpiry")?.value || "";
  } else {
    name = (document.getElementById("pageAddPharmName") || document.getElementById("addPharmName"))?.value.trim() || "";
    category = (document.getElementById("pageAddPharmCategory") || document.getElementById("addPharmCategory"))?.value || "General";
    qty = parseInt((document.getElementById("pageAddPharmQty") || document.getElementById("addPharmQty"))?.value) || 0;
    price = parseFloat((document.getElementById("pageAddPharmPrice") || document.getElementById("addPharmPrice"))?.value) || 0;
    manufacturer = (document.getElementById("pageAddPharmManufacturer") || document.getElementById("addPharmManufacturer"))?.value.trim() || "";
    expiry = (document.getElementById("pageAddPharmExpiry") || document.getElementById("addPharmExpiry"))?.value || "";
  }

  if (!name || qty <= 0 || price <= 0) {
    alert("Medicine Name, Quantity and Unit Price are required!");
    return;
  }

  try {
    const res = await fetch("/api/pharmacy/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        category: category,
        stock_qty: qty,
        unit_price: price,
        manufacturer: manufacturer || "Sun Pharma",
        expiry_date: expiry || "2027-12-31"
      })
    });
    const data = await res.json();
    if (res.ok && data.status === "success") {
      alert("🎉 Medicine Item added to Pharmacy Inventory!");
      if (isModalActive) closeAddPharmacyModal();
      loadPharmacyData();
    } else {
      alert("Failed to add medicine item.");
    }
  } catch (err) {
    console.error(err);
    alert("Error connecting to server.");
  }
}

startLiveClock();


// ========================================================
//  FULL-PAGE EDIT PRESCRIPTION HANDLERS
// ========================================================
function openEditPrescriptionModal(prescObj) {
  let p = prescObj;
  if (typeof prescObj === 'number' || typeof prescObj === 'string') {
    p = (allPrescriptionsData || []).find(x => String(x.id) === String(prescObj));
  }
  if (!p) {
    console.error("Prescription record not found:", prescObj);
    alert("Could not load prescription details.");
    return;
  }

  document.getElementById("fullPagePrescId").value = p.id || '';
  document.getElementById("fullPagePrescPatientName").innerText = p.patient_name || 'Patient';
  document.getElementById("fullPagePrescDoctorName").innerText = `${p.doctor_name || 'Doctor'} (${p.department_name || 'Medicine'})`;
  document.getElementById("fullPagePrescDiagnosis").value = p.diagnosis || '';
  document.getElementById("fullPagePrescAdvice").value = p.advice || '';
  document.getElementById("fullPagePrescNextVisit").value = p.next_visit || '';

  const tbody = document.getElementById("fullPageMedsTableBody");
  if (tbody) {
    tbody.innerHTML = "";
    const medsList = Array.isArray(p.medicines) && p.medicines.length > 0 ? p.medicines : [];
    if (medsList.length === 0) {
      addFullPageMedRow('', '1 Tablet', 'Once Daily (Morning)', '7 Days');
    } else {
      medsList.forEach(m => {
        addFullPageMedRow(m.name || '', m.dosage || '1 Tablet', m.frequency || 'Once Daily (Morning)', m.duration || '7 Days');
      });
    }
  }

  switchView('edit-prescription');
}

function addFullPageMedRow(name = '', dosage = '1 Tablet', frequency = 'Once Daily (Morning)', duration = '7 Days') {
  const tbody = document.getElementById("fullPageMedsTableBody");
  if (!tbody) return;

  const tr = document.createElement("tr");
  tr.style.borderBottom = "1px solid #f8fafc";
  tr.innerHTML = `
    <td style="padding:10px 12px;">
      <input type="text" class="form-control full-med-name" value="${name.replace(/"/g, '&quot;')}" placeholder="e.g. Paracetamol 500mg" style="height:40px; font-weight:600; font-size:13px; padding:0 12px; border-radius:8px;" required>
    </td>
    <td style="padding:10px 12px;">
      <input type="text" class="form-control full-med-dosage" value="${dosage.replace(/"/g, '&quot;')}" placeholder="e.g. 1 Tablet" style="height:40px; font-size:12.5px; padding:0 12px; border-radius:8px;">
    </td>
    <td style="padding:10px 12px;">
      <select class="form-control full-med-freq" style="height:40px; font-size:12.5px; padding:0 12px; border-radius:8px;">
        <option value="Once Daily (Morning)" ${frequency.includes("Morning") ? "selected" : ""}>Once Daily (Morning)</option>
        <option value="Once Daily (After Lunch)" ${frequency.includes("Lunch") ? "selected" : ""}>Once Daily (After Lunch)</option>
        <option value="Twice Daily (Morning & Night)" ${frequency.includes("Twice") ? "selected" : ""}>Twice Daily (Morning & Night)</option>
        <option value="Thrice Daily" ${frequency.includes("Thrice") ? "selected" : ""}>Thrice Daily</option>
        <option value="At Bedtime" ${frequency.includes("Bedtime") ? "selected" : ""}>At Bedtime</option>
        <option value="As Needed (SOS)" ${frequency.includes("SOS") || frequency.includes("Needed") ? "selected" : ""}>As Needed (SOS)</option>
      </select>
    </td>
    <td style="padding:10px 12px;">
      <input type="text" class="form-control full-med-duration" value="${duration.replace(/"/g, '&quot;')}" placeholder="e.g. 7 Days" style="height:40px; font-size:12.5px; padding:0 12px; border-radius:8px;">
    </td>
    <td style="padding:10px 12px; text-align:center;">
      <button class="btn btn-sm" type="button" onclick="this.closest('tr').remove()" style="width:38px; height:38px; background:#fee2e2; color:#b91c1c; border:none; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;" title="Delete Row">
        <i class="fas fa-trash"></i>
      </button>
    </td>
  `;
  tbody.appendChild(tr);
}

async function submitFullPageEditPrescription() {
  const prescId = document.getElementById("fullPagePrescId").value;
  const diagnosis = document.getElementById("fullPagePrescDiagnosis").value.trim();
  const advice = document.getElementById("fullPagePrescAdvice").value.trim();
  const nextVisit = document.getElementById("fullPagePrescNextVisit").value.trim();

  const rows = document.querySelectorAll("#fullPageMedsTableBody tr");
  const medicines = [];

  rows.forEach(tr => {
    const name = tr.querySelector(".full-med-name")?.value.trim();
    const dosage = tr.querySelector(".full-med-dosage")?.value.trim() || "1 Tablet";
    const frequency = tr.querySelector(".full-med-freq")?.value || "Once Daily";
    const duration = tr.querySelector(".full-med-duration")?.value.trim() || "7 Days";

    if (name) {
      medicines.push({ name, dosage, frequency, duration });
    }
  });

  if (!diagnosis) {
    alert("⚠️ Clinical Diagnosis is required!");
    return;
  }
  if (medicines.length === 0) {
    alert("⚠️ At least one prescribed medicine is required!");
    return;
  }

  try {
    const res = await fetch(`/api/prescriptions/${prescId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnosis, medicines, advice, next_visit: nextVisit })
    });
    const result = await res.json();
    if (res.ok) {
      switchView('prescriptions');
      loadPrescriptionsList();
      showToast('AuraCare Nexus', 'Prescription updated successfully!', 'success');
    } else {
      alert("Failed to update prescription: " + (result.detail || "Error"));
    }
  } catch (err) {
    console.error(err);
    alert("Server error updating prescription.");
  }
}

async function deletePrescription(prescId) {
  if (!confirm("Are you sure you want to delete this prescription? This action cannot be undone.")) return;
  try {
    const res = await fetch(`/api/prescriptions/${prescId}`, {
      method: "DELETE"
    });
    if (res.ok) {
      alert("🗑️ Prescription deleted successfully!");
      loadPrescriptionsList();
    } else {
      alert("Failed to delete prescription.");
    }
  } catch (err) {
    console.error(err);
    alert("Server error deleting prescription.");
  }
}


async function openAddPrescriptionModal(apptId = null) {
  const selectEl = document.getElementById("fullIssueApptSelect");
  if (!selectEl) return;

  try {
    const res = await fetch("/api/appointments");
    const data = await res.json();
    const appts = Array.isArray(data) ? data : (data.appointments || []);
    window.__fullIssueApptsCache = appts;

    if (appts.length === 0) {
      selectEl.innerHTML = '<option value="">No patient appointments available</option>';
    } else {
      selectEl.innerHTML = appts.map(a => 
        `<option value="${a.id}">${a.patient_name} (${a.booking_code}) - ${a.doctor_name} (${a.department_name || 'General'})</option>`
      ).join('');

      const targetId = apptId || appts[0].id;
      selectEl.value = targetId;
      onFullIssueApptSelectChange(targetId);
    }
  } catch (err) {
    console.error("Error loading appointments:", err);
    selectEl.innerHTML = '<option value="">Error loading appointments</option>';
  }

  // Pre-fill default medicine rows if empty
  const tbody = document.getElementById("fullIssueMedsTableBody");
  if (tbody) {
    tbody.innerHTML = "";
    addFullIssueMedRow('', '', 'Once Daily (Morning)', '');
  }

  switchView('issue-prescription');
}

function onFullIssueApptSelectChange(apptId) {
  const list = window.__fullIssueApptsCache || [];
  const appt = list.find(a => String(a.id) === String(apptId));
  if (!appt) return;

  document.getElementById("fullIssueApptId").value = appt.id;
  document.getElementById("fullIssuePatientName").innerText = appt.patient_name || 'Selected Patient';
  document.getElementById("fullIssueDoctorName").innerText = `${appt.doctor_name || 'Doctor'} (${appt.department_name || 'Medicine'})`;
}

function addFullIssueMedRow(name = '', dosage = '', frequency = 'Once Daily (Morning)', duration = '') {
  const tbody = document.getElementById("fullIssueMedsTableBody");
  if (!tbody) return;

  const tr = document.createElement("tr");
  tr.style.borderBottom = "1px solid #f8fafc";
  tr.innerHTML = `
    <td style="padding:10px 12px;">
      <input type="text" class="form-control full-issue-med-name" value="${name.replace(/"/g, '&quot;')}" placeholder="e.g. Paracetamol 500mg" style="height:40px; font-weight:600; font-size:13px; padding:0 12px; border-radius:8px;" required>
    </td>
    <td style="padding:10px 12px;">
      <input type="text" class="form-control full-issue-med-dosage" value="${dosage.replace(/"/g, '&quot;')}" placeholder="e.g. 1 Tablet" style="height:40px; font-size:12.5px; padding:0 12px; border-radius:8px;">
    </td>
    <td style="padding:10px 12px;">
      <select class="form-control full-issue-med-freq" style="height:40px; font-size:12.5px; padding:0 12px; border-radius:8px;">
        <option value="Once Daily (Morning)" ${frequency.includes("Morning") ? "selected" : ""}>Once Daily (Morning)</option>
        <option value="Once Daily (After Lunch)" ${frequency.includes("Lunch") ? "selected" : ""}>Once Daily (After Lunch)</option>
        <option value="Twice Daily (Morning & Night)" ${frequency.includes("Twice") ? "selected" : ""}>Twice Daily (Morning & Night)</option>
        <option value="Thrice Daily" ${frequency.includes("Thrice") ? "selected" : ""}>Thrice Daily</option>
        <option value="At Bedtime" ${frequency.includes("Bedtime") ? "selected" : ""}>At Bedtime</option>
        <option value="As Needed (SOS)" ${frequency.includes("SOS") || frequency.includes("Needed") ? "selected" : ""}>As Needed (SOS)</option>
      </select>
    </td>
    <td style="padding:10px 12px;">
      <input type="text" class="form-control full-issue-med-duration" value="${duration.replace(/"/g, '&quot;')}" placeholder="e.g. 7 Days" style="height:40px; font-size:12.5px; padding:0 12px; border-radius:8px;">
    </td>
    <td style="padding:10px 12px; text-align:center;">
      <button class="btn btn-sm" type="button" onclick="this.closest('tr').remove()" style="width:38px; height:38px; background:#fee2e2; color:#b91c1c; border:none; border-radius:8px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;" title="Delete Row">
        <i class="fas fa-trash"></i>
      </button>
    </td>
  `;
  tbody.appendChild(tr);
}

async function submitFullPageIssuePrescription() {
  const apptId = document.getElementById("fullIssueApptSelect").value;
  const diagnosis = document.getElementById("fullIssueDiagnosis").value.trim();
  const advice = document.getElementById("fullIssueAdvice").value.trim();
  const nextVisit = document.getElementById("fullIssueNextVisit").value.trim();

  const rows = document.querySelectorAll("#fullIssueMedsTableBody tr");
  const medicines = [];

  rows.forEach(tr => {
    const name = tr.querySelector(".full-issue-med-name")?.value.trim();
    const dosage = tr.querySelector(".full-issue-med-dosage")?.value.trim() || "1 Tablet";
    const frequency = tr.querySelector(".full-issue-med-freq")?.value || "Once Daily";
    const duration = tr.querySelector(".full-issue-med-duration")?.value.trim() || "7 Days";

    if (name) {
      medicines.push({ name, dosage, frequency, duration });
    }
  });

  if (!apptId) {
    alert("⚠️ Please select a patient appointment!");
    return;
  }
  if (!diagnosis) {
    alert("⚠️ Clinical Diagnosis is required!");
    return;
  }
  if (medicines.length === 0) {
    alert("⚠️ At least one prescribed medicine is required!");
    return;
  }

  try {
    const res = await fetch("/api/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointment_id: parseInt(apptId),
        diagnosis: diagnosis,
        medicines: medicines,
        advice: advice,
        next_visit: nextVisit
      })
    });

    const data = await res.json();
    if (res.ok) {
      switchView('prescriptions');
      loadPrescriptionsList();
      showToast('AuraCare Nexus', 'Digital E-Prescription issued successfully!', 'success');
    } else {
      alert("Failed to issue prescription: " + (data.detail || "Error"));
    }
  } catch (err) {
    console.error(err);
    alert("Server error issuing prescription.");
  }
}

// --- Calendar & Health Check Interactivity ---
function showAppointmentsForDay(day) {
  alert(`Appointments on August ${day}, 2026:\n\n1. 10:00 AM - Knee Replacement Audit (OT 2)\n2. 02:00 PM - Pharmacy Stock Review`);
}

function showHealthCheckDetails(type) {
  if (type === 'dental') {
    alert("Dental Check Up Details (July 28, 2026):\n\nStatus: Healthy\nDoctor: Dr. Sarah Jenkins\nNotes: Cleaning completed. Next visit in 6 months.");
  } else if (type === 'brain') {
    alert("Brain IQ Test Details (July 15, 2026):\n\nScore: 125 (Superior)\nNotes: Cognitive function test normal.");
  } else if (type === 'kidney') {
    alert("Kidney Check Details (June 30, 2026):\n\nCreatinine: 0.9 mg/dL (Normal)\nGFR: 95 mL/min/1.73m² (Normal)");
  }
}

function checkInsuranceBalance() {
  const current = localStorage.getItem("auracare_insurance_balance") || "24000";
  alert(`AuraCare Card Insurance Balance:\n\nRemaining Balance: $${Number(current).toLocaleString()}\nStatus: Active\nProvider: HDFC ERGO Health`);
}

// =========================================================================
//  PATIENT DOCUMENTS VAULT CONTROLLER
// =========================================================================
let cachedFoldersList = [];
let activeDocumentFolderId = null;

async function loadPatientFolders() {
  const container = document.getElementById("folders-list-container");
  if (!container) return;
  
  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
      <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 8px;"></i>
      Loading patient cabinets...
    </div>
  `;
  
  try {
    const res = await fetch("/api/patients/folders");
    if (!res.ok) throw new Error("API load failed");
    cachedFoldersList = await res.json();
    renderFolderCards(cachedFoldersList);
  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">
        <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 8px;"></i>
        Failed to fetch folder list.
      </div>
    `;
  }
}

function renderFolderCards(folders) {
  const container = document.getElementById("folders-list-container");
  if (!container) return;
  
  if (folders.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <i class="far fa-folder" style="font-size: 32px; margin-bottom: 8px; display: block; color: var(--border);"></i>
        No patient document folders created yet. Click "+ Create Folder" to start.
      </div>
    `;
    return;
  }
  
  container.innerHTML = folders.map(f => {
    const dateStr = new Date(f.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    return `
      <div class="folder-card" onclick="openPatientFolder(${f.id}, '${f.patient_name.replace(/'/g, "\\'")}')">
        <button class="folder-delete-btn" onclick="deletePatientFolder(${f.id}, event)" title="Delete Cabinet">
          <i class="fas fa-trash-alt"></i>
        </button>
        <i class="fas fa-folder folder-icon"></i>
        <div class="folder-name">${f.patient_name}</div>
        <div class="folder-meta">Created ${dateStr}</div>
      </div>
    `;
  }).join('');
}

function filterPatientFolders(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderFolderCards(cachedFoldersList);
    return;
  }
  const filtered = cachedFoldersList.filter(f => f.patient_name.toLowerCase().includes(q));
  renderFolderCards(filtered);
}

// Modal management
function openCreateFolderModal() {
  document.getElementById("create-folder-modal").classList.add("active");
  document.getElementById("new-folder-patient-name").focus();
}

function closeCreateFolderModal() {
  document.getElementById("create-folder-modal").classList.remove("active");
  document.getElementById("create-folder-form").reset();
}

async function handleCreateFolder(e) {
  e.preventDefault();
  const name = document.getElementById("new-folder-patient-name").value.trim();
  if (!name) return;
  
  try {
    const res = await fetch("/api/patients/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_name: name })
    });
    
    const result = await res.json();
    if (res.ok && result.success) {
      showToast("Cabinet Created", `Folder for '${name}' created successfully!`, "success");
      closeCreateFolderModal();
      loadPatientFolders();
    } else {
      showToast("Duplicate Folder", result.detail || "Folder name already exists.", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("Network Error", "Could not connect to database server.", "danger");
  }
}

async function deletePatientFolder(id, event) {
  event.stopPropagation();
  
  if (!confirm("Are you sure you want to delete this folder? All stored files inside it will be permanently deleted!")) {
    return;
  }
  
  try {
    const res = await fetch(`/api/patients/folders/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Folder Removed", "Patient cabinet and stored files deleted successfully.", "success");
      loadPatientFolders();
    } else {
      showToast("Delete Failed", "Unable to remove folder.", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("Network Error", "Unable to contact folder API.", "danger");
  }
}

// Open Folder Details
function openPatientFolder(id, name) {
  activeDocumentFolderId = id;
  document.getElementById("active-folder-title").innerHTML = `
    <i class="fas fa-folder-open" style="color:var(--neon-teal); margin-right:10px;"></i>
    ${name} Documents
  `;
  
  document.getElementById("docs-folders-pane").style.display = "none";
  document.getElementById("docs-files-pane").style.display = "block";
  document.getElementById("docs-file-input").value = "";
  
  loadFolderFiles(id);
}

function goBackToFolders() {
  activeDocumentFolderId = null;
  document.getElementById("docs-folders-pane").style.display = "block";
  document.getElementById("docs-files-pane").style.display = "none";
  loadPatientFolders();
}

async function loadFolderFiles(folderId) {
  const container = document.getElementById("files-list-container");
  if (!container) return;
  
  container.innerHTML = `
    <tr>
      <td colspan="4" style="text-align:center; padding:30px; color:var(--text-muted);">
        <i class="fas fa-spinner fa-spin" style="font-size:20px; margin-bottom:8px; display:block; color:var(--neon-teal);"></i>
        Listing patient documents vault...
      </td>
    </tr>
  `;
  
  try {
    const res = await fetch(`/api/patients/folders/${folderId}/files`);
    if (!res.ok) throw new Error("Failed to load files");
    const files = await res.json();
    
    if (files.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; padding:30px; color:var(--text-muted);">
            <i class="far fa-file" style="font-size:24px; margin-bottom:8px; display:block; color:var(--border);"></i>
            No files uploaded in this patient cabinet.
          </td>
        </tr>
      `;
      return;
    }
    
    container.innerHTML = files.map(f => {
      const dateStr = new Date(f.uploaded_at).toLocaleDateString() + ' ' + new Date(f.uploaded_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      const sizeKB = (f.file_size / 1024).toFixed(1) + " KB";
      
      let extIcon = "far fa-file";
      const ext = f.filename.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) extIcon = "far fa-file-image";
      else if (ext === 'pdf') extIcon = "far fa-file-pdf";
      else if (['doc', 'docx'].includes(ext)) extIcon = "far fa-file-word";
      
      return `
        <tr>
          <td><strong style="color:var(--text-main); font-weight:700;"><i class="${extIcon}" style="color:#0284c7; margin-right:8px;"></i>${f.filename}</strong></td>
          <td style="color:var(--text-muted); font-size:12px;">${sizeKB}</td>
          <td style="color:var(--text-muted); font-size:12px;">${dateStr}</td>
          <td style="text-align:right;">
            <a class="btn btn-sm btn-secondary" href="${f.file_path}" target="_blank" style="padding:6px 10px; margin-right:6px; display:inline-flex; align-items:center; gap:4px; text-decoration:none;">
              <i class="fas fa-eye"></i> View
            </a>
            <button class="btn btn-sm btn-secondary btn-danger-hover" onclick="deletePatientDocument(${f.id})" style="padding:6px 10px; color:#ef4444 !important; background:rgba(239, 68, 68, 0.08);">
              <i class="fas fa-trash-alt"></i> Remove
            </button>
          </td>
        </tr>
      `;
    }).join('');
    
  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding:30px; color:#ef4444;">
          <i class="fas fa-exclamation-triangle" style="font-size:20px; display:block; margin-bottom:8px;"></i>
          Failed to fetch file vault.
        </td>
      </tr>
    `;
  }
}

async function handlePatientFileUpload(event) {
  event.preventDefault();
  if (!activeDocumentFolderId) return;
  
  const fileInput = document.getElementById("docs-file-input");
  if (!fileInput.files || fileInput.files.length === 0) {
    showToast("Validation Error", "Please select a file to upload first.", "warning");
    return;
  }
  
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append("file", file);
  
  showToast("Uploading File", "Transferring document data...", "info");
  
  try {
    const res = await fetch(`/api/patients/folders/${activeDocumentFolderId}/upload`, {
      method: "POST",
      body: formData
    });
    
    const result = await res.json();
    if (res.ok && result.success) {
      showToast("Upload Completed", `Document '${file.name}' uploaded successfully!`, "success");
      fileInput.value = "";
      loadFolderFiles(activeDocumentFolderId);
    } else {
      showToast("Upload Failed", result.detail || "Unable to save document.", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("Connection Lost", "Failed to connect to file vault API.", "danger");
  }
}

async function deletePatientDocument(id) {
  if (!confirm("Are you sure you want to permanently delete this document from the file locker?")) return;
  
  try {
    const res = await fetch(`/api/patients/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Document Removed", "File deleted from disk and database.", "success");
      loadFolderFiles(activeDocumentFolderId);
    } else {
      showToast("Delete Failed", "Unable to delete file.", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("Network Error", "Unable to contact document API.", "danger");
  }
}

// =========================================================================
//  CAMERA-BASED LIVE DOCUMENT SCANNER CONTROLLER
// =========================================================================
let scannerStream = null;

async function openCameraScanner() {
  if (!activeDocumentFolderId) {
    showToast("Folder Required", "Please open a patient folder first.", "warning");
    return;
  }
  
  const video = document.getElementById("scanner-video");
  const modal = document.getElementById("camera-scanner-modal");
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Camera APIs are not supported in this browser or requires a secure context (HTTPS/Localhost).");
    return;
  }
  
  document.getElementById("scanner-capture-preview").style.display = "none";
  document.getElementById("scanner-target-box").style.display = "flex";
  video.style.display = "block";
  
  document.getElementById("scanner-btn-capture").style.display = "flex";
  document.getElementById("scanner-btn-retake").style.display = "none";
  document.getElementById("scanner-btn-save").style.display = "none";
  
  modal.classList.add("active");
  
  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    video.srcObject = scannerStream;
    video.play();
  } catch (err) {
    console.error(err);
    alert("Unable to access camera. Please verify permission settings.");
    closeCameraScanner();
  }
}

function closeCameraScanner() {
  const modal = document.getElementById("camera-scanner-modal");
  modal.classList.remove("active");
  
  if (scannerStream) {
    scannerStream.getTracks().forEach(track => track.stop());
    scannerStream = null;
  }
}

function captureScannerSnapshot() {
  const video = document.getElementById("scanner-video");
  const canvas = document.getElementById("scanner-canvas");
  const imgPreview = document.getElementById("scanner-capture-preview");
  const targetBox = document.getElementById("scanner-target-box");
  
  if (!video || !canvas) return;
  
  const ctx = canvas.getContext("2d");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  imgPreview.src = canvas.toDataURL("image/png");
  
  video.style.display = "none";
  targetBox.style.display = "none";
  imgPreview.style.display = "block";
  
  document.getElementById("scanner-btn-capture").style.display = "none";
  document.getElementById("scanner-btn-retake").style.display = "flex";
  document.getElementById("scanner-btn-save").style.display = "flex";
}

function retakeScannerSnapshot() {
  const video = document.getElementById("scanner-video");
  const imgPreview = document.getElementById("scanner-capture-preview");
  const targetBox = document.getElementById("scanner-target-box");
  
  imgPreview.style.display = "none";
  video.style.display = "block";
  targetBox.style.display = "flex";
  
  document.getElementById("scanner-btn-capture").style.display = "flex";
  document.getElementById("scanner-btn-retake").style.display = "none";
  document.getElementById("scanner-btn-save").style.display = "none";
}

async function uploadScannerSnapshot() {
  if (!activeDocumentFolderId) return;
  
  const canvas = document.getElementById("scanner-canvas");
  if (!canvas) return;
  
  showToast("Saving Scan", "Saving captured snapshot into patient locker...", "info");
  
  canvas.toBlob(async (blob) => {
    if (!blob) {
      showToast("Scan Error", "Failed to compile captured scan image.", "danger");
      return;
    }
    
    const timestamp = new Date().getTime();
    const filename = `scan_${timestamp}.png`;
    
    const formData = new FormData();
    formData.append("file", blob, filename);
    
    try {
      const res = await fetch(`/api/patients/folders/${activeDocumentFolderId}/upload`, {
        method: "POST",
        body: formData
      });
      
      const result = await res.json();
      if (res.ok && result.success) {
        showToast("Scan Saved 🎉", "Captured image stored in patient locker successfully!", "success");
        closeCameraScanner();
        loadFolderFiles(activeDocumentFolderId);
      } else {
        showToast("Save Failed", result.detail || "Unable to save captured scan.", "warning");
      }
    } catch (err) {
      console.error(err);
      showToast("Network Error", "Unable to submit scan payload to database.", "danger");
    }
  }, "image/png");
}

// =========================================================================
//  LOCAL SCANNER DIRECTORY AUTO-SYNC CONTROLLER (Directory Access API)
// =========================================================================
let localFolderHandle = null;
let syncedFileNames = new Set();
let folderSyncInterval = null;

async function setupFolderSync() {
  if (!activeDocumentFolderId) {
    showToast("Folder Required", "Please open a patient folder first.", "warning");
    return;
  }
  
  if (!window.showDirectoryPicker) {
    alert("Local Folder Access is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Opera.");
    return;
  }
  
  try {
    localFolderHandle = await window.showDirectoryPicker();
    syncedFileNames.clear();
    
    if (folderSyncInterval) clearInterval(folderSyncInterval);
    folderSyncInterval = setInterval(scanLocalFolderForNewFiles, 4000);
    
    document.getElementById("sync-status-indicator").style.display = "inline-flex";
    showToast("Auto-Sync Activated 🔄", "Folder auto-sync enabled successfully!", "success");
    
  } catch (err) {
    console.error("Auto-sync folder picker error:", err);
    showToast("Sync Cancelled", "No local directory was selected.", "warning");
  }
}

async function scanLocalFolderForNewFiles() {
  if (!localFolderHandle || !activeDocumentFolderId) return;
  
  try {
    for await (const entry of localFolderHandle.values()) {
      if (entry.kind === 'file') {
        const name = entry.name;
        
        if (name.startsWith('.') || name.startsWith('~') || syncedFileNames.has(name)) {
          continue;
        }
        
        const ext = name.split('.').pop().toLowerCase();
        if (!['png', 'jpg', 'jpeg', 'pdf', 'tiff', 'gif'].includes(ext)) {
          continue;
        }
        
        const file = await entry.getFile();
        syncedFileNames.add(name);
        
        await uploadSyncFile(file);
      }
    }
  } catch (err) {
    console.error("Error reading local sync folder:", err);
  }
}

async function uploadSyncFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  
  showToast("New Scan Detected 📄", `Automatically uploading '${file.name}'...`, "info");
  
  try {
    const res = await fetch(`/api/patients/folders/${activeDocumentFolderId}/upload`, {
      method: "POST",
      body: formData
    });
    
    const result = await res.json();
    if (res.ok && result.success) {
      showToast("Auto-Saved 🎉", `'${file.name}' stored in patient cabinet folder successfully!`, "success");
      loadFolderFiles(activeDocumentFolderId);
    }
  } catch (err) {
    console.error("Auto-sync upload failed:", err);
  }
}

function stopFolderSync() {
  if (folderSyncInterval) {
    clearInterval(folderSyncInterval);
    folderSyncInterval = null;
  }
  localFolderHandle = null;
  document.getElementById("sync-status-indicator").style.display = "none";
  showToast("Sync Disabled", "Scanner directory watching stopped.", "info");
}

/* ==========================================================================
   DATE FILTER INITIALIZER (REQUIREMENT 1: TODAY'S DATE ONLY DEFAULT)
   ========================================================================== */
function initDateFilters() {
  const today = new Date().toISOString().split('T')[0];
  const dateInputIds = [
    'waDateFilter', 'queueDateFilter', 'addApptDate', 
    'pageAddApptDate', 'bookingDateInput', 'editApptDate',
    'pageEditApptDate', 'addLabDate', 'pageAddLabSampleDate'
  ];
  
  dateInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value) {
      el.value = today;
    }
  });
}

/* ==========================================================================
   CREATE INVOICE POS BILLING MODULE (REQUIREMENT 3: MATCHING USER IMAGE 3)
   ========================================================================== */
const POS_PRODUCT_CATALOG = {
  "Paracetamol 650mg (Dolo)": { hsn: "3004", rate: 15.00 },
  "Amoxicillin 500mg": { hsn: "3004", rate: 65.00 },
  "Metoprolol 25mg": { hsn: "3004", rate: 45.00 },
  "Atorvastatin 10mg": { hsn: "3004", rate: 85.00 },
  "Pantoprazole 40mg": { hsn: "3004", rate: 35.00 },
  "Doctor Consultation Fee": { hsn: "9993", rate: 500.00 },
  "ECG Diagnostics Test": { hsn: "9993", rate: 350.00 },
  "Complete Blood Count (CBC)": { hsn: "9993", rate: 450.00 },
  "Lipid Profile Test": { hsn: "9993", rate: 750.00 },
  "X-Ray Chest PA View": { hsn: "9993", rate: 600.00 }
};

let posItems = [];
let posBillCounter = 1;

function getFormattedPosDateTime() {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(now.getDate()).padStart(2, '0');
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  
  return `${day}-${month}-${year},${strHours}:${minutes} ${ampm}`;
}

function initPosBilling() {
  const dtInput = document.getElementById("posDateTime");
  if (dtInput) {
    dtInput.value = getFormattedPosDateTime();
    setInterval(() => {
      if (document.getElementById("posDateTime")) {
        document.getElementById("posDateTime").value = getFormattedPosDateTime();
      }
    }, 1000);
  }

  const billInput = document.getElementById("posBillNo");
  if (billInput) {
    billInput.value = String(posBillCounter).padStart(5, '0');
  }

  try { loadPosHistoryTable(); } catch(e){}
}

function onPosProductSelect() {
  const searchVal = document.getElementById("posProductSearch")?.value?.trim();
  if (searchVal && POS_PRODUCT_CATALOG[searchVal]) {
    const item = POS_PRODUCT_CATALOG[searchVal];
    const hsnEl = document.getElementById("posProductHsn");
    const rateEl = document.getElementById("posProductRate");
    if (hsnEl) hsnEl.value = item.hsn;
    if (rateEl) rateEl.value = item.rate.toFixed(2);
  }
}

function addPosItem() {
  const nameInput = document.getElementById("posProductSearch");
  const hsnInput = document.getElementById("posProductHsn");
  const qtyInput = document.getElementById("posProductQty");
  const rateInput = document.getElementById("posProductRate");

  const name = nameInput?.value?.trim();
  const hsn = hsnInput?.value?.trim() || "3004";
  const qty = parseInt(qtyInput?.value) || 1;
  const rate = parseFloat(rateInput?.value) || 0.00;

  if (!name) {
    alert("Please enter or select a Product Name.");
    nameInput?.focus();
    return;
  }

  const amount = qty * rate;
  posItems.push({
    id: Date.now() + Math.random(),
    name,
    hsn,
    qty,
    rate,
    amount
  });

  // Reset product inputs
  nameInput.value = "";
  hsnInput.value = "";
  qtyInput.value = "1";
  rateInput.value = "";

  renderPosTable();
  calculatePosTotals();
  nameInput.focus();
}

function deletePosItem(itemId) {
  posItems = posItems.filter(item => item.id !== itemId);
  renderPosTable();
  calculatePosTotals();
}

function renderPosTable() {
  const tbody = document.getElementById("posItemsTableBody");
  if (!tbody) return;

  if (posItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: #64748b; font-size: 13px;">
          No products added yet. Search a product above and click <strong>ADD ITEM</strong>.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = posItems.map((item, idx) => `
    <tr style="border-bottom: 1px solid #1e293b; color: #ffffff; font-size: 13.5px;">
      <td style="padding: 12px 16px; color: #94a3b8; font-weight: 600;">${idx + 1}</td>
      <td style="padding: 12px 16px; font-weight: 600;">${item.name}</td>
      <td style="padding: 12px 16px; color: #94a3b8; font-family: var(--font-mono);">${item.hsn}</td>
      <td style="padding: 12px 16px; text-align: right; font-family: var(--font-mono);">${item.rate.toFixed(2)}</td>
      <td style="padding: 12px 16px; text-align: center; font-weight: 700;">${item.qty}</td>
      <td style="padding: 12px 16px; text-align: right; font-weight: 700; font-family: var(--font-mono); color: #10b981;">${item.amount.toFixed(2)}</td>
      <td style="padding: 12px 16px; text-align: center;">
        <button type="button" class="pos-del-btn" onclick="deletePosItem(${item.id})">DEL</button>
      </td>
    </tr>
  `).join('');
}

function calculatePosTotals() {
  const total = posItems.reduce((sum, item) => sum + item.amount, 0);
  const totalDisplay = document.getElementById("posTotalAmountDisplay");
  if (totalDisplay) {
    totalDisplay.innerText = total % 1 === 0 ? String(total) : total.toFixed(2);
  }

  const givenInput = document.getElementById("posGivenAmount");
  const given = parseFloat(givenInput?.value) || 0;
  const returnAmt = Math.max(0, given - total);

  const returnDisplay = document.getElementById("posReturnAmountDisplay");
  if (returnDisplay) {
    returnDisplay.innerText = returnAmt.toFixed(2);
  }
}

async function printPosBill() {
  const customerName = document.getElementById("posCustomerName")?.value?.trim();
  const customerMobile = document.getElementById("posCustomerMobile")?.value?.trim() || "";
  const customerAddress = document.getElementById("posCustomerAddress")?.value?.trim() || "";
  const paymentMethod = document.getElementById("posPaymentMethod")?.value || "CASH";
  const billNo = document.getElementById("posBillNo")?.value || String(posBillCounter).padStart(5, '0');
  const dateTimeStr = document.getElementById("posDateTime")?.value || getFormattedPosDateTime();

  if (!customerName) {
    alert("Please enter Customer Name.");
    document.getElementById("posCustomerName")?.focus();
    return;
  }

  if (posItems.length === 0) {
    alert("Please add at least one Product item to the invoice before printing.");
    document.getElementById("posProductSearch")?.focus();
    return;
  }

  const totalAmount = posItems.reduce((sum, item) => sum + item.amount, 0);
  const givenAmount = parseFloat(document.getElementById("posGivenAmount")?.value) || 0;
  const returnAmount = Math.max(0, givenAmount - totalAmount);

  // Save to backend database
  try {
    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoice_id: `INV-${billNo}`,
        patient_name: customerName,
        amount: totalAmount,
        payment_method: paymentMethod
      })
    });
  } catch (e) {
    console.warn("API payment log notice:", e);
  }

  // Generate printable thermal / invoice receipt window
  const printWindow = window.open('', '_blank', 'width=750,height=850');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Tax Invoice #${billNo} - AuraCare AI</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; background: #f8fafc; color: #0f172a; }
        .invoice-card { background: #ffffff; border-radius: 16px; padding: 32px; max-width: 650px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
        .brand { font-size: 24px; font-weight: 800; color: #0f172a; }
        .brand span { color: #0284c7; }
        .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; font-size: 13px; background: #f1f5f9; padding: 14px 18px; border-radius: 10px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
        .table th { background: #0f172a; color: #ffffff; padding: 10px 12px; text-align: left; }
        .table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
        .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px 20px; width: 280px; margin-left: auto; font-size: 14px; }
        .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
        .summary-row.total { font-weight: 800; font-size: 16px; border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 4px; color: #0284c7; }
        .btn-print { background: #ef4444; color: #fff; border: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px; margin-top: 24px; width: 100%; text-transform: uppercase; }
        @media print { .btn-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="invoice-card">
        <div class="header">
          <div class="brand">AuraCare <span>AI</span> Hospital</div>
          <div class="subtitle">Multi-Specialty Super Specialty Medical Center & Research Institute</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">GSTIN: 33AAAAA0000A1Z5 • 24x7 Counter Helpline: +91 98765 43210</div>
        </div>

        <div style="text-align: center; font-weight: 800; font-size: 15px; color: #0f172a; margin-bottom: 16px; text-transform: uppercase;">
          TAX INVOICE / CASH RECEIPT
        </div>

        <div class="meta-grid">
          <div><strong>Bill No:</strong> ${billNo}</div>
          <div><strong>Date & Time:</strong> ${dateTimeStr}</div>
          <div><strong>Customer Name:</strong> ${customerName}</div>
          <div><strong>Mobile:</strong> ${customerMobile || 'N/A'}</div>
          <div><strong>Address:</strong> ${customerAddress || 'Counter Walk-in'}</div>
          <div><strong>Payment Mode:</strong> ${paymentMethod}</div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product Name</th>
              <th>HSN</th>
              <th style="text-align:right;">Rate</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${posItems.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${item.name}</strong></td>
                <td>${item.hsn}</td>
                <td style="text-align:right;">${item.rate.toFixed(2)}</td>
                <td style="text-align:center;">${item.qty}</td>
                <td style="text-align:right; font-weight:700;">${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary-box">
          <div class="summary-row total"><span>TOTAL AMOUNT:</span><span>₹${totalAmount.toFixed(2)}</span></div>
          <div class="summary-row"><span>Given Amount:</span><span>₹${givenAmount.toFixed(2)}</span></div>
          <div class="summary-row" style="color:#10b981; font-weight:700;"><span>Return Amount:</span><span>₹${returnAmount.toFixed(2)}</span></div>
        </div>

        <button class="btn-print" onclick="window.print()">Print Receipt</button>
      </div>
      <script>
        setTimeout(() => { window.print(); }, 400);
      </script>
    </body>
    </html>
  `);

  // Auto increment Bill No & clear form for next customer
  posBillCounter++;
  const nextBillNo = String(posBillCounter).padStart(5, '0');
  const billInput = document.getElementById("posBillNo");
  if (billInput) billInput.value = nextBillNo;

  posItems = [];
  document.getElementById("posCustomerName").value = "";
  document.getElementById("posCustomerMobile").value = "";
  document.getElementById("posCustomerAddress").value = "";
  document.getElementById("posGivenAmount").value = "0";
  renderPosTable();
  calculatePosTotals();

  // Reload payments log table underneath
  try { await loadPaymentsData(); } catch (e) {}
  try { await loadPosHistoryTable(); } catch (e) {}
}

async function loadPosHistoryTable() {
  const tbody = document.getElementById("posHistoryTableBody");
  if (!tbody) return;

  try {
    const res = await fetch("/api/payments");
    const payments = await res.json();
    
    if (!payments || payments.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">
            No counter invoices issued yet.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = payments.slice(0, 15).map(p => `
      <tr>
        <td><strong style="font-family:var(--font-mono); color:var(--text-dark);">${p.invoice_id || 'INV-00001'}</strong></td>
        <td><strong style="color:var(--text-dark);">${p.patient_name}</strong></td>
        <td><span class="badge badge-blue">${p.payment_method}</span></td>
        <td><strong style="color:#10b981; font-family:var(--font-mono);">₹${parseFloat(p.amount).toFixed(2)}</strong></td>
        <td><span class="badge badge-green"><i class="fas fa-check-circle"></i> Paid</span></td>
        <td style="font-size:12px; color:var(--text-muted); font-family:var(--font-mono);">${p.timestamp}</td>
        <td style="text-align:right;">
          <button class="btn-secondary" onclick="printPaymentReceipt('${p.transaction_ref}', '${p.patient_name}', ${p.amount}, '${p.payment_method}', '${p.timestamp}', '${p.invoice_id}')" style="font-size:11px; padding:4px 10px;">
            <i class="fas fa-print"></i> Print
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error("Error loading POS history table:", err);
  }
}
