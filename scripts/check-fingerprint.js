#!/usr/bin/env node

/**
 * Fingerprint comparison script (as per issue #19620)
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
 *   2 - No saved fingerprint found (first build)
 */

const fs = require('fs');
const { createFingerprintAsync } = require('@expo/fingerprint');

async function main() {
  try {
    // Check if saved fingerprint exists (try both possible locations)
    const fingerprintFiles = ['.app-native-fingerprint', '.current-fingerprint'];
    let savedFingerprint = null;
    let foundFile = null;
    
    for (const file of fingerprintFiles) {
      if (fs.existsSync(file)) {
        foundFile = file;
        savedFingerprint = fs.readFileSync(file, 'utf8').trim();
        break;
      }
    }
    
    if (!savedFingerprint) {
      console.log('No saved fingerprint found. Native build is required.');
      process.exit(2); // Special exit code for first build
    }

    if (!savedFingerprint) {
      console.log('Saved fingerprint is empty. Native build is required.');
      process.exit(1);
    }

    console.log(`Saved fingerprint from ${foundFile}: ${savedFingerprint.substring(0, 16)}...`);

    // Generate the current fingerprint
    const currentFingerprint = (await createFingerprintAsync(process.cwd(), { mode: 'prebuild' })).hash;

    console.log(`Current fingerprint: ${currentFingerprint.substring(0, 16)}...`);

    if (savedFingerprint === currentFingerprint) {
      console.log('✅ Fingerprints match! No native build required.');
      process.exit(0); // Exit script successfully
    } else {
      console.log('🔄 Fingerprints do not match. Native build is required.');
      process.exit(1); // Exit script with failure state
    }

  } catch (error) {
    console.error(`❌ Error during fingerprint check: ${error.message}`);
    console.log('Defaulting to native build for safety.');
    process.exit(1); // Default to native build on error
  }
}

main();
