const { createFingerprintAsync } = require("@expo/fingerprint");

async function generateFingerprint() {
  try {
    const { hash } = await createFingerprintAsync({ mode: "prebuild" });
    process.stdout.write(hash);
  } catch (error) {
    console.error("Error generating fingerprint:", error.message);
    process.exit(1);
  }
}

generateFingerprint();
