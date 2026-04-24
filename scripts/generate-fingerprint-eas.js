const { createFingerprintAsync } = require('@expo/fingerprint');

/**
 * EAS-specific fingerprint generator.
 *
 * Extends the base fingerprint.config.js with `.github/workflows` and
 * `.github/scripts` so that CI workflow edits are considered native-affecting
 * when comparing fingerprints in the push-eas-update workflow.
 *
 * These sources are intentionally excluded from the global fingerprint.config.js
 * to avoid invalidating build caches on every unrelated CI edit to `main`.
 */
async function generateFingerprint() {
  try {
    const { hash } = await createFingerprintAsync(process.cwd(), {
      extraSources: [
        {
          type: 'dir',
          filePath: '.github/workflows',
          reasons: ['Detect Github workflow changes.'],
        },
        {
          type: 'dir',
          filePath: '.github/scripts',
          reasons: ['Detect Github workflow script changes.'],
        },
      ],
    });
    // Only output the hash to stdout, with no extra output, to ensure that scripts or tools consuming this output receive only the hash value and are not affected by additional text.
    process.stdout.write(hash);
  } catch (error) {
    // Write error to stderr instead of stdout to avoid corrupting the hash output
    process.stderr.write(`Error generating fingerprint: ${error.message}\n`);
    process.exit(1);
  }
}

generateFingerprint();
