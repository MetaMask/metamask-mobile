#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Commands that should be tracked for analytics
const COMMANDS_TO_TRACK = [
  'setup',
  'setup:flask',
  'setup:expo',
  'start:ios',
  'start:ios:qa',
  'start:ios:e2e',
  'start:ios:flask',
  'start:android',
  'start:android:qa',
  'start:android:e2e',
  'start:android:flask',
  'build:android:release',
  'build:ios:release',
  'build:android:qa',
  'build:ios:qa',
  'test',
  'test:unit',
  'test:e2e:ios:build:qa-release',
  'test:e2e:android:build:qa-release',
  'lint',
  'format',
  'clean',
  'watch',
  'pod:install'
];

const PACKAGE_JSON_PATH = path.join(__dirname, '../../package.json');
const WRAPPER_SCRIPT = 'scripts/dev-analytics/command-wrapper.js';

/**
 * Reads and parses package.json
 */
function readPackageJson() {
  try {
    const packageJsonContent = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
    return JSON.parse(packageJsonContent);
  } catch (error) {
    console.error('❌ Failed to read package.json:', error.message);
    process.exit(1);
  }
}

/**
 * Writes package.json back to disk
 */
function writePackageJson(packageJson) {
  try {
    const content = JSON.stringify(packageJson, null, 2) + '\n';
    fs.writeFileSync(PACKAGE_JSON_PATH, content, 'utf8');
    return true;
  } catch (error) {
    console.error('❌ Failed to write package.json:', error.message);
    return false;
  }
}

/**
 * Creates a backup of the original package.json
 */
function createBackup() {
  const backupPath = PACKAGE_JSON_PATH + '.dev-analytics-backup';
  try {
    fs.copyFileSync(PACKAGE_JSON_PATH, backupPath);
    console.log(`📄 Created backup: ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error('❌ Failed to create backup:', error.message);
    return null;
  }
}

/**
 * Wraps a command with the analytics wrapper
 */
function wrapCommand(originalCommand) {
  // If already wrapped, don't wrap again
  if (originalCommand.includes(WRAPPER_SCRIPT)) {
    return originalCommand;
  }
  
  return `node ${WRAPPER_SCRIPT} ${originalCommand}`;
}

/**
 * Unwraps a command by removing the analytics wrapper
 */
function unwrapCommand(wrappedCommand) {
  const wrapperPrefix = `node ${WRAPPER_SCRIPT} `;
  if (wrappedCommand.startsWith(wrapperPrefix)) {
    return wrappedCommand.substring(wrapperPrefix.length);
  }
  return wrappedCommand;
}

/**
 * Sets up analytics tracking by wrapping specified commands
 */
function setupTracking() {
  console.log('🔧 Setting up developer analytics tracking...\n');
  
  const packageJson = readPackageJson();
  
  if (!packageJson.scripts) {
    console.error('❌ No scripts section found in package.json');
    process.exit(1);
  }

  // Create backup
  const backupPath = createBackup();
  if (!backupPath) {
    console.error('❌ Failed to create backup, aborting setup');
    process.exit(1);
  }

  let wrappedCount = 0;
  let skippedCount = 0;

  console.log('📊 Wrapping commands with analytics tracking:\n');

  COMMANDS_TO_TRACK.forEach(command => {
    if (packageJson.scripts[command]) {
      const originalCommand = packageJson.scripts[command];
      
      // Skip if already wrapped
      if (originalCommand.includes(WRAPPER_SCRIPT)) {
        console.log(`⏭️  ${command}: Already wrapped`);
        skippedCount++;
        return;
      }
      
      const wrappedCommand = wrapCommand(originalCommand);
      packageJson.scripts[command] = wrappedCommand;
      
      console.log(`✅ ${command}: Wrapped`);
      console.log(`   Original: ${originalCommand}`);
      console.log(`   Wrapped:  ${wrappedCommand}\n`);
      
      wrappedCount++;
    } else {
      console.log(`⚠️  ${command}: Command not found in package.json`);
    }
  });

  // Add analytics management scripts
  packageJson.scripts['analytics:opt-in'] = 'node scripts/dev-analytics/cli.js opt-in';
  packageJson.scripts['analytics:opt-out'] = 'node scripts/dev-analytics/cli.js opt-out';
  packageJson.scripts['analytics:status'] = 'node scripts/dev-analytics/cli.js status';
  packageJson.scripts['analytics:test'] = 'node scripts/dev-analytics/cli.js test';
  packageJson.scripts['analytics:setup'] = 'node scripts/dev-analytics/setup-tracking.js setup';
  packageJson.scripts['analytics:remove'] = 'node scripts/dev-analytics/setup-tracking.js remove';

  // Write the modified package.json
  if (writePackageJson(packageJson)) {
    console.log(`\n✅ Successfully wrapped ${wrappedCount} commands`);
    if (skippedCount > 0) {
      console.log(`⏭️  Skipped ${skippedCount} already wrapped commands`);
    }
    
    console.log('\n📊 Analytics management commands added:');
    console.log('  yarn analytics:opt-in <webhook-url>  - Opt in to analytics');
    console.log('  yarn analytics:opt-out               - Opt out of analytics');
    console.log('  yarn analytics:status               - Show analytics status');
    console.log('  yarn analytics:test                 - Test webhook connection');
    console.log('  yarn analytics:remove               - Remove analytics tracking');
    
    console.log('\n🎉 Setup complete! To enable analytics tracking:');
    console.log('  1. Get a Zapier webhook URL (https://zapier.com/)');
    console.log('  2. Run: yarn analytics:opt-in <your-webhook-url>');
    console.log('  3. Commands will now be tracked when you run them');
  } else {
    console.error('❌ Failed to save modified package.json');
    process.exit(1);
  }
}

/**
 * Removes analytics tracking by unwrapping commands
 */
function removeTracking() {
  console.log('🔧 Removing developer analytics tracking...\n');
  
  const packageJson = readPackageJson();
  
  if (!packageJson.scripts) {
    console.error('❌ No scripts section found in package.json');
    process.exit(1);
  }

  let unwrappedCount = 0;
  let notWrappedCount = 0;

  console.log('📊 Unwrapping commands:\n');

  COMMANDS_TO_TRACK.forEach(command => {
    if (packageJson.scripts[command]) {
      const currentCommand = packageJson.scripts[command];
      
      if (currentCommand.includes(WRAPPER_SCRIPT)) {
        const unwrappedCommand = unwrapCommand(currentCommand);
        packageJson.scripts[command] = unwrappedCommand;
        
        console.log(`✅ ${command}: Unwrapped`);
        console.log(`   Was:     ${currentCommand}`);
        console.log(`   Now:     ${unwrappedCommand}\n`);
        
        unwrappedCount++;
      } else {
        console.log(`⏭️  ${command}: Not wrapped`);
        notWrappedCount++;
      }
    }
  });

  // Remove analytics management scripts
  delete packageJson.scripts['analytics:opt-in'];
  delete packageJson.scripts['analytics:opt-out'];
  delete packageJson.scripts['analytics:status'];
  delete packageJson.scripts['analytics:test'];
  delete packageJson.scripts['analytics:setup'];
  delete packageJson.scripts['analytics:remove'];

  // Write the modified package.json
  if (writePackageJson(packageJson)) {
    console.log(`\n✅ Successfully unwrapped ${unwrappedCount} commands`);
    if (notWrappedCount > 0) {
      console.log(`⏭️  ${notWrappedCount} commands were not wrapped`);
    }
    console.log('📊 Analytics management commands removed');
    console.log('\n🎉 Analytics tracking removed successfully!');
  } else {
    console.error('❌ Failed to save modified package.json');
    process.exit(1);
  }
}

/**
 * Shows help information
 */
function showHelp() {
  console.log(`
MetaMask Mobile Developer Analytics Setup

Usage:
  node scripts/dev-analytics/setup-tracking.js <command>

Commands:
  setup     Set up analytics tracking by wrapping npm scripts
  remove    Remove analytics tracking by unwrapping npm scripts
  help      Show this help message

Examples:
  node scripts/dev-analytics/setup-tracking.js setup
  node scripts/dev-analytics/setup-tracking.js remove

This tool modifies package.json to wrap selected npm scripts with analytics tracking.
A backup is created before making changes.
`);
}

/**
 * Main function
 */
function main() {
  const command = process.argv[2];

  switch (command) {
    case 'setup':
      setupTracking();
      break;
    
    case 'remove':
      removeTracking();
      break;
    
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    
    default:
      console.error('❌ Unknown command:', command || 'none');
      showHelp();
      process.exit(1);
  }
}

// Run main function if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  setupTracking,
  removeTracking,
  wrapCommand,
  unwrapCommand,
  COMMANDS_TO_TRACK
}; 