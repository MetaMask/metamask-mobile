/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-commonjs */
const detoxTeardown = require('detox/runners/jest/globalTeardown');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Import utility functions
let utils;
let DEFAULT_DAPP_SERVER_PORT = 8085; // Fallback default

// Try to load the utilities from different possible locations
try {
  utils = require('./framework/fixtures/FixtureUtils');

  // Try to get the default port
  try {
    const fixtureHelper = require('./framework/fixtures/FixtureHelper');
    if (fixtureHelper.DEFAULT_DAPP_SERVER_PORT) {
      DEFAULT_DAPP_SERVER_PORT = fixtureHelper.DEFAULT_DAPP_SERVER_PORT;
    }
  } catch (e) {
    console.warn('Could not import DEFAULT_DAPP_SERVER_PORT from FixtureHelper');
  }
} catch (e) {
  try {
    utils = require('./fixtures/utils');

    // Try to get the default port
    try {
      const fixtureHelper = require('./fixtures/fixture-helper');
      if (fixtureHelper.DEFAULT_DAPP_SERVER_PORT) {
        DEFAULT_DAPP_SERVER_PORT = fixtureHelper.DEFAULT_DAPP_SERVER_PORT;
      }
    } catch (e) {
      console.warn('Could not import DEFAULT_DAPP_SERVER_PORT from fixture-helper');
    }
  } catch (e2) {
    console.warn('Could not load utility functions, using default values');
  }
}

/**
 * Custom global teardown that extends Detox's teardown
 * and adds additional cleanup for ports that might be left open
 * @returns {Promise<void>}
 */
/* eslint-disable-next-line import/no-default-export */
module.exports = async function() {
  // First run the standard Detox teardown
  console.log('Running Detox teardown');
  await detoxTeardown();
  console.log('Detox teardown completed');

  console.log('Running port cleanup');
  try {
    // Calculate the dynamic ports that might be in use
    // We need to handle both local development and CI environments
    let baseDappPort = DEFAULT_DAPP_SERVER_PORT;
    let mockServerPort = 8000;
    let fixturesServerPort = 8545;

    if (utils) {
      if (process.env.CI && typeof utils.getLocalTestDappPort === 'function') {
        baseDappPort = utils.getLocalTestDappPort();
      }

      if (typeof utils.getMockServerPort === 'function') {
        mockServerPort = utils.getMockServerPort();
      }

      if (typeof utils.getFixturesServerPort === 'function') {
        fixturesServerPort = utils.getFixturesServerPort();
      }
    }

    // Create a list of ports to clean up
    const portsToClean = [];
    // Add dApp ports (base port and potentially multiple dApp ports)
    for (let i = 0; i < 5; i++) {
      portsToClean.push(baseDappPort + i);
    }
    // Add other service ports
    portsToClean.push(mockServerPort);
    portsToClean.push(fixturesServerPort);

    console.log(`Cleaning up ports: ${portsToClean.join(', ')}`);

    // Find and kill processes using the calculated ports
    if (process.platform === 'darwin') {
      // macOS
      console.log('Running port cleanup on macOS');
      for (const port of portsToClean) {
        await execPromise(`lsof -ti:${port} | xargs kill -9 || true`);
      }
    } else if (process.platform === 'linux') {
      // Linux (including CI environments)
      console.log('Running port cleanup on Linux');
      for (const port of portsToClean) {
        await execPromise(`fuser -k ${port}/tcp || true`);
      }
    }
    console.log('Port cleanup completed');
  } catch (error) {
    console.error('Error during port cleanup:', error);
  }
};
