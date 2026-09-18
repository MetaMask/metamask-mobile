const fs = require('fs');
const { createFingerprintAsync } = require('@expo/fingerprint');

// When set, the full fingerprint (hash + every source with its individual hash and
// debugInfo) is also written to this path as JSON. CI uploads it as an artifact so a
// future "why did the fingerprint change?" investigation can diff two runs' sources
// instead of re-deriving them from scratch.
const DEBUG_JSON_PATH_ENV_VAR = 'FINGERPRINT_DEBUG_JSON_PATH';

async function generateFingerprint() {
  try {
    const debugJsonPath = process.env[DEBUG_JSON_PATH_ENV_VAR];
    const fingerprint = await createFingerprintAsync(process.cwd(), {
      // debug: true adds per-source debugInfo (e.g. isTransformed) without changing
      // the resulting hash, so this is safe to enable unconditionally.
      debug: true,
    });
    if (debugJsonPath) {
      fs.writeFileSync(debugJsonPath, JSON.stringify(fingerprint, null, 2));
    }
    // Only output the hash to stdout, with no extra output, to ensure that scripts or tools consuming this output receive only the hash value and are not affected by additional text.
    process.stdout.write(fingerprint.hash);
  } catch (error) {
    // Write error to stderr instead of stdout to avoid corrupting the hash output
    process.stderr.write(`Error generating fingerprint: ${error.message}\n`);
    process.exit(1);
  }
}

generateFingerprint();
