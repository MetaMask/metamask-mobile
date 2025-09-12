const { createFingerprint } = require("@expo/fingerprint");

async function generateFingerprint() {
  try {
    const { hash } = await createFingerprint({ mode: "prebuild" });
    process.stdout.write(hash);
  } catch (error) {
    console.error("Error generating fingerprint:", error.message);
    process.exit(1);
  }
}

generateFingerprint();
