#!/usr/bin/env node

/**
 * Simple fingerprint comparison script
 *
 * Compares the current fingerprint with the saved fingerprint to determine
 * if a native build is required.
 *
 * Usage:
 *   node scripts/check-fingerprint.js
 *
 * Exit codes:
 *   0 - Fingerprints match, no native build required (can repack)
 *   1 - Fingerprints don't match, native build required
 */

const fs = require('fs');
const { createFingerprintAsync } = require('@expo/fingerprint');

async function main() {
  try {
    console.log('=== Fingerprint Check ===');

    // Check if saved fingerprint exists
    if (!fs.existsSync('.app-native-fingerprint')) {
      console.log('No saved fingerprint found. Native build is required.');
      process.exit(1);
    }

    // Read the saved fingerprint
    const savedFingerprint = fs.readFileSync('.app-native-fingerprint', 'utf8').trim();
    console.log(`Saved fingerprint: ${savedFingerprint}`);

    // Generate the current fingerprint
    console.log('Generating current fingerprint...');
    const currentFingerprint = (await createFingerprintAsync(process.cwd(), { mode: 'prebuild' })).hash;
    console.log(`Current fingerprint: ${currentFingerprint}`);

    if (savedFingerprint === currentFingerprint) {
      console.log('✅ Fingerprints match! No native build required.');
      process.exit(0); // Exit script successfully
    } else {
      console.log('🔄 Fingerprints do not match. Native build is required.');
      process.exit(1); // Exit script with failure state
    }

  } catch (error) {
    console.error('Error during fingerprint check:', error.message);
    console.log('Defaulting to native build for safety.');
    process.exit(1); // Default to native build on error
  }
}

main();

