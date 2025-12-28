"use strict";

const params = new URLSearchParams(globalThis.location.search);
const mode = params.get("mode") || "attendance";
let sdk = new Fingerprint.WebApi();

let savedTemplates = [];
let currentUserData = null;

window.addEventListener("message", (event) => {
  if (event.data.type === "employees") {
    currentUserData = event.data.data[0];
    savedTemplates = currentUserData.biometric_data || [];
    console.log("✅ Templates loaded for matching:", savedTemplates.length);
  }
});

sdk.onDeviceConnected = () =>
  updateStatus("🟢 Scanner connected. Place finger.");
sdk.onDeviceDisconnected = () => updateStatus("🔌 Scanner disconnected.");
sdk.onCommunicationFailed = () => updateStatus("❌ Communication failed.");

// 2. Finger Scan hone par kya karna hai
sdk.onSamplesAcquired = async (s) => {
  try {
    const samples = JSON.parse(s.samples);
    const pngBase64 =
      "data:image/png;base64," + Fingerprint.b64UrlTo64(samples[0]);
    updateStatus("📸 Captured! Processing...");

    if (mode === "register") {
      window.parent.postMessage(
        { type: "fingerprint-register", image: pngBase64 },
        "*"
      );

      updateStatus("📸 Captured! Place NEXT finger...");
    } else if (mode === "attendance") {
      if (savedTemplates.length === 0) {
        updateStatus("⚠️ No templates loaded. Try again.");
        return;
      }

      let matched = false;
      const THRESHOLD = 0.4;

      // --- LOOP START: 10 FINGERS CHECK ---
      for (let i = 0; i < savedTemplates.length; i++) {
        const savedTemplate = savedTemplates[i];
        if (!savedTemplate) continue;

        // Image similarity check
        const score = await compareFingerprints(pngBase64, savedTemplate);
        console.log(`🔍 Checking Finger ${i + 1}: Score ${score.toFixed(4)}`);

        if (score >= THRESHOLD) {
          matched = true;
          break; 
        }
      }
      // --- LOOP END ---

      if (matched) {
        console.log("✅ Match Found for user:", currentUserData.first_name);
        window.parent.postMessage(
          {
            type: "fingerprint-attendance",
            status: "match",
            employee: currentUserData,
            image: pngBase64,
          },
          "*"
        );
        sdk.stopAcquisition();
      } else {
        console.log("❌ No Match found in any of the 10 fingers.");
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
    }
  } catch (err) {
    console.error("Processing Error:", err);
    updateStatus("❌ Error processing fingerprint.");
  }
};

sdk
  .startAcquisition(Fingerprint.SampleFormat.PngImage)
  .then(() => updateStatus("🔄 Scanner ready..."))
  .catch((err) => updateStatus("❌ Failed to start: " + err));

function updateStatus(text) {
  const el = document.getElementById("status");
  if (el) el.textContent = text;
}

// Comparison Helpers
async function compareFingerprints(base64A, base64B) {
  try {
    const img1 = await getImageData(base64A);
    const img2 = await getImageData(base64B);
    return runSSIM(img1, img2);
  } catch (e) {
    return 0;
  }
}

function getImageData(base64) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.src = base64;
  });
}

function runSSIM(img1, img2) {
  const data1 = img1.data;
  const data2 = img2.data;
  let matches = 0;
  let total = 0;
  for (let i = 0; i < data1.length; i += 4) {
    const avg1 = (data1[i] + data1[i + 1] + data1[i + 2]) / 3;
    const avg2 = (data2[i] + data2[i + 1] + data2[i + 2]) / 3;
    if (Math.abs(avg1 - avg2) < 30) matches++;
    total++;
  }
  return matches / total;
}
