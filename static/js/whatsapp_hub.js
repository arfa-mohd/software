// WhatsApp AI Messages Hub Logic

let waHubRefreshTimer = null;
let waHubAllChats = [];
let waHubActivePhone = null;
let waHubSearchQuery = "";

async function loadWhatsAppHubData() {
  if (waHubRefreshTimer) clearInterval(waHubRefreshTimer);
  await fetchHubContacts();
  waHubRefreshTimer = setInterval(async () => {
    await fetchHubContacts(true); // silent refresh
  }, 5000);
}

async function fetchHubContacts(silent = false) {
  try {
    const res = await fetch("/api/whatsapp/chats");
    waHubAllChats = await res.json();
    
    if (waHubAllChats && waHubAllChats.length > 0) {
      if (!waHubActivePhone) waHubActivePhone = waHubAllChats[0].phone_number;
    }
    
    updateHubKpis();
    renderHubContacts();
    await fetchHubMessages();
  } catch (err) {
    console.error("Failed to load WA Hub Contacts", err);
  }
}

async function fetchHubMessages() {
  if (!waHubActivePhone) return;
  try {
    const res = await fetch(`/api/whatsapp/messages?phone_number=${encodeURIComponent(waHubActivePhone)}`);
    const messages = await res.json();
    renderHubMessages(messages);
  } catch (err) {
    console.error("Failed to load WA Hub Messages", err);
  }
}

function updateHubKpis() {
  if (!waHubAllChats) return;
  const activeSessions = waHubAllChats.length;
  // Estimate stats
  const totalMsgs = activeSessions * 14; 
  const aiReplies = activeSessions * 7;
  
  document.getElementById("waHubTotalMsgs").innerText = totalMsgs;
  document.getElementById("waHubActiveSessions").innerText = activeSessions;
  document.getElementById("waHubAiReplies").innerText = aiReplies;
}

function filterHubContacts() {
  waHubSearchQuery = document.getElementById("waHubSearch").value.toLowerCase();
  renderHubContacts();
}

function renderHubContacts() {
  const container = document.getElementById("waHubContactList");
  if (!container) return;
  
  const filtered = waHubAllChats.filter(c => 
    c.patient_name.toLowerCase().includes(waHubSearchQuery) || 
    c.phone_number.includes(waHubSearchQuery)
  );
  
  container.innerHTML = filtered.map(c => `
    <div class="wa-hub-contact-card ${c.phone_number === waHubActivePhone ? 'active' : ''}" onclick="selectWaHubContact('${c.phone_number}')">
      <div style="width:40px; height:40px; border-radius:50%; background:var(--primary-lime-light); display:flex; align-items:center; justify-content:center; color:#4d7c0f; font-size:16px;">
        <i class="fas fa-user"></i>
      </div>
      <div style="flex:1; overflow:hidden;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:var(--text-dark); font-size:14px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${c.patient_name}</strong>
          <span style="font-size:11px; color:var(--text-muted);">${c.timestamp}</span>
        </div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">${c.phone_number}</div>
        <div style="font-size:12px; color:var(--text-main); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; margin-top:4px;">${c.last_message ? c.last_message.replace(/\*(.*?)\*/g, '$1') : ''}</div>
      </div>
    </div>
  `).join('');
  
  // Populate select for testing
  const select = document.getElementById("waHubContactSelect");
  if (select) {
    select.innerHTML = waHubAllChats.map(c => `<option value="${c.phone_number}">${c.patient_name} (${c.phone_number})</option>`).join('');
    if (waHubActivePhone) select.value = waHubActivePhone;
  }
}

function selectWaHubContact(phone) {
  waHubActivePhone = phone;
  renderHubContacts();
  fetchHubMessages();
}

function renderHubMessages(messages) {
  const container = document.getElementById("waHubMessagesFeed");
  if (!container) return;
  
  if (!messages || messages.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">No messages found.</div>`;
    return;
  }
  
  const activeChat = waHubAllChats.find(c => c.phone_number === waHubActivePhone);
  const patientName = activeChat ? activeChat.patient_name : 'Patient';
  
  container.innerHTML = `<div style="text-align:center; margin:10px 0;"><span style="background:rgba(255,255,255,0.8); padding:4px 12px; border-radius:12px; font-size:11px; font-weight:600; color:var(--text-muted); box-shadow:0 1px 2px rgba(0,0,0,0.05);">Today</span></div>` + 
  messages.map(m => {
    const isPatient = m.sender === "patient";
    const bubbleClass = isPatient ? "patient" : "bot";
    const senderName = isPatient ? patientName : "AuraCare AI";
    const formattedMsg = m.message ? m.message.replace(/\*(.*?)\*/g, '<strong>$1</strong>') : '';
    
    return `
      <div class="wa-hub-msg-bubble ${bubbleClass}">
        <div class="wa-hub-msg-sender">${senderName}</div>
        <div>${formattedMsg}</div>
        <div class="wa-hub-msg-time">${m.timestamp || ''}</div>
      </div>
    `;
  }).join('');
  
  container.scrollTop = container.scrollHeight;
}

async function sendWaHubTestMsg() {
  const phone = document.getElementById("waHubContactSelect").value;
  const inputEl = document.getElementById("waHubTestMsg");
  const msg = inputEl.value.trim();
  if (!msg) return;
  
  inputEl.value = "";
  
  try {
    await fetch("/api/whatsapp/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_number: phone, message: msg })
    });
    
    if (phone === waHubActivePhone) {
      await fetchHubMessages();
    }
    await fetchHubContacts(true);
  } catch (err) {
    console.error("Test msg error", err);
  }
}
