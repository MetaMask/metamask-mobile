const { createFingerprintAsync } = require('@expo/fingerprint');
const path = require('path');
const fs = require('fs');

async function generateFingerprint() {
  try {
    const cwd = process.cwd();
    process.stderr.write(`🔍 Debug: Current working directory: ${cwd}\n`);

    // Check if node_modules exists
    const nodeModulesPath = path.join(cwd, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      process.stderr.write(`❌ Error: node_modules directory not found at ${nodeModulesPath}\n`);
      process.exit(1);
    }
    process.stderr.write(`✅ Debug: node_modules directory found\n`);

    // Check if @expo/fingerprint is installed
    const fingerprintPath = path.join(nodeModulesPath, '@expo', 'fingerprint');
    if (!fs.existsSync(fingerprintPath)) {
      process.stderr.write(`❌ Error: @expo/fingerprint not found at ${fingerprintPath}\n`);
      process.stderr.write(`📋 Available packages in node_modules/@expo:\n`);
      const expoDir = path.join(nodeModulesPath, '@expo');
      if (fs.existsSync(expoDir)) {
        try {
          const packages = fs.readdirSync(expoDir);
          packages.forEach(pkg => {
            process.stderr.write(`   - ${pkg}\n`);
          });
        } catch (err) {
          process.stderr.write(`   (could not list: ${err.message})\n`);
        }
      } else {
        process.stderr.write(`   (node_modules/@expo does not exist)\n`);
      }
      process.exit(1);
    }
    process.stderr.write(`✅ Debug: @expo/fingerprint found\n`);

    process.stderr.write(`🔍 Debug: Starting fingerprint generation with debug enabled...\n`);
    const { hash } = await createFingerprintAsync(cwd, {debug: true});

    if (!hash) {
      process.stderr.write(`❌ Error: Fingerprint generation returned empty hash\n`);
      process.exit(1);
    }

    // Only output the hash to stdout, with no extra output, to ensure that scripts or tools consuming this output receive only the hash value and are not affected by additional text.
    // Debug output from createFingerprintAsync goes to stderr when debug: true
    process.stdout.write(hash);
    process.stderr.write(`✅ Debug: Fingerprint generated successfully\n`);
  } catch (error) {
    // Write error to stderr instead of stdout to avoid corrupting the hash output
    process.stderr.write(`❌ Error generating fingerprint: ${error.message}\n`);
    if (error.stack) {
      process.stderr.write(`📋 Stack trace:\n${error.stack}\n`);
    }
    process.exit(1);
  }
}

generateFingerprint();
