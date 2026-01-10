"use strict";

const params = new URLSearchParams(globalThis.location.search);
const mode = params.get("mode") || "attendance";
const API_URL = "http://localhost:5055"; // ✅ your .NET backend

let sdk = new Fingerprint.WebApi();
let employees = []; // ✅ ALL employees here (with biometric_data)

function updateStatus(text) {
  const el = document.getElementById("status");
  if (el) el.textContent = text;
  console.log("[FP]", text);
}

// Receive employees list from parent
window.addEventListener("message", (event) => {
  if (event.data?.type === "employees") {
    employees = Array.isArray(event.data.data) ? event.data.data : [];
    console.log("✅ Employees loaded:", employees.length);
    updateStatus(`✅ Employees loaded: ${employees.length}. Place finger...`);
  }
});

// Device events
sdk.onDeviceConnected = () =>
  updateStatus("🟢 Scanner connected. Place finger.");
sdk.onDeviceDisconnected = () => updateStatus("🔌 Scanner disconnected.");
sdk.onCommunicationFailed = () => updateStatus("❌ Communication failed.");

// Core: on scan
sdk.onSamplesAcquired = async (s) => {
  try {
    const samples = JSON.parse(s.samples);
    const pngBase64 =
      "data:image/png;base64," + Fingerprint.b64UrlTo64(samples[0]);

    updateStatus("📸 Captured! Processing...");

    // ✅ REGISTER MODE (same as before)
    if (mode === "register") {
      window.parent.postMessage(
        { type: "fingerprint-register", image: pngBase64 },
        "*"
      );
      updateStatus("✅ Captured! Place NEXT finger...");
      return;
    }

    // ✅ ATTENDANCE MODE (match against ALL employees)
    if (employees.length === 0) {
      updateStatus("⚠️ No employees/templates loaded from app.");
      window.parent.postMessage(
        {
          type: "fingerprint-attendance",
          status: "no_match",
          image: pngBase64,
        },
        "*"
      );
      return;
    }

    // Find match
    const matchResult = await findMatchingEmployee(pngBase64, employees);

    if (matchResult) {
      const { employee, score } = matchResult;

      console.log(
        "✅ MATCH:",
        employee.first_name,
        employee.last_name,
        "score:",
        score
      );

      window.parent.postMessage(
        {
          type: "fingerprint-attendance",
          status: "match",
          employee,
          image: pngBase64,
          score,
        },
        "*"
      );

      updateStatus(`✅ Match: ${employee.first_name} ${employee.last_name}`);
      // Optional: stop after match
      // await sdk.stopAcquisition();
    } else {
      console.log("❌ No match found in any employee fingers.");
      updateStatus("❌ No match. Try another finger.");

      window.parent.postMessage(
        {
          type: "fingerprint-attendance",
          status: "no_match",
          image: pngBase64,
        },
        "*"
      );
    }
  } catch (err) {
    console.error("Processing Error:", err);
    updateStatus("❌ Error processing fingerprint.");
  }
};

// Start scanner
sdk
  .startAcquisition(Fingerprint.SampleFormat.PngImage)
  .then(() => updateStatus("🔄 Scanner ready..."))
  .catch((err) => updateStatus("❌ Failed to start: " + err));

/* ---------------- Matching helpers ---------------- */

async function findMatchingEmployee(probePng, employeesList) {
  // sequential search with early-exit (simple + stable)
  for (let e = 0; e < employeesList.length; e++) {
    const emp = employeesList[e];
    const templates = Array.isArray(emp.biometric_data)
      ? emp.biometric_data
      : [];
    if (templates.length === 0) continue;

    for (let i = 0; i < templates.length; i++) {
      const candidatePng = templates[i];
      if (!candidatePng) continue;

      const result = await verifyWithBackend(probePng, candidatePng);
      // result: { match, score, threshold }

      console.log(
        `🔍 ${emp.first_name} ${emp.last_name} (F${i + 1}) score=${
          result.score
        } match=${result.match}`
      );

      if (result.match) {
        return { employee: emp, score: result.score };
      }
    }
  }
  return null;
}

async function verifyWithBackend(probePng, candidatePng) {
  const res = await fetch(API_URL + "/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ probePng, candidatePng }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Verify failed");
  }
  return data;
}
