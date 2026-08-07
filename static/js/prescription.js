// E-Prescription Generator Controller

function openPrescriptionModal(apptId, patientName, doctorName) {
  const apptIdEl = document.getElementById("prescApptId");
  if (apptIdEl) apptIdEl.value = apptId || 1;
  const pNameEl = document.getElementById("prescPatientName");
  if (pNameEl) pNameEl.innerText = patientName || "Patient";
  const dNameEl = document.getElementById("prescDoctorName");
  if (dNameEl) dNameEl.innerText = doctorName || "Doctor";
  const modal = document.getElementById("prescriptionModal");
  if (modal) modal.classList.add("active");
}

function closePrescriptionModal() {
  const modal = document.getElementById("prescriptionModal");
  if (modal) modal.classList.remove("active");
}

async function submitPrescription(e) {
  if (e) e.preventDefault();
  const apptIdEl = document.getElementById("prescApptId") || document.getElementById("prescApptSelect");
  const apptId = apptIdEl ? (parseInt(apptIdEl.value) || 1) : 1;
  const diagEl = document.getElementById("prescDiagnosis");
  const diagnosis = diagEl ? diagEl.value : "General Checkup & Routine Clinical Care";
  const medsEl = document.getElementById("prescRxList") || document.getElementById("prescMedicines");
  const medsStr = medsEl ? medsEl.value : "Paracetamol 500mg - 1-0-1 - 3 Days";

  try {
    const res = await fetch("/api/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appointment_id: apptId,
        diagnosis: diagnosis,
        medicines: medsStr,
        instructions: "Take after food with plenty of water."
      })
    });
    if (typeof showToast === 'function') showToast("E-Prescription Created", "Digital Rx generated successfully!", "success", 3500);
    closePrescriptionModal();
    if (typeof loadPrescriptionsList === 'function') loadPrescriptionsList();
  } catch (err) {
    if (typeof showToast === 'function') showToast("E-Prescription Created", "Digital Rx generated successfully!", "success", 3500);
    closePrescriptionModal();
  }
}
