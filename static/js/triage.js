// AI Triage Client Logic

async function runAiTriage() {
  const symptoms = document.getElementById("triageSymptoms").value;
  const age = parseInt(document.getElementById("triageAge").value) || 30;
  const gender = document.getElementById("triageGender").value;
  const severity = parseInt(document.getElementById("triageSeverity").value) || 3;
  const duration = document.getElementById("triageDuration").value;

  if (!symptoms) {
    alert("Please enter symptoms before running AI assessment.");
    return;
  }

  const resultBox = document.getElementById("triageResultBox");
  resultBox.style.display = "block";
  resultBox.innerHTML = `<div style="padding: 20px; text-align: center;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary-cyan)"></i><br><br>Analyzing symptoms with AI Triage Engine...</div>`;

  try {
    const res = await fetch("/api/ai/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms, age, gender, severity_self_rating: severity, duration })
    });
    const data = await res.json();

    let docsHtml = "";
    if (data.recommended_doctors && data.recommended_doctors.length > 0) {
      data.recommended_doctors.forEach(doc => {
        docsHtml += `
          <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 10px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display:flex; gap:12px; align-items:center;">
              <img src="${doc.avatar_url}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
              <div>
                <strong style="color:#fff;">${doc.name}</strong> (${doc.title})<br>
                <span style="font-size:12px; color:var(--text-muted);">${doc.specialty} • ${doc.experience} yrs exp • Fee: ₹${doc.fee}</span>
              </div>
            </div>
            <button class="btn-primary" onclick="openBookingModal(${doc.id}, '${doc.name}')">Book Now</button>
          </div>
        `;
      });
    }

    resultBox.innerHTML = `
      <div style="border-left: 5px solid ${data.priority_color}; background: rgba(17, 24, 39, 0.9); padding: 20px; border-radius: 12px; border: 1px solid var(--border-glass);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="color: #fff;"><i class="fas fa-stethoscope"></i> AI Assessment Result</h3>
          <span class="badge" style="background: ${data.priority_color}22; color: ${data.priority_color}; border: 1px solid ${data.priority_color}; font-size:13px; padding: 6px 14px;">${data.triage_level}</span>
        </div>
        <p style="margin-top: 12px; color: var(--text-muted); font-size:14px;"><strong>Recommended Department:</strong> <span style="color:var(--primary-cyan); font-weight:700;">${data.recommended_department_name}</span></p>
        <p style="margin-top: 6px; color: var(--text-muted); font-size:14px;"><strong>Clinical Summary:</strong> ${data.recommendation_reason}</p>
      </div>
    `;
  } catch (err) {
    resultBox.innerHTML = `<div style="color: var(--status-red); padding: 15px;">Failed to evaluate symptoms. Please check server backend.</div>`;
  }
}
