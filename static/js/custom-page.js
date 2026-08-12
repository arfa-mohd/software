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

    if (pageKey === 'pos_billing') {
      window.location.href = "/static/index.html#pos_billing";
      return;
    }
    
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

// ========================================================
//  POS BILLING SYSTEM FOR STANDALONE CUSTOM PAGE
// ========================================================
let posItems = [];
let posBillCounter = 1;

const POS_PRODUCT_CATALOG = {
  "Paracetamol 650mg (Dolo)": { hsn: "3004", rate: 35.00 },
  "Amoxicillin 500mg": { hsn: "3004", rate: 85.00 },
  "Metoprolol 25mg": { hsn: "3004", rate: 60.00 },
  "Atorvastatin 10mg": { hsn: "3004", rate: 110.00 },
  "Pantoprazole 40mg": { hsn: "3004", rate: 75.00 },
  "Doctor Consultation Fee": { hsn: "9993", rate: 500.00 },
  "ECG Diagnostics Test": { hsn: "9993", rate: 350.00 },
  "Complete Blood Count (CBC)": { hsn: "9993", rate: 450.00 },
  "Lipid Profile Test": { hsn: "9993", rate: 800.00 },
  "X-Ray Chest PA View": { hsn: "9993", rate: 600.00 }
};

function getFormattedPosDateTime() {
  const now = new Date();
  const days = ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = String(now.getDate()).padStart(2, '0');
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  let hours = now.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year},${hours}:${minutes} ${ampm}`;
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
          <div><strong>Payment Method:</strong> ${paymentMethod}</div>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product / Service</th>
              <th>HSN</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${posItems.map((it, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${it.name}</strong></td>
                <td>${it.hsn}</td>
                <td style="text-align: right;">₹${it.rate.toFixed(2)}</td>
                <td style="text-align: center;">${it.qty}</td>
                <td style="text-align: right;">₹${it.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="summary-box">
          <div class="summary-row total">
            <span>Total Amount:</span>
            <span>₹${totalAmount.toFixed(2)}</span>
          </div>
        </div>
        <button class="btn-print" onclick="window.print()">Print Invoice</button>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();

  posItems = [];
  posBillCounter++;
  document.getElementById("posCustomerName").value = "";
  document.getElementById("posCustomerMobile").value = "";
  document.getElementById("posCustomerAddress").value = "";
  document.getElementById("posGivenAmount").value = "0";
  document.getElementById("posBillNo").value = String(posBillCounter).padStart(5, '0');
  renderPosTable();
  calculatePosTotals();
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
