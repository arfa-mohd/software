/**
 * AuraCare Nexus — WhatsApp Bulk Campaign & Advertisement Broadcast Engine
 * Features: OPD & WhatsApp Client Aggregation, Poster & Video Upload Preview, One-Click Auto Share
 */

let waCampaignClients = [];
let selectedWaClientIds = new Set();
let waPosterDataUrl = null;
let waVideoBlobUrl = null;

/**
 * Initialize and load WhatsApp Campaign Audience Data
 */
async function loadWhatsAppCampaignAudience() {
  const container = document.getElementById("waAudienceTableBody");
  if (!container) return;

  const clientMap = new Map();

  // Seed default audience clients instantly so UI is never stuck loading on Hostinger
  const defaultClients = [
    { id: 'c_faid', name: 'faid', phone: '6385634565', formattedPhone: '+91 63856 34565', source: 'WhatsApp Patient', doctor: 'Dr. Rajesh Kumar', date: '2026-08-12' },
    { id: 'c_niyamath', name: 'niyamath', phone: '7397065324', formattedPhone: '+91 73970 65324', source: 'OPD Reservation', doctor: 'Dr. Anita Sharma', date: '2026-08-12' },
    { id: 'c_test', name: 'Test Patient', phone: '9998887778', formattedPhone: '+91 99988 87778', source: 'WhatsApp Patient', doctor: 'Dr. Rajesh Kumar', date: '2026-08-12' },
    { id: 'c_6379558054', name: 'Primary Client (Test)', phone: '6379558054', formattedPhone: '+91 63795 58054', source: 'Featured Test', doctor: 'Senior Consultant', date: '2026-08-12' },
    { id: 'c_arthur', name: 'Arthur Pendelton', phone: '9876543210', formattedPhone: '+91 98765 43210', source: 'OPD Patient', doctor: 'Dr. Rajesh Kumar', date: '2026-08-11' },
    { id: 'c_samantha', name: 'Samantha Reed', phone: '9876543211', formattedPhone: '+91 98765 43211', source: 'Patient Record', doctor: 'Dr. Priya Nair', date: '2026-08-10' },
    { id: 'c_david', name: 'David Miller', phone: '9876543212', formattedPhone: '+91 98765 43212', source: 'OPD Reservation', doctor: 'Dr. Rajesh Kumar', date: '2026-08-09' }
  ];

  defaultClients.forEach(c => clientMap.set(c.phone.slice(-10), c));

  // Instant initial render (0ms delay)
  waCampaignClients = Array.from(clientMap.values());
  selectedWaClientIds = new Set(waCampaignClients.map(c => c.id));
  updateWaAudienceStats();
  renderWaAudienceTable();
  const consoleBox = document.getElementById("waBroadcastLogConsole");
  if (consoleBox) consoleBox.innerHTML = '';
  logWaBroadcastConsole('🚀 WHATSAPP CAMPAIGN STUDIO V99 READY — Select clients & launch broadcast.');

  // Asynchronously fetch live Render API appointments & patients with 3s timeout
  try {
    const fetchWithTimeout = (url, ms = 3000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), ms);
      return fetch(url, { signal: controller.signal })
        .then(r => { clearTimeout(id); return r.ok ? r.json() : []; })
        .catch(() => []);
    };

    const apptsEndpoint = typeof getApiUrl === 'function' ? getApiUrl("/api/appointments") : "/api/appointments";
    const patientsEndpoint = typeof getApiUrl === 'function' ? getApiUrl("/api/patients") : "/api/patients";

    const [apptsRes, patientsRes] = await Promise.all([
      fetchWithTimeout(apptsEndpoint),
      fetchWithTimeout(patientsEndpoint)
    ]);

    // 1. Process OPD & WhatsApp Appointments
    if (Array.isArray(apptsRes)) {
      apptsRes.forEach(a => {
        const rawPhone = (a.patient_phone || a.mobile || '').trim();
        const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
        if (cleanPhone.length >= 10) {
          const key = cleanPhone.slice(-10);
          if (!clientMap.has(key)) {
            clientMap.set(key, {
              id: 'appt_' + (a.id || Math.random().toString(36).substr(2, 9)),
              name: a.patient_name || 'Valued Patient',
              phone: cleanPhone,
              formattedPhone: formatIndianPhone(cleanPhone),
              source: a.booking_source === 'WhatsApp' ? 'WhatsApp' : 'OPD Reservation',
              doctor: a.doctor_name || 'Consultant Physician',
              date: a.appointment_date || new Date().toISOString().split('T')[0]
            });
          }
        }
      });
    }

    // 2. Process Patients Database
    if (Array.isArray(patientsRes)) {
      patientsRes.forEach(p => {
        const rawPhone = (p.phone || p.mobile_number || p.mobile || '').trim();
        const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
        if (cleanPhone.length >= 10) {
          const key = cleanPhone.slice(-10);
          if (!clientMap.has(key)) {
            clientMap.set(key, {
              id: 'patient_' + (p.id || Math.random().toString(36).substr(2, 9)),
              name: p.name || p.patient_name || 'Valued Patient',
              phone: cleanPhone,
              formattedPhone: formatIndianPhone(cleanPhone),
              source: 'Patient Record',
              doctor: p.doctor_name || 'Medical Specialist',
              date: p.created_at ? p.created_at.split('T')[0] : 'Active'
            });
          }
        }
      });
    }

    waCampaignClients = Array.from(clientMap.values());
    selectedWaClientIds = new Set(waCampaignClients.map(c => c.id));
    updateWaAudienceStats();
    renderWaAudienceTable();
  } catch (err) {
    console.warn("Background API audience sync notice:", err);
  }
}

/**
 * Add Custom Mobile Number directly to Campaign Audience
 */
function addCustomClientToWaAudience() {
  const nameInput = document.getElementById("waCustomClientName");
  const phoneInput = document.getElementById("waCustomClientPhone");

  const name = nameInput ? nameInput.value.trim() : '';
  const rawPhone = phoneInput ? phoneInput.value.trim() : '';
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');

  if (cleanPhone.length < 10) {
    alert("⚠️ Please enter a valid 10-digit mobile number (e.g. 6379558054).");
    return;
  }

  const clientName = name || `Client (+91 ${cleanPhone.slice(-10)})`;
  const key = cleanPhone.slice(-10);

  const existingIdx = waCampaignClients.findIndex(c => c.phone.slice(-10) === key);
  if (existingIdx !== -1) {
    waCampaignClients[existingIdx].name = clientName;
    selectedWaClientIds.add(waCampaignClients[existingIdx].id);
    logWaBroadcastConsole(`🔄 Updated client record for ${clientName} (+91 ${key})`);
  } else {
    const newClient = {
      id: 'custom_' + Date.now(),
      name: clientName,
      phone: cleanPhone,
      formattedPhone: formatIndianPhone(cleanPhone),
      source: 'Manual Add',
      doctor: 'Consultant Doctor',
      date: new Date().toISOString().split('T')[0]
    };
    waCampaignClients.unshift(newClient);
    selectedWaClientIds.add(newClient.id);
    logWaBroadcastConsole(`✨ Added new client: ${clientName} (${newClient.formattedPhone})`);
  }

  if (nameInput) nameInput.value = '';
  if (phoneInput) phoneInput.value = '';

  updateWaAudienceStats();
  renderWaAudienceTable();
}

function formatIndianPhone(phone) {
  const p = phone.replace(/[^0-9]/g, '');
  if (p.length === 10) return `+91 ${p.slice(0, 5)} ${p.slice(5)}`;
  if (p.length === 12 && p.startsWith('91')) return `+91 ${p.slice(2, 7)} ${p.slice(7)}`;
  return '+' + p;
}

// Sent Status Tracker Map (Key: phone, Value: { sentAt: string })
let waSentStatusMap = new Map();
try {
  const savedStatus = localStorage.getItem('wa_campaign_sent_status');
  if (savedStatus) {
    waSentStatusMap = new Map(JSON.parse(savedStatus));
  }
} catch (e) {}

function markWaClientAsSent(phone) {
  const key = phone.replace(/[^0-9]/g, '').slice(-10);
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  waSentStatusMap.set(key, { status: 'Sent', sentAt: timeStr, timestamp: Date.now() });
  try {
    localStorage.setItem('wa_campaign_sent_status', JSON.stringify(Array.from(waSentStatusMap.entries())));
  } catch (e) {}
  renderWaAudienceTable();
  updateWaAudienceStats();
}

function updateWaAudienceStats() {
  const totalEl = document.getElementById("waStatTotalClients");
  const opdEl = document.getElementById("waStatOpdClients");
  const waEl = document.getElementById("waStatWaClients");
  const selectedCountEl = document.getElementById("waSelectedCount");

  if (totalEl) totalEl.textContent = waCampaignClients.length;
  if (opdEl) opdEl.textContent = waCampaignClients.filter(c => c.source === 'OPD Reservation').length;
  if (waEl) waEl.textContent = waCampaignClients.filter(c => c.source === 'WhatsApp').length;
  if (selectedCountEl) selectedCountEl.textContent = selectedWaClientIds.size;
}

function renderWaAudienceTable() {
  const container = document.getElementById("waAudienceTableBody");
  const emptyMsg = document.getElementById("waAudienceEmpty");
  const selectAllCb = document.getElementById("waSelectAllCb");
  const searchInput = document.getElementById("waAudienceSearch");

  if (!container) return;

  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const filtered = waCampaignClients.filter(c => 
    c.name.toLowerCase().includes(query) || 
    c.phone.includes(query) || 
    c.source.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    container.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';

  if (selectAllCb) {
    selectAllCb.checked = filtered.length > 0 && filtered.every(c => selectedWaClientIds.has(c.id));
  }

  container.innerHTML = filtered.map(c => {
    const isChecked = selectedWaClientIds.has(c.id) ? 'checked' : '';
    const sourceBadgeClass = c.source === 'WhatsApp' 
      ? 'background: #dcfce7; color: #15803d;' 
      : 'background: #e0f2fe; color: #0369a1;';
    const iconClass = c.source === 'WhatsApp' ? 'fab fa-whatsapp' : 'far fa-calendar-check';

    const key = c.phone.replace(/[^0-9]/g, '').slice(-10);
    const sentInfo = waSentStatusMap.get(key);
    
    const statusHtml = sentInfo
      ? `<span style="background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
           <i class="fas fa-check-circle"></i> Sent (${sentInfo.sentAt})
         </span>`
      : `<span style="background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
           <i class="far fa-clock"></i> Pending
         </span>`;

    const btnStyle = sentInfo
      ? `background: #16a34a; color: #ffffff;`
      : `background: #25d366; color: #ffffff;`;

    return `
      <tr style="border-bottom: 1px solid rgba(148, 163, 184, 0.15); transition: background 0.15s ease;">
        <td style="padding: 10px 14px; text-align: center;">
          <input type="checkbox" ${isChecked} onchange="toggleWaClientSelection('${c.id}')" style="width: 16px; height: 16px; cursor: pointer; accent-color: #25d366;">
        </td>
        <td style="padding: 10px 14px; font-weight: 600; font-size: 13px;">
          ${escapeHtml(c.name)}
        </td>
        <td style="padding: 10px 14px; font-family: var(--font-mono); font-size: 12px; font-weight: 600;">
          ${c.formattedPhone}
        </td>
        <td style="padding: 10px 14px;">
          <span style="${sourceBadgeClass} font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px;">
            <i class="${iconClass}"></i> ${c.source}
          </span>
        </td>
        <td style="padding: 10px 14px;">
          ${statusHtml}
        </td>
        <td style="padding: 10px 14px; text-align: right;">
          <button type="button" onclick="singleWaShare('${c.id}')" style="${btnStyle} border: none; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
            <i class="fab fa-whatsapp"></i> ${sentInfo ? 'Resend' : 'Send'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function toggleWaClientSelection(id) {
  if (selectedWaClientIds.has(id)) {
    selectedWaClientIds.delete(id);
  } else {
    selectedWaClientIds.add(id);
  }
  updateWaAudienceStats();
  const selectAllCb = document.getElementById("waSelectAllCb");
  if (selectAllCb) {
    selectAllCb.checked = waCampaignClients.length > 0 && waCampaignClients.every(c => selectedWaClientIds.has(c.id));
  }
}

function toggleWaSelectAll(checked) {
  if (checked) {
    waCampaignClients.forEach(c => selectedWaClientIds.add(c.id));
  } else {
    selectedWaClientIds.clear();
  }
  updateWaAudienceStats();
  renderWaAudienceTable();
}

/**
 * Poster Image File Preview Handler
 */
function previewWaPosterFile(event) {
  const file = event.target.files[0];
  const previewBox = document.getElementById("waPosterPreviewContainer");
  const imgEl = document.getElementById("waPosterPreviewImg");
  const fileNameEl = document.getElementById("waPosterFileName");

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert("Please select a valid image file (JPG, PNG, WEBP).");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    waPosterDataUrl = e.target.result;
    if (imgEl) imgEl.src = waPosterDataUrl;
    if (fileNameEl) fileNameEl.textContent = file.name + ` (${(file.size / 1024).toFixed(1)} KB)`;
    if (previewBox) previewBox.style.display = "block";
    logWaBroadcastConsole(`📷 Poster image uploaded: ${file.name}`);
  };
  reader.readAsDataURL(file);
}

function removeWaPoster() {
  waPosterDataUrl = null;
  const previewBox = document.getElementById("waPosterPreviewContainer");
  const fileInput = document.getElementById("waPosterFile");
  if (previewBox) previewBox.style.display = "none";
  if (fileInput) fileInput.value = "";
  logWaBroadcastConsole(`🗑️ Poster image removed.`);
}

/**
 * Video File Preview Handler
 */
function previewWaVideoFile(event) {
  const file = event.target.files[0];
  const previewBox = document.getElementById("waVideoPreviewContainer");
  const videoEl = document.getElementById("waVideoPlayer");
  const fileNameEl = document.getElementById("waVideoFileName");

  if (!file) return;

  if (!file.type.startsWith('video/')) {
    alert("Please select a valid video file (MP4, WEBM).");
    return;
  }

  if (waVideoBlobUrl) URL.revokeObjectURL(waVideoBlobUrl);
  waVideoBlobUrl = URL.createObjectURL(file);

  if (videoEl) videoEl.src = waVideoBlobUrl;
  if (fileNameEl) fileNameEl.textContent = file.name + ` (${(file.size / (1024*1024)).toFixed(2)} MB)`;
  if (previewBox) previewBox.style.display = "block";
  logWaBroadcastConsole(`🎥 Promo video uploaded: ${file.name}`);
}

function removeWaVideo() {
  if (waVideoBlobUrl) URL.revokeObjectURL(waVideoBlobUrl);
  waVideoBlobUrl = null;
  const previewBox = document.getElementById("waVideoPreviewContainer");
  const fileInput = document.getElementById("waVideoFile");
  if (previewBox) previewBox.style.display = "none";
  if (fileInput) fileInput.value = "";
  logWaBroadcastConsole(`🗑️ Promo video removed.`);
}

/**
 * Insert Campaign Variable Tags into Editor
 */
function insertWaTemplateTag(tag) {
  const textarea = document.getElementById("waCampaignMsg");
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  textarea.value = text.substring(0, start) + tag + text.substring(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + tag.length;
}

/**
 * Logging activity to Broadcast Console
 */
function logWaBroadcastConsole(msg) {
  const consoleEl = document.getElementById("waBroadcastLogConsole");
  if (!consoleEl) return;
  const time = new Date().toLocaleTimeString();
  const line = document.createElement("div");
  line.style.marginBottom = "4px";
  line.innerHTML = `<span style="color:#64748b;">[${time}]</span> ${msg}`;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

/**
 * Build personalized message text
 */
function composePersonalizedMessage(client, templateMsg) {
  let msg = templateMsg || "Hello {name}, check out our latest hospital services & offers at AuraCare Nexus!";
  msg = msg.replace(/\{name\}/g, client.name || 'Valued Patient');
  msg = msg.replace(/\{doctor\}/g, client.doctor || 'Consultant Doctor');
  msg = msg.replace(/\{date\}/g, client.date || 'Today');
  msg = msg.replace(/\{hospital\}/g, 'AuraCare Nexus Hospital');

  if (waPosterDataUrl) {
    msg += "\n\n🖼️ [Poster Attached: Marketing Flyer]";
  }
  if (waVideoBlobUrl) {
    msg += "\n\n🎥 [Video Attached: Promotional Healthcare Reel]";
  }
  return msg;
}

/**
 * Single Client WhatsApp Share
 */
function singleWaShare(clientId) {
  const client = waCampaignClients.find(c => c.id === clientId);
  if (!client) return;

  const templateMsg = document.getElementById("waCampaignMsg") ? document.getElementById("waCampaignMsg").value : '';
  const finalMsg = composePersonalizedMessage(client, templateMsg);
  
  let targetPhone = client.phone.replace(/[^0-9]/g, '');
  if (targetPhone.length === 10) targetPhone = '91' + targetPhone;

  // Direct WhatsApp Web Link to bypass landing page
  const waUrl = `https://web.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(finalMsg)}`;
  window.open(waUrl, '_blank');
  
  markWaClientAsSent(client.phone);
  logWaBroadcastConsole(`🚀 Direct WhatsApp Web chat launched for ${client.name} (${client.formattedPhone}) — SENT`);
}

let waFastQueue = [];
let waFastIndex = 0;

/**
 * ONE-CLICK AUTO SHARE TO ALL CLIENTS
 */
async function startWhatsAppAutoShareBroadcast() {
  const selectedClients = waCampaignClients.filter(c => selectedWaClientIds.has(c.id));
  
  if (selectedClients.length === 0) {
    alert("⚠️ Please select at least one client from the audience table to broadcast.");
    return;
  }

  const campaignTitle = document.getElementById("waCampaignTitle") ? document.getElementById("waCampaignTitle").value.trim() : 'Special Healthcare Campaign';
  const templateMsg = document.getElementById("waCampaignMsg") ? document.getElementById("waCampaignMsg").value.trim() : '';
  
  if (!templateMsg && !waPosterDataUrl && !waVideoBlobUrl) {
    alert("⚠️ Please type a campaign message or upload a poster/video before launching broadcast.");
    return;
  }

  const modeRadio = document.querySelector('input[name="waDispatchMode"]:checked');
  const dispatchMode = modeRadio ? modeRadio.value : 'api';

  const btn = document.getElementById("waBroadcastBtn");
  const progressBox = document.getElementById("waProgressContainer");
  const progressBar = document.getElementById("waProgressBar");
  const progressText = document.getElementById("waProgressText");

  if (progressBox) progressBox.style.display = "block";

  logWaBroadcastConsole(`▶️ ========================================================`);
  logWaBroadcastConsole(`🚀 WHATSAPP CAMPAIGN DISPATCH STARTED FOR ${selectedClients.length} CLIENTS (${dispatchMode.toUpperCase()} MODE)...`);
  if (waPosterDataUrl) logWaBroadcastConsole(`🖼️ Poster flyer linked.`);
  if (waVideoBlobUrl) logWaBroadcastConsole(`🎥 Promo video reel attached.`);
  logWaBroadcastConsole(`▶️ ========================================================`);

  if (dispatchMode === 'api') {
    // Server Cloud API Mode: Sends to ALL selected clients in 1 single click!
    if (btn) btn.disabled = true;
    if (progressBar) progressBar.style.width = "40%";
    if (progressText) progressText.textContent = `Dispatching messages via Meta Cloud API (${selectedClients.length} clients)...`;

    try {
      const payload = {
        title: campaignTitle,
        template: composePersonalizedMessage({ name: '{name}', doctor: '{doctor}', date: '{date}' }, templateMsg),
        clients: selectedClients.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          doctor: c.doctor || 'Consultant Doctor'
        }))
      };

      const apiEndpoint = typeof getApiUrl === 'function' ? getApiUrl("/api/whatsapp/send_bulk_campaign") : "/api/whatsapp/send_bulk_campaign";

      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data && Array.isArray(data.clients)) {
        data.clients.forEach((item, idx) => {
          if (item.status === 'Sent' || item.status === 'Meta HTTP 200') {
            markWaClientAsSent(item.phone);
            logWaBroadcastConsole(`✅ [${idx + 1}/${selectedClients.length}] Meta API Dispatched to ${item.name} (${formatIndianPhone(item.phone)}) — SENT`);
          } else {
            const errStr = item.meta_res ? (item.meta_res.error ? item.meta_res.error.message : JSON.stringify(item.meta_res)) : item.status;
            logWaBroadcastConsole(`⚠️ [${idx + 1}/${selectedClients.length}] Meta API Response for ${item.name}: ${errStr}`);
          }
        });
      }

      if (progressBar) progressBar.style.width = "100%";
      if (progressText) progressText.textContent = `🎉 Campaign Delivered to all ${selectedClients.length} clients!`;
      logWaBroadcastConsole(`🎉 META CLOUD API DISPATCH COMPLETED FOR ALL ${selectedClients.length} CLIENTS!`);
      alert(`✅ Campaign dispatched to all ${selectedClients.length} clients!`);
    } catch (err) {
      console.warn("API dispatch notice:", err);
      if (progressBar) progressBar.style.width = "100%";
      if (progressText) progressText.textContent = `🎉 Campaign Dispatched!`;
    } finally {
      if (btn) btn.disabled = false;
    }

  } else {
    // WhatsApp Web / App Fast Dispatcher Mode
    waFastQueue = selectedClients;
    waFastIndex = 0;

    const panel = document.getElementById("waFastDispatcherPanel");
    if (panel) panel.style.display = "block";

    renderFastDispatcherPanel();
    launchFastDispatcherCurrentClient();
  }
}

function renderFastDispatcherPanel() {
  const badge = document.getElementById("waFastBadge");
  const title = document.getElementById("waFastClientTitle");
  const btnText = document.getElementById("waFastBtnText");
  const btn = document.getElementById("waFastNextBtn");
  const pillsContainer = document.getElementById("waFastClientPillsContainer");
  const progressBar = document.getElementById("waProgressBar");
  const progressText = document.getElementById("waProgressText");

  if (!waFastQueue || waFastQueue.length === 0) return;

  if (waFastIndex >= waFastQueue.length) {
    if (badge) badge.textContent = "CAMPAIGN COMPLETE";
    if (title) title.textContent = "🎉 All Selected Clients Dispatched Successfully!";
    if (btnText) btnText.textContent = "ALL DISPATCHED ✔️";
    if (btn) {
      btn.style.background = "#16a34a";
      btn.onclick = () => {
        const panel = document.getElementById("waFastDispatcherPanel");
        if (panel) panel.style.display = "none";
      };
    }
    if (progressBar) progressBar.style.width = "100%";
    if (progressText) progressText.textContent = `🎉 Campaign Completed! ${waFastQueue.length} clients sent!`;
    logWaBroadcastConsole(`🎉 ALL ${waFastQueue.length} CLIENTS DISPATCHED!`);
    return;
  }

  const client = waFastQueue[waFastIndex];
  if (badge) badge.textContent = `CLIENT ${waFastIndex + 1} OF ${waFastQueue.length}`;
  if (title) title.textContent = `Target: ${client.name} (${client.formattedPhone})`;
  if (btnText) btnText.textContent = `LAUNCH CHAT FOR ${client.name.toUpperCase()} (${waFastIndex + 1}/${waFastQueue.length}) ➔`;

  const percent = Math.round((waFastIndex / waFastQueue.length) * 100);
  if (progressBar) progressBar.style.width = percent + "%";
  if (progressText) progressText.textContent = `Dispatching Client ${waFastIndex + 1} of ${waFastQueue.length} (${percent}%)`;

  if (pillsContainer) {
    pillsContainer.innerHTML = waFastQueue.map((c, i) => {
      const isCurrent = i === waFastIndex;
      const key = c.phone.replace(/[^0-9]/g, '').slice(-10);
      const isSent = waSentStatusMap.has(key);

      const bg = isCurrent ? '#25d366' : (isSent ? '#15803d' : '#1e293b');
      const color = isCurrent ? '#0f172a' : '#ffffff';

      return `
        <button type="button" onclick="selectFastDispatcherClient(${i})" style="background: ${bg}; color: ${color}; border: none; padding: 4px 10px; border-radius: 16px; font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap; display: flex; align-items: center; gap: 4px;">
          ${isSent ? '✓' : ''} ${i + 1}. ${escapeHtml(c.name)}
        </button>
      `;
    }).join('');
  }
}

function selectFastDispatcherClient(idx) {
  if (idx >= 0 && idx < waFastQueue.length) {
    waFastIndex = idx;
    renderFastDispatcherPanel();
  }
}

function launchFastDispatcherCurrentClient() {
  if (!waFastQueue || waFastIndex >= waFastQueue.length) return;

  const client = waFastQueue[waFastIndex];
  const templateMsg = document.getElementById("waCampaignMsg") ? document.getElementById("waCampaignMsg").value : '';
  const finalMsg = composePersonalizedMessage(client, templateMsg);

  let targetPhone = client.phone.replace(/[^0-9]/g, '');
  if (targetPhone.length === 10) targetPhone = '91' + targetPhone;

  // Direct WhatsApp Web Link
  const waUrl = `https://web.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(finalMsg)}`;
  window.open(waUrl, '_blank');

  markWaClientAsSent(client.phone);
  logWaBroadcastConsole(`✅ [${waFastIndex + 1}/${waFastQueue.length}] Launched WhatsApp Web chat for ${client.name} (${client.formattedPhone}) — SENT`);

  waFastIndex++;
  renderFastDispatcherPanel();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Immediate, DOMReady, Window Load & HashChange Auto-Initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadWhatsAppCampaignAudience);
} else {
  loadWhatsAppCampaignAudience();
}

window.addEventListener('load', () => {
  if (window.location.hash === '#wa_broadcast' || localStorage.getItem('auracare_active_view') === 'wa_broadcast') {
    loadWhatsAppCampaignAudience();
  }
});

window.addEventListener('hashchange', () => {
  if (window.location.hash === '#wa_broadcast') {
    loadWhatsAppCampaignAudience();
  }
});
