// ========================================================
//  Arfa Nova Technology — Standalone Custom Page Controller
// ========================================================

const urlParams = new URLSearchParams(window.location.search);
const pageKey = urlParams.get('page');

let pageMeta = null;
let pageColumns = [];
let pageRows = [];
let filteredRows = [];

document.addEventListener("DOMContentLoaded", async () => {
  const rawDark = localStorage.getItem('auracare_dark_mode');
  const isDarkMode = rawDark === null ? true : (rawDark === 'true');
  if (isDarkMode) {
    document.body.classList.add('dark-theme');
    document.documentElement.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
    document.documentElement.classList.remove('dark-theme');
  }

  if (!pageKey) {
    alert("No custom module page key specified in URL parameters.");
    window.location.href = "/static/index.html";
    return;
  }
  
  startClock();
  await loadBranding();
  await loadCustomPageLayout();
});

// 1. Fetch & Apply System Settings
async function loadBranding() {
  try {
    const res = await fetch("/api/super-admin/settings");
    if (!res.ok) return;
    const settings = await res.json();
    
    // Tab title
    if (settings.software_name) {
      document.title = `${settings.software_name} — Custom Module`;
    }
    // Logo
    const logoImg = document.getElementById("sidebar-logo");
    if (logoImg && settings.software_logo) {
      logoImg.src = settings.software_logo;
    }
    // Title
    const brandTitle = document.getElementById("sidebar-title");
    if (brandTitle && settings.software_name) {
      brandTitle.innerText = settings.software_name;
    }
  } catch (err) {
    console.error("Failed to load branding", err);
  }
}

// 2. Fetch pages & setup page layout
async function loadCustomPageLayout() {
  try {
    const res = await fetch("/api/super-admin/pages");
    const pages = await res.json();
    
    // Find metadata for current page
    pageMeta = pages.find(p => p.key === pageKey);
    if (!pageMeta) {
      alert(`Custom module page '${pageKey}' not found.`);
      window.location.href = "/static/index.html";
      return;
    }
    
    pageColumns = JSON.parse(pageMeta.columns_json);
    
    // Setup Page Titles
    document.getElementById("currentPageTitle").innerText = pageMeta.title;
    document.getElementById("currentPageSubtitle").innerText = pageMeta.subtitle;
    document.getElementById("card-module-name").innerText = pageMeta.title;
    document.getElementById("card-module-subtitle").innerText = pageMeta.subtitle;
    
    const iconEl = document.getElementById("card-module-icon");
    if (iconEl) iconEl.className = pageMeta.icon || "fas fa-folder-open";
    
    // Build Sidebar Menu
    buildSidebar(pages);
    
    // Setup CRUD table headers
    buildTableHeaders();
    
    // Load rows
    await fetchTableRows();
    
    // Build form inputs in CRUD modal dynamically
    buildModalFields();
    
  } catch (err) {
    console.error("Error setting up custom page layout", err);
  }
}

function buildSidebar(pages) {
  const container = document.getElementById("sidebar-nav-menu");
  if (!container) return;
  
  let html = "";
  const visiblePages = pages.filter(p => p.is_visible === 1);
  const builtInPages = visiblePages.filter(p => p.is_custom === 0);
  const customPages = visiblePages.filter(p => p.is_custom === 1);
  
  html += `<div class="nav-section-title">Overview</div>`;
  builtInPages.forEach(p => {
    if (p.key === 'settings') return; // Skip settings
    html += `
      <a class="nav-item" id="nav-${p.key}" href="/static/index.html#${p.key}">
        <i class="${p.icon}"></i>
        ${p.title}
      </a>
    `;
  });
  
  if (customPages.length > 0) {
    html += `<div class="nav-section-title">Custom Modules</div>`;
    customPages.forEach(p => {
      const isActive = p.key === pageKey ? "active" : "";
      html += `
        <a class="nav-item ${isActive}" id="nav-${p.key}" href="/static/custom-page.html?page=${p.key}">
          <i class="${p.icon}"></i>
          ${p.title}
        </a>
      `;
    });
  }
  
  const settingsPage = visiblePages.find(p => p.key === 'settings');
  if (settingsPage) {
    html += `<div class="nav-section-title">Management</div>`;
    html += `
      <a class="nav-item" id="nav-settings" href="/static/index.html#settings">
        <i class="${settingsPage.icon}"></i>
        ${settingsPage.title}
      </a>
    `;
  }
  
  container.innerHTML = html;
}

// 3. Table Headers
function buildTableHeaders() {
  const container = document.getElementById("custom-thead");
  if (!container) return;
  
  container.innerHTML = `
    <tr>
      <th>ID</th>
      ${pageColumns.map(col => `<th>${col}</th>`).join('')}
      <th style="text-align:right;">Actions</th>
    </tr>
  `;
}

// 4. Fetch Table Rows
async function fetchTableRows() {
  const tbody = document.getElementById("custom-tbody");
  if (!tbody) return;
  
  try {
    const res = await fetch(`/api/super-admin/dynamic/${pageMeta.table_name}`);
    pageRows = await res.json();
    filteredRows = [...pageRows];
    
    renderTableRows(filteredRows);
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `
      <tr>
        <td colspan="100" style="text-align:center; padding:30px; color:#ef4444;">
          Failed to fetch table records from SQLite database.
        </td>
      </tr>
    `;
  }
}

function renderTableRows(rows) {
  const tbody = document.getElementById("custom-tbody");
  if (!tbody) return;
  
  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${pageColumns.length + 2}" style="text-align:center; padding:40px; color:#64748b;">
          No records found in database.
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = rows.map((row, rIdx) => {
    const isPOS = pageKey === 'pos_billing';
    return `
      <tr>
        <td><strong>#${row.id}</strong></td>
        ${pageColumns.map((col, cIdx) => `<td>${row[`col_${cIdx}`] || ''}</td>`).join('')}
        <td style="text-align:right;">
          ${isPOS ? `
            <button class="btn btn-sm btn-secondary" onclick="openReceiptModal(${row.id}, ${rIdx})" style="padding:6px 10px; margin-right:4px; color:#10b981 !important; background:rgba(16, 185, 129, 0.08);">
              <i class="fas fa-file-invoice"></i> Receipt
            </button>
          ` : ''}
          <button class="btn btn-sm btn-secondary" onclick="openEditModal(${row.id}, ${rIdx})" style="padding:6px 10px; margin-right:4px;">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="btn btn-sm btn-secondary btn-danger-hover" onclick="deleteRecord(${row.id})" style="padding:6px 10px; color:#ef4444 !important; background:rgba(239, 68, 68, 0.08);">
            <i class="fas fa-trash-alt"></i> Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// 5. Search / Filter Rows
function filterCustomRows(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    filteredRows = [...pageRows];
  } else {
    filteredRows = pageRows.filter(row => {
      return pageColumns.some((col, cIdx) => {
        const val = row[`col_${cIdx}`] || '';
        return String(val).toLowerCase().includes(q);
      });
    });
  }
  renderTableRows(filteredRows);
}

// 6. Build CRUD Modal Inputs
function buildModalFields() {
  const container = document.getElementById("modal-fields-container");
  if (!container) return;
  
  container.innerHTML = pageColumns.map((col, cIdx) => `
    <div class="form-group" style="margin-bottom:16px;">
      <label>${col}</label>
      <input type="text" id="modal-col_${cIdx}" class="form-control" required>
    </div>
  `).join('');
}

// 7. Modal Handlers
function openCrudModal() {
  document.getElementById("crud-row-id").value = "";
  document.getElementById("crud-form").reset();
  document.getElementById("crud-modal-title").innerText = "Add New Record";
  document.getElementById("crud-modal").classList.add("active");
}

function openEditModal(id, rowIdx) {
  document.getElementById("crud-row-id").value = id;
  document.getElementById("crud-modal-title").innerText = `Modify Record #${id}`;
  
  const row = filteredRows[rowIdx];
  pageColumns.forEach((col, cIdx) => {
    const input = document.getElementById(`modal-col_${cIdx}`);
    if (input) input.value = row[`col_${cIdx}`] || "";
  });
  
  document.getElementById("crud-modal").classList.add("active");
}

function closeCrudModal() {
  document.getElementById("crud-modal").classList.remove("active");
}

// 8. CRUD Form Submit
async function handleSaveRecord(e) {
  e.preventDefault();
  
  const idInput = document.getElementById("crud-row-id").value;
  const isEdit = idInput !== "";
  const id = idInput;
  
  const payload = {};
  pageColumns.forEach((col, cIdx) => {
    const input = document.getElementById(`modal-col_${cIdx}`);
    if (input) payload[`col_${cIdx}`] = input.value.trim();
  });
  
  const url = isEdit
    ? `/api/super-admin/dynamic/${pageMeta.table_name}/${id}`
    : `/api/super-admin/dynamic/${pageMeta.table_name}`;
  const method = isEdit ? "PUT" : "POST";
  
  try {
    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    const result = await res.json();
    if (res.ok && (result.success || result.message)) {
      showToast("Record Saved", "Database row saved successfully.", "success");
      closeCrudModal();
      await fetchTableRows();
    } else {
      showToast("Save Failed", "Unable to save record to SQLite.", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("Network Error", "Could not connect to database server.", "danger");
  }
}

// 9. Delete Record
async function deleteRecord(id) {
  if (!confirm("Are you sure you want to permanently delete this record from SQLite database?")) return;
  
  try {
    const res = await fetch(`/api/super-admin/dynamic/${pageMeta.table_name}/${id}`, {
      method: "DELETE"
    });
    
    const result = await res.json();
    if (res.ok && (result.success || result.message)) {
      showToast("Record Deleted", "Row removed from SQLite table successfully.", "success");
      await fetchTableRows();
    } else {
      showToast("Delete Failed", "Unable to remove row.", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("Network Error", "Could not connect to database server.", "danger");
  }
}

// 10. Printable Invoice Receipt handlers
function openReceiptModal(id, rowIdx) {
  const row = filteredRows[rowIdx];
  if (!row) return;
  
  document.getElementById("receipt-id").innerText = `#${id}`;
  document.getElementById("receipt-date").innerText = new Date().toLocaleDateString();
  
  // col_0: Patient Name, col_1: Age, col_2: Billing Item, col_3: Amount, col_4: Payment Method
  document.getElementById("receipt-patient-name").innerText = row.col_0 || "N/A";
  document.getElementById("receipt-patient-age").innerText = (row.col_1 ? row.col_1 + " Years" : "N/A");
  document.getElementById("receipt-item-desc").innerText = row.col_2 || "Medical Consultation";
  document.getElementById("receipt-item-amount").innerText = "₹" + (row.col_3 || "0.00");
  document.getElementById("receipt-total").innerText = "₹" + (row.col_3 || "0.00");
  document.getElementById("receipt-method").innerText = row.col_4 || "Cash";
  
  // Dynamic branding fetch
  const sidebarBrandTitle = document.getElementById("sidebar-title");
  const softwareName = sidebarBrandTitle ? sidebarBrandTitle.innerText : "Arfa Nova Technology";
  document.getElementById("receipt-brand-name").innerText = softwareName;
  
  document.getElementById("receipt-modal").classList.add("active");
}

function closeReceiptModal() {
  document.getElementById("receipt-modal").classList.remove("active");
}

function printReceipt() {
  const printContent = document.getElementById("printable-receipt-content").innerHTML;
  
  const printWindow = window.open('', '', 'height=600,width=450');
  printWindow.document.write('<html><head><title>Print Invoice</title>');
  printWindow.document.write('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap">');
  printWindow.document.write('</head><body style="margin:20px; font-family:\'Plus Jakarta Sans\', sans-serif;">');
  printWindow.document.write(printContent);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}
