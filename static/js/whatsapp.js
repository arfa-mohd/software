// WhatsApp Real Database Messaging Engine

let activeWaPhone = "+91 98765 43215";
let activeWaPatientName = "David Miller";

document.addEventListener("DOMContentLoaded", () => {
  loadWaChatsList();
});

// Load Active WhatsApp Contact Chats from Database
async function loadWaChatsList() {
  try {
    const res = await fetch("/api/whatsapp/chats");
    const chats = await res.json();
    const container = document.getElementById("waContactListContainer");
    if (!container) return;

    if (chats && chats.length > 0) {
      container.innerHTML = chats.map(c => `
        <div class="wa-contact-card ${c.phone_number === activeWaPhone ? 'active' : ''}" onclick="selectWaContact('${c.phone_number}', '${c.patient_name}')">
          <div class="wa-avatar-circle"><i class="fas fa-user"></i></div>
          <div style="flex:1; overflow:hidden;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="color:var(--text-dark); font-size:13px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${c.patient_name}</strong>
              <span style="font-size:10px; color:var(--text-muted);">${c.timestamp}</span>
            </div>
            <div style="font-size:11px; color:var(--text-muted); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; margin-top:2px;">${c.phone_number}</div>
            <div style="font-size:11px; color:var(--text-main); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; margin-top:2px;">${c.last_message.replace(/\*(.*?)\*/g, '$1')}</div>
          </div>
        </div>
      `).join('');
    }

    // Load initial active chat messages
    selectWaContact(activeWaPhone, activeWaPatientName);
  } catch (err) {
    console.error("Failed to load WA chats", err);
  }
}

// Select Contact & Fetch Messages from Database
async function selectWaContact(phone, name) {
  activeWaPhone = phone;
  activeWaPatientName = name;

  document.getElementById("waActiveContactName").innerText = `${name} (${phone})`;
  document.querySelectorAll(".wa-contact-card").forEach(card => card.classList.remove("active"));

  try {
    const res = await fetch(`/api/whatsapp/messages?phone_number=${encodeURIComponent(phone)}`);
    const messages = await res.json();
    const container = document.getElementById("waMessagesContainer");
    if (!container) return;

    container.innerHTML = "";
    if (messages && messages.length > 0) {
      messages.forEach(m => {
        const type = m.sender === "patient" ? "outgoing" : "incoming";
        appendWaBubble(m.message, type, m.timestamp);
      });
    } else {
      container.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:12px; margin-top:20px;">No message history found for ${name}.</div>`;
    }
  } catch (err) {
    console.error("Failed to load messages", err);
  }
}

// Send Message & Persist to Database
async function sendWhatsAppMessage() {
  const inputEl = document.getElementById("waInputMsg");
  const msgText = inputEl.value.trim();
  if (!msgText) return;

  const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  appendWaBubble(msgText, "outgoing", nowStr);
  inputEl.value = "";

  try {
    const res = await fetch("/api/whatsapp/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_number: activeWaPhone, message: msgText })
    });
    const data = await res.json();
    
    setTimeout(() => {
      appendWaBubble(data.reply, "incoming", data.timestamp);
      loadWaChatsList(); // Refresh left contact list snippet
    }, 400);
  } catch (err) {
    appendWaBubble("⚠️ Error connecting to server.", "incoming");
  }
}

function sendWaOption(msg) {
  document.getElementById("waInputMsg").value = msg;
  sendWhatsAppMessage();
}

function appendWaBubble(text, type, time = "") {
  const container = document.getElementById("waMessagesContainer");
  if (!container) return;

  const nowStr = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const bubble = document.createElement("div");
  bubble.className = `msg-bubble ${type}`;
  bubble.innerHTML = `
    <div>${text.replace(/\*(.*?)\*/g, '<strong>$1</strong>')}</div>
    <div class="msg-time">${nowStr}</div>
  `;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}
