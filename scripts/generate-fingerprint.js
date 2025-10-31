const { createFingerprintAsync } = require('@expo/fingerprint');

async function generateFingerprint() {
  try {
    const { hash } = await createFingerprintAsync(process.cwd(), { mode: 'prebuild' });
    // Only output the hash to stdout, with no extra output, to ensure that scripts or tools consuming this output receive only the hash value and are not affected by additional text.
    process.stdout.write(hash);
  } catch (error) {
    // Write error to stderr instead of stdout to avoid corrupting the hash output
    process.stderr.write(`Error generating fingerprint: ${error.message}\n`);
    process.exit(1);
  }
}

generateFingerprint();
