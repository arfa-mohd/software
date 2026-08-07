// ========================================================
//  Arfa Nova Technology — Super Admin controller logic
// ========================================================

// Dynamic Render Backend API Resolver for Hostinger Deployment
(function() {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const RENDER_URL = "https://software-1-4vsx.onrender.com";
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      if (typeof url === 'string' && url.startsWith('/api')) {
        url = RENDER_URL + url;
      }
      return originalFetch(url, options);
    };
  }
})();

let pagesCache = [];
let selectedExplorerPageKey = "";
let explorerRowsCache = [];

// DOM Content Loaded Init
document.addEventListener("DOMContentLoaded", () => {
  loadAdminPages();
  loadSystemSettings();
});

// 1. Fetch & Render Pages / Modules
async function loadAdminPages() {
  const container = document.getElementById("modules-list");
  const dbSelector = document.getElementById("db-explorer-selector");
  if (!container && !dbSelector) return;

  try {
    const res = await fetch("/api/super-admin/pages");
    pagesCache = await res.json();
    
    // Render list if container exists
    if (container) {
      renderModulesList(pagesCache);
    }
    
    // Populate DB Explorer selector with Custom modules only if dropdown exists
    if (dbSelector) {
      const customPages = pagesCache.filter(p => p.is_custom === 1);
      
      let dbOptions = `<option value="">Select custom module...</option>`;
      customPages.forEach(p => {
        dbOptions += `<option value="${p.key}">${p.title} (${p.table_name})</option>`;
      });
      dbSelector.innerHTML = dbOptions;
      if (selectedExplorerPageKey) {
        dbSelector.value = selectedExplorerPageKey;
        loadExplorerTable(selectedExplorerPageKey);
      }
    }
  } catch (err) {
    console.error("Failed to load admin pages", err);
    if (container) {
      container.innerHTML = `
        <div style="text-align:center; padding:30px; color:#ef4444;">
          <i class="fas fa-exclamation-triangle" style="font-size:24px; margin-bottom:8px; display:block;"></i>
          Error connecting to administration server.
        </div>
      `;
    }
  }
}

function renderModulesList(pages) {
  const container = document.getElementById("modules-list");
  if (!container) return;

  if (pages.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#64748b;">No modules active.</div>`;
    return;
  }

  container.innerHTML = pages.map(page => {
    const isChecked = page.is_visible === 1 ? "checked" : "";
    const isCustom = page.is_custom === 1;
    
    return `
      <div class="page-list-item">
        <div class="page-info">
          <div class="page-icon-wrapper">
            <i class="${page.icon}"></i>
          </div>
          <div>
            <div class="page-title-text" style="display:flex; align-items:center; gap:8px;">
              ${page.title}
              ${isCustom ? `<span class="badge-custom" style="background:rgba(0,212,170,0.1); color:#00d4aa; font-size:10px;">Custom</span>` : ""}
            </div>
            <div class="page-subtitle-text">${page.subtitle}</div>
          </div>
        </div>
        
        <div style="display:flex; align-items:center; gap:16px;">
          <!-- Visibility Switch -->
          <div class="switch-wrap">
            <label class="toggle-switch">
              <input type="checkbox" ${isChecked} onchange="toggleModuleVisibility('${page.key}', this.checked)">
              <span class="slider"></span>
            </label>
          </div>
          
          <!-- Actions -->
          <div style="display:flex; gap:4px;">
            <button class="btn-action" title="Rename Module" onclick="openRenameModal('${page.key}', '${page.title}', ${page.is_visible})">
              <i class="fas fa-edit"></i>
            </button>
            ${isCustom ? `
              <button class="btn-action btn-danger-hover" title="Delete Module" onclick="handleDeleteModule('${page.key}')">
                <i class="fas fa-trash-alt"></i>
              </button>
            ` : ""}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 2. Toggle module visibility
async function toggleModuleVisibility(key, isVisible) {
  const page = pagesCache.find(p => p.key === key);
  if (!page) return;

  const payload = {
    title: page.title,
    is_visible: isVisible ? 1 : 0
  };

  try {
    const res = await fetch(`/api/super-admin/pages/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast("Module Visibility Saved", `Module '${page.title}' is now ${isVisible ? 'Visible' : 'Hidden'} in hospital portal.`, "success");
      loadAdminPages();
    } else {
      showToast("Error", "Failed to toggle module visibility.", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("Network Error", "Unable to contact API server.", "danger");
  }
}

// 3. Rename Modal
function openRenameModal(key, currentTitle, isVisible) {
  document.getElementById("edit-module-key").value = key;
  document.getElementById("edit-module-title").value = currentTitle;
  document.getElementById("edit-module-visibility").value = isVisible;
  document.getElementById("edit-module-modal").classList.add("active");
}

function closeEditModal() {
  document.getElementById("edit-module-modal").classList.remove("active");
}

async function handleSaveRename(e) {
  e.preventDefault();
  const key = document.getElementById("edit-module-key").value;
  const newTitle = document.getElementById("edit-module-title").value.strip ? document.getElementById("edit-module-title").value.trim() : document.getElementById("edit-module-title").value;
  const visibility = parseInt(document.getElementById("edit-module-visibility").value) || 0;

  if (!newTitle) return;

  try {
    const res = await fetch(`/api/super-admin/pages/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle,
        is_visible: visibility
      })
    });
    const result = await res.json();
    if (result.success) {
      showToast("Module Renamed", `Nav label updated to '${newTitle}' successfully.`, "success");
      closeEditModal();
      loadAdminPages();
    } else {
      showToast("Error", "Failed to update module name.", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("Network Error", "Could not submit rename request.", "danger");
  }
}

// 4. Delete Custom Module
async function handleDeleteModule(key) {
  if (!confirm(`Are you sure you want to permanently delete custom module '${key}'? This will DROP the database table and erase all its records!`)) {
    return;
  }

  try {
    const res = await fetch(`/api/super-admin/pages/${key}`, {
      method: "DELETE"
    });
    const result = await res.json();
    if (result.success) {
      showToast("Module Deleted", "Module deleted and table dropped successfully.", "success");
      if (selectedExplorerPageKey === key) {
        selectedExplorerPageKey = "";
        document.getElementById("explorer-view-area").innerHTML = `
          <div style="text-align:center; padding:80px 20px; color:#64748b;">
            <i class="fas fa-search-plus" style="font-size:36px; margin-bottom:12px; display:block; color:rgba(255,255,255,0.1);"></i>
            Select a custom module from the dropdown to browse records and perform CRUD entries.
          </div>
        `;
      }
      loadAdminPages();
    } else {
      showToast("Error", "Failed to delete custom module.", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("Network Error", "Could not submit delete request.", "danger");
  }
}

// 5. Dynamic Columns Builder (HTML side inputs)
function addColumnField() {
  const container = document.getElementById("columns-builder-container");
  const count = container.querySelectorAll(".col-builder-item").length + 1;
  
  const div = document.createElement("div");
  div.className = "col-builder-item";
  div.innerHTML = `
    <input type="text" class="form-control dyn-col-input" placeholder="Field ${count} (e.g. Serial Number)" style="flex:1;" required>
    <span style="font-size:11px; color:#64748b; font-family:var(--font-mono); font-weight:700;">TEXT</span>
    <button type="button" class="btn-action btn-danger-hover" onclick="removeColumnField(this)"><i class="fas fa-trash-alt"></i></button>
  `;
  container.appendChild(div);
}

function removeColumnField(btn) {
  const container = document.getElementById("columns-builder-container");
  if (container.querySelectorAll(".col-builder-item").length <= 1) {
    showToast("Validation Error", "A custom database table must contain at least 1 column field.", "warning");
    return;
  }
  btn.closest(".col-builder-item").remove();
}

// 6. Create Custom Module Submit
async function handleCreateModule(e) {
  e.preventDefault();
  
  const title = document.getElementById("new-module-title").value.trim();
  const slugRaw = document.getElementById("new-module-key").value.trim().toLowerCase();
  const subtitle = document.getElementById("new-module-subtitle").value.trim();
  const icon = document.getElementById("new-module-icon").value;

  // Clean key slug
  const key = slugRaw.replace(/[^a-z0-9_]/g, '_');
  
  const colInputs = document.querySelectorAll(".dyn-col-input");
  const columns = [];
  colInputs.forEach(inp => {
    const val = inp.value.trim();
    if (val) columns.push(val);
  });

  if (!title || !key || !subtitle || columns.length === 0) {
    showToast("Missing Fields", "Please populate all page creation fields.", "warning");
    return;
  }

  const payload = { key, title, subtitle, icon, columns };

  try {
    const res = await fetch("/api/super-admin/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast("Module Created 🎉", `Module '${title}' and SQLite table 'dyn_${key}' created successfully!`, "success");
      
      // Reset builder form
      document.getElementById("create-module-form").reset();
      const container = document.getElementById("columns-builder-container");
      container.innerHTML = `
        <div class="col-builder-item">
          <input type="text" class="form-control dyn-col-input" placeholder="Field 1 (e.g. Researcher)" style="flex:1;" required>
          <span style="font-size:11px; color:#64748b; font-family:var(--font-mono); font-weight:700;">TEXT</span>
          <button type="button" class="btn-action btn-danger-hover" onclick="removeColumnField(this)"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
      
      // Reload pages config
      selectedExplorerPageKey = key;
      loadAdminPages();
    } else {
      showToast("Error", result.detail || "Failed to create custom module.", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("Network Error", "Failed to connect to backend api.", "danger");
  }
}

// 7. Database Explorer Logic
async function loadExplorerTable(key) {
  selectedExplorerPageKey = key;
  const area = document.getElementById("explorer-view-area");
  if (!key) {
    area.innerHTML = `
      <div style="text-align:center; padding:80px 20px; color:#64748b;">
        <i class="fas fa-search-plus" style="font-size:36px; margin-bottom:12px; display:block; color:rgba(255,255,255,0.1);"></i>
        Select a custom module from the dropdown to browse records and perform CRUD entries.
      </div>
    `;
    return;
  }

  const page = pagesCache.find(p => p.key === key);
  if (!page) return;

  const columns = JSON.parse(page.columns_json);

  area.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <h3 style="color:#ffffff; font-size:14px; font-weight:700; margin:0;"><i class="fas fa-table" style="color:#00d4aa; margin-right:6px;"></i> SQLite Table: <code>${page.table_name}</code></h3>
      <button class="btn btn-sm btn-primary" onclick="openExplorerAddModal()" style="font-size:11px; height:32px; padding: 0 12px; border-radius:6px;">
        <i class="fas fa-plus"></i> Add Row
      </button>
    </div>

    <!-- Explorer Grid Table -->
    <div style="overflow-x:auto; background:rgba(0,0,0,0.2); border-radius:10px; border:1px solid rgba(255,255,255,0.05); max-height:400px; overflow-y:auto;">
      <table class="custom-table" style="margin:0;">
        <thead>
          <tr>
            <th style="background:none;">ID</th>
            ${columns.map(c => `<th style="background:none;">${c}</th>`).join('')}
            <th style="text-align:right; background:none;">Actions</th>
          </tr>
        </thead>
        <tbody id="explorer-tbody">
          <tr>
            <td colspan="${columns.length + 2}" style="text-align:center; padding:24px; color:#64748b;">
              <i class="fas fa-spinner fa-spin" style="font-size:18px; margin-bottom:6px; display:block; color:#00d4aa;"></i>
              Loading SQLite rows...
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Data Row Creation Modal -->
    <div class="modal-overlay" id="explorer-row-modal">
      <div class="modal-box">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h3 style="color:#ffffff; margin:0;" id="explorer-row-modal-title">Insert Table Row</h3>
          <button onclick="closeExplorerRowModal()" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:18px;">&times;</button>
        </div>
        <form id="explorer-row-form" onsubmit="submitExplorerForm(event)">
          <input type="hidden" id="explorer-input-id">
          ${columns.map((col, idx) => `
            <div class="form-group" style="margin-bottom:14px;">
              <label>${col}</label>
              <input type="text" id="exp-col_${idx}" class="form-control" style="width:100%; box-sizing:border-box;" required>
            </div>
          `).join('')}
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
            <button type="button" class="btn btn-secondary" onclick="closeExplorerRowModal()">Cancel</button>
            <button type="submit" class="btn btn-primary"><i class="fas fa-check"></i> Save Data</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Fetch actual rows
  fetchExplorerRows(page.table_name);
}

async function fetchExplorerRows(tableName) {
  const tbody = document.getElementById("explorer-tbody");
  if (!tbody) return;

  try {
    const res = await fetch(`/api/super-admin/dynamic/${tableName}`);
    explorerRowsCache = await res.json();
    
    const page = pagesCache.find(p => p.key === selectedExplorerPageKey);
    const columns = JSON.parse(page.columns_json);

    if (explorerRowsCache.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${columns.length + 2}" style="text-align:center; padding:30px; color:#64748b;">
            Table empty. No rows found in SQLite database.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = explorerRowsCache.map((row, rIdx) => `
      <tr>
        <td><strong>#${row.id}</strong></td>
        ${columns.map((c, cIdx) => `<td>${row[`col_${cIdx}`] || ''}</td>`).join('')}
        <td style="text-align:right;">
          <button class="btn-action" title="Edit Row" onclick="openExplorerEditModal(${row.id}, ${rIdx})">
            <i class="fas fa-edit" style="font-size:12px;"></i>
          </button>
          <button class="btn-action btn-danger-hover" title="Delete Row" onclick="deleteExplorerRow(${row.id})">
            <i class="fas fa-trash-alt" style="font-size:12px;"></i>
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `
      <tr>
        <td colspan="100" style="text-align:center; color:#ef4444; padding:20px;">
          Failed to fetch SQLite records.
        </td>
      </tr>
    `;
  }
}

// Explorer Modal Handlers
function openExplorerAddModal() {
  const modal = document.getElementById("explorer-row-modal");
  const form = document.getElementById("explorer-row-form");
  const title = document.getElementById("explorer-row-modal-title");
  const idInput = document.getElementById("explorer-input-id");

  if (modal && form) {
    idInput.value = "";
    form.reset();
    if (title) title.innerText = "Insert Table Row";
    modal.classList.add("active");
  }
}

function openExplorerEditModal(id, rowIdx) {
  const modal = document.getElementById("explorer-row-modal");
  const title = document.getElementById("explorer-row-modal-title");
  const idInput = document.getElementById("explorer-input-id");
  const page = pagesCache.find(p => p.key === selectedExplorerPageKey);
  const row = explorerRowsCache[rowIdx];

  if (modal && page && row) {
    idInput.value = id;
    const columns = JSON.parse(page.columns_json);
    columns.forEach((col, cIdx) => {
      const input = document.getElementById(`exp-col_${cIdx}`);
      if (input) input.value = row[`col_${cIdx}`] || "";
    });
    if (title) title.innerText = "Modify Table Row #" + id;
    modal.classList.add("active");
  }
}

function closeExplorerRowModal() {
  const modal = document.getElementById("explorer-row-modal");
  if (modal) modal.classList.remove("active");
}

async function submitExplorerForm(e) {
  e.preventDefault();
  const page = pagesCache.find(p => p.key === selectedExplorerPageKey);
  if (!page) return;

  const idInput = document.getElementById("explorer-input-id");
  const isEdit = idInput.value !== "";
  const id = idInput.value;

  const columns = JSON.parse(page.columns_json);
  const payload = {};
  columns.forEach((col, cIdx) => {
    const input = document.getElementById(`exp-col_${cIdx}`);
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
      showToast("Data Saved", "Row updated in SQLite database successfully.", "success");
      closeExplorerRowModal();
      fetchExplorerRows(page.table_name);
    } else {
      showToast("Error", "Failed to save SQLite row.", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("Network Error", "Could not save database row.", "danger");
  }
}

async function deleteExplorerRow(id) {
  const page = pagesCache.find(p => p.key === selectedExplorerPageKey);
  if (!page) return;

  if (!confirm("Are you sure you want to delete this row from SQLite table?")) return;

  try {
    const res = await fetch(`/api/super-admin/dynamic/${page.table_name}/${id}`, {
      method: "DELETE"
    });
    const result = await res.json();
    if (result.success || result.message) {
      showToast("Row Deleted", "Row removed from SQLite table successfully.", "success");
      fetchExplorerRows(page.table_name);
    } else {
      showToast("Error", "Failed to delete row.", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("Network Error", "Could not delete database row.", "danger");
  }
}

// 8. White-Label Branding Handlers
async function loadSystemSettings() {
  try {
    const res = await fetch("/api/super-admin/settings");
    const settings = await res.json();
    
    // Fill text inputs if they exist
    const softwareNameInput = document.getElementById("brand-software-name");
    const softwareSubtitleInput = document.getElementById("brand-software-subtitle");
    const logoUrlInput = document.getElementById("brand-logo-url");
    
    if (softwareNameInput) softwareNameInput.value = settings.software_name || "";
    if (softwareSubtitleInput) softwareSubtitleInput.value = settings.software_subtitle || "";
    if (logoUrlInput) logoUrlInput.value = settings.software_logo || "";
    
    // Update dashboard header branding elements dynamically
    const headerLogo = document.getElementById("header-brand-logo");
    const headerName = document.getElementById("header-brand-name");
    const headerSubtitle = document.getElementById("header-brand-subtitle");
    
    if (headerLogo) headerLogo.src = settings.software_logo || "/static/logo.jpg";
    if (headerName) headerName.innerText = settings.software_name || "Arfa Nova Technology";
    if (headerSubtitle) headerSubtitle.innerText = settings.software_subtitle || "Super Admin Master Control Console";
    
    // Update sidebar brand elements
    const sidebarLogo = document.getElementById("sidebar-brand-logo");
    const sidebarName = document.getElementById("sidebar-brand-name");
    const profileAvatar = document.getElementById("profile-avatar");
    
    if (sidebarLogo) sidebarLogo.src = settings.software_logo || "/static/logo.jpg";
    if (sidebarName) sidebarName.innerText = settings.software_name || "Arfa Nova";
    if (profileAvatar) profileAvatar.src = settings.software_logo || "/static/logo.jpg";
    
  } catch (err) {
    console.error("Failed to load white-label branding settings", err);
  }
}

async function handleLogoUpload(input) {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  
  const textSpan = document.getElementById("file-upload-text");
  if (textSpan) textSpan.innerText = file.name;
  
  const formData = new FormData();
  formData.append("file", file);
  
  try {
    const res = await fetch("/api/super-admin/settings/logo", {
      method: "POST",
      body: formData
    });
    
    const result = await res.json();
    if (res.ok && result.success) {
      document.getElementById("brand-logo-url").value = result.logo_url;
      const headerLogo = document.getElementById("header-brand-logo");
      if (headerLogo) headerLogo.src = result.logo_url;
      showToast("Logo Uploaded", "Custom logo image saved and applied successfully.", "success");
    } else {
      showToast("Upload Failed", result.detail || "Unable to upload image file.", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("Upload Error", "Network failure while uploading image.", "danger");
  }
}

async function handleSaveBranding(e) {
  e.preventDefault();
  
  const name = document.getElementById("brand-software-name").value.trim();
  const subtitle = document.getElementById("brand-software-subtitle").value.trim();
  const logo = document.getElementById("brand-logo-url").value.trim();
  
  if (!name || !subtitle) {
    showToast("Validation Error", "Software Name and Tagline are required.", "warning");
    return;
  }
  
  try {
    const res = await fetch("/api/super-admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        software_name: name,
        software_subtitle: subtitle,
        software_logo: logo
      })
    });
    
    const result = await res.json();
    if (res.ok && result.success) {
      showToast("Branding Saved", "Branding settings saved. Refreshing layout...", "success");
      loadSystemSettings();
    } else {
      showToast("Save Failed", "Failed to update branding settings.", "warning");
    }
  } catch (err) {
    console.error(err);
    showToast("Network Error", "Could not submit branding settings.", "danger");
  }
}
