#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function repackAndroid(inputPath, bundlePath) {
  execSync(`npx --yes @expo/repack-app --input "${inputPath}" --output "${inputPath}" --bundle "${bundlePath}"`, {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  });
}

function repackIOS(inputPath, bundlePath) {
  const possibleLocations = ['main.jsbundle', 'www/main.jsbundle', 'assets/main.jsbundle'];
  let targetPath = path.join(inputPath, 'main.jsbundle');
  
  for (const location of possibleLocations) {
    const fullPath = path.join(inputPath, location);
    if (fs.existsSync(fullPath)) {
      targetPath = fullPath;
      break;
    }
  }
  
  fs.copyFileSync(bundlePath, targetPath);
  const stats = fs.statSync(targetPath);
  if (stats.size < 100000) throw new Error(`Bundle too small: ${stats.size} bytes`);
}

async function main() {
  const args = process.argv.slice(2);
  let platform = '', inputPath = '', bundlePath = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--platform' || args[i] === '-p') platform = args[++i];
    else if (args[i] === '--input' || args[i] === '-i') inputPath = args[++i];
    else if (args[i] === '--bundle' || args[i] === '-b') bundlePath = args[++i];
  }

  if (!platform || !inputPath || !bundlePath) {
    console.error('Usage: node scripts/repack-app.js --platform <android|ios> --input <path> --bundle <path>');
    process.exit(1);
  }

  // Validate inputs
  if (!['android', 'ios'].includes(platform)) throw new Error(`Invalid platform: ${platform}`);
  if (!fs.existsSync(inputPath)) throw new Error(`Input not found: ${inputPath}`);
  if (!fs.existsSync(bundlePath)) throw new Error(`Bundle not found: ${bundlePath}`);

  try {
    if (platform === 'android') {
      repackAndroid(inputPath, bundlePath);
    } else {
      repackIOS(inputPath, bundlePath);
    }
    console.log(`✅ Repacking completed successfully for ${platform}!`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { main };