#!/usr/bin/env node
/* eslint-disable import/no-commonjs, import/no-nodejs-modules */
/**
 * Fixture Loader Script for Maestro Tests
 *
 * This script starts a fixture server and loads a specified fixture state.
 * It allows Maestro tests to bypass onboarding by pre-loading wallet state.
 *
 * Usage:
 *   node e2e/maestro/scripts/fixture-loader.js --fixture <fixture-name> --action <start|stop>
 *
 * Examples:
 *   # Start server with default fixture (post-onboarding)
 *   node e2e/maestro/scripts/fixture-loader.js --action start
 *
 *   # Start server with custom fixture
 *   node e2e/maestro/scripts/fixture-loader.js --action start --fixture account-with-tokens
 *
 *   # Stop the fixture server
 *   node e2e/maestro/scripts/fixture-loader.js --action stop
 */

const path = require('path');
const fs = require('fs');

// Determine the project root directory
const projectRoot = path.resolve(__dirname, '../../..');

// Add paths for TypeScript modules
require('ts-node').register({
  project: path.join(projectRoot, 'tsconfig.json'),
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
  },
});

const FixtureServer = require('../../../e2e/framework/fixtures/FixtureServer')
  .default;
const FixtureBuilder = require('../../../e2e/framework/fixtures/FixtureBuilder')
  .default;

// Available fixture presets
const FIXTURES = {
  // Basic fixtures
  'default': () => new FixtureBuilder().build(),
  'post-onboarding': () => new FixtureBuilder().build(),
  'onboarding': () => new FixtureBuilder({ onboarding: true }).build(),

  // Network fixtures
  'with-ganache': () => new FixtureBuilder().withGanacheNetwork().build(),
  'with-sepolia': () => new FixtureBuilder().withSepoliaNetwork().build(),
  'with-popular-networks': () => new FixtureBuilder().withPopularNetworks().build(),

  // Token fixtures
  'with-tokens': () =>
    new FixtureBuilder()
      .withTokensForAllPopularNetworks([
        {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
          decimals: 6,
          name: 'USD Coin',
        },
        {
          address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          symbol: 'DAI',
          decimals: 18,
          name: 'Dai Stablecoin',
        },
      ])
      .build(),

  // Account fixtures
  'with-multiple-accounts': () =>
    new FixtureBuilder()
      .withKeyringControllerOfMultipleAccounts()
      .build(),
  'with-imported-account': () =>
    new FixtureBuilder()
      .withImportedAccountKeyringController()
      .build(),
  'import-srp': () =>
    new FixtureBuilder()
      .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
      .build(),

  // Feature fixtures
  'with-backup-sync': () =>
    new FixtureBuilder()
      .withBackupAndSyncSettings()
      .build(),
  'with-privacy-mode': () =>
    new FixtureBuilder()
      .withPrivacyModePreferences(true)
      .build(),
  'with-metametrics': () =>
    new FixtureBuilder()
      .withMetaMetricsOptIn()
      .build(),

  // Combined fixtures
  'full-setup': () =>
    new FixtureBuilder()
      .withPopularNetworks()
      .withKeyringControllerOfMultipleAccounts()
      .withTokensForAllPopularNetworks([
        {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
          decimals: 6,
          name: 'USD Coin',
        },
      ])
      .build(),
};

// Global reference to server
let fixtureServer;
let serverStarted = false;

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = {
    action: 'start',
    fixture: 'default',
  };

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--action' && i + 1 < process.argv.length) {
      args.action = process.argv[i + 1];
      i++;
    } else if (arg === '--fixture' && i + 1 < process.argv.length) {
      args.fixture = process.argv[i + 1];
      i++;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

/**
 * Print help message
 */
function printHelp() {
  console.log(`
Fixture Loader for Maestro Tests

Usage:
  node e2e/maestro/scripts/fixture-loader.js --action <start|stop> [--fixture <fixture-name>]

Options:
  --action <start|stop>    Action to perform (default: start)
  --fixture <name>         Fixture preset to load (default: default)
  --help, -h               Show this help message

Available Fixtures:
  ${Object.keys(FIXTURES).join('\n  ')}

Examples:
  # Start server with default fixture (post-onboarding)
  node e2e/maestro/scripts/fixture-loader.js --action start

  # Start server with tokens
  node e2e/maestro/scripts/fixture-loader.js --action start --fixture with-tokens

  # Stop the server
  node e2e/maestro/scripts/fixture-loader.js --action stop
  `);
}

/**
 * Start the fixture server with the specified fixture
 */
async function startFixtureServer(fixtureName) {
  if (serverStarted) {
    console.log('⚠️  Fixture server is already running');
    return;
  }

  try {
    // Get fixture builder
    const fixtureBuilderFn = FIXTURES[fixtureName];
    if (!fixtureBuilderFn) {
      throw new Error(
        `Unknown fixture: ${fixtureName}. Available fixtures: ${Object.keys(
          FIXTURES,
        ).join(', ')}`,
      );
    }

    console.log(`🔧 Building fixture: ${fixtureName}`);
    const fixture = fixtureBuilderFn();

    // Create and start server
    fixtureServer = new FixtureServer();
    console.log('🚀 Starting fixture server...');
    await fixtureServer.start();

    // Load the fixture
    console.log('📦 Loading fixture state...');
    await fixtureServer.loadJsonState(fixture, null);

    serverStarted = true;
    console.log('✅ Fixture server started successfully!');
    console.log(
      '   Server is running at: http://localhost:12345/state.json',
    );
    console.log(`   Loaded fixture: ${fixtureName}`);
    console.log(
      '\n   Keep this terminal open while running Maestro tests.',
    );
    console.log('   Press Ctrl+C to stop the server.\n');

    // Keep the process alive
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Stopping fixture server...');
      await stopFixtureServer();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n\n🛑 Stopping fixture server...');
      await stopFixtureServer();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error starting fixture server:', error.message);
    process.exit(1);
  }
}

/**
 * Stop the fixture server
 */
async function stopFixtureServer() {
  if (!serverStarted || !fixtureServer) {
    console.log('⚠️  Fixture server is not running');
    return;
  }

  try {
    await fixtureServer.stop();
    serverStarted = false;
    console.log('✅ Fixture server stopped');
  } catch (error) {
    console.error('❌ Error stopping fixture server:', error.message);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  const args = parseArgs();

  if (args.action === 'start') {
    await startFixtureServer(args.fixture);
  } else if (args.action === 'stop') {
    await stopFixtureServer();
    process.exit(0);
  } else {
    console.error(`❌ Unknown action: ${args.action}`);
    printHelp();
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

