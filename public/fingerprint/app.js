"use strict";

const params = new URLSearchParams(globalThis.location.search);
const mode = params.get("mode") || "attendance";
let sdk = new Fingerprint.WebApi();
let employeeList = [];

window.addEventListener("message", (e) => {
  if (e.data?.type === "employees") {
    employeeList = e.data.data || [];
    console.log("👥 Received employee list:", employeeList.length);
  }
});

sdk.onDeviceConnected = () => updateStatus("🟢 Scanner connected. Place your finger.");
sdk.onDeviceDisconnected = () => updateStatus("🔌 Scanner disconnected.");
sdk.onCommunicationFailed = () => updateStatus("❌ Communication failed.");

sdk.onSamplesAcquired = async (s) => {
  const samples = JSON.parse(s.samples);
  const pngBase64 = "data:image/png;base64," + Fingerprint.b64UrlTo64(samples[0]);
  updateStatus("📸 Fingerprint captured.");

  // ✅ Attendance Matching Mode
  if (mode === "attendance" && employeeList.length > 0) {
    let bestMatch = null;

    for (const emp of employeeList) {
      const score = await compareFingerprintSSIM(pngBase64, emp.biometric_data);
      console.log(`🔍 SSIM with ${emp.first_name}:`, score);

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { emp, score };
      }
    }

    const THRESHOLD = 0.1;
    if (bestMatch && bestMatch.score >= THRESHOLD) {
      window.parent.postMessage({
        type: "fingerprint-attendance",
        status: "match",
        employee: bestMatch.emp,
        image: pngBase64
      }, "*");
    } else {
      window.parent.postMessage({
        type: "fingerprint-attendance",
        status: "no_match",
        image: pngBase64
      }, "*");
    }

    sdk.stopAcquisition();
  }

  // ✅ Registration Mode (just return captured image)
  else if (mode === "register") {
  // Capture sample and return to parent
  const pngBase64 = "data:image/png;base64," + Fingerprint.b64UrlTo64(samples[0]);

  window.parent.postMessage(
    {
      type: "fingerprint-register",
      image: pngBase64
    },
    "*"
  );

  sdk.stopAcquisition();
}
};


sdk.startAcquisition(Fingerprint.SampleFormat.PngImage)
  .then(() => updateStatus("🔄 Scanner ready..."))
  .catch(err => {
    console.error("Scanner error:", err);
    updateStatus("❌ Failed to start scanner");
  });

function updateStatus(text) {
  const el = document.getElementById("status");
  if (el) el.textContent = text;
}

async function base64ToImageData(base64) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve(imageData);
    };
    img.src = base64;
  });
}

async function compareFingerprintSSIM(base64A, base64B) {
  const imgData1 = await base64ToImageData(base64A);
  const imgData2 = await base64ToImageData(base64B);
  return computeSSIM(imgData1, imgData2);
}

function computeSSIM(imgData1, imgData2) {
  const w = imgData1.width;
  const h = imgData1.height;
  const data1 = imgData1.data;
  const data2 = imgData2.data;
  const windowSize = 8;
  const C1 = 6.5025, C2 = 58.5225;

  function getBlockStats(x, y) {
    let mu1 = 0, mu2 = 0, sigma1Sq = 0, sigma2Sq = 0, sigma12 = 0, N = 0;
    for (let j = y; j < y + windowSize && j < h; j++) {
      for (let i = x; i < x + windowSize && i < w; i++) {
        const idx = (j * w + i) * 4;
        const I1 = data1[idx];
        const I2 = data2[idx];
        mu1 += I1;
        mu2 += I2;
        N++;
      }
    }
    mu1 /= N; mu2 /= N;
    for (let j = y; j < y + windowSize && j < h; j++) {
      for (let i = x; i < x + windowSize && i < w; i++) {
        const idx = (j * w + i) * 4;
        const I1 = data1[idx];
        const I2 = data2[idx];
        sigma1Sq += (I1 - mu1) ** 2;
        sigma2Sq += (I2 - mu2) ** 2;
        sigma12  += (I1 - mu1) * (I2 - mu2);
      }
    }
    sigma1Sq /= N - 1;
    sigma2Sq /= N - 1;
    sigma12  /= N - 1;

    const numerator = (2 * mu1 * mu2 + C1) * (2 * sigma12 + C2);
    const denominator = (mu1 ** 2 + mu2 ** 2 + C1) * (sigma1Sq + sigma2Sq + C2);
    return numerator / denominator;
  }

  let total = 0, count = 0;
  for (let y = 0; y < h; y += windowSize) {
    for (let x = 0; x < w; x += windowSize) {
      total += getBlockStats(x, y);
      count++;
    }
  }
  return total / count;
}
