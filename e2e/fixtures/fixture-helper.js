/* eslint-disable no-console */
import FixtureServer from './fixture-server';
import FixtureBuilder from './fixture-builder';

import axios from 'axios';

const fixtureServer = new FixtureServer();

const FIXTURE_SERVER_URL = 'http://localhost:12345/state.json';

// checks if server has already been started
const isFixtureServerStarted = async () => {
  try {
    const response = await axios.get(FIXTURE_SERVER_URL);
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

/**
 * Loads a fixture into the fixture server.
 *
 * @param {Object} options - An object containing the fixture to load.
 * @param {Object} [options.fixture] - The fixture data to load. If not provided, a default fixture is created.
 * @returns {Promise<void>} - A promise that resolves once the fixture is successfully loaded.
 * @throws {Error} - Throws an error if the fixture fails to load or if the fixture server is not properly set up.
 */
export const loadFixture = async ({ fixture } = {}) => {
  // If no fixture is provided, the `onboarding` option is set to `true` by default, which means
  // the app will be loaded without any fixtures and will start and go through the onboarding process.
  const state = fixture || new FixtureBuilder({ onboarding: true }).build();
  await fixtureServer.loadJsonState(state);
  // Checks if state is loaded
  const response = await axios.get(FIXTURE_SERVER_URL);

  // Throws if state is not properly loaded
  if (response.status !== 200) {
    throw new Error('Not able to load fixtures');
  }
};

// Start the fixture server
export const startFixtureServer = async () => {
  if (await isFixtureServerStarted()) {
    console.log('The fixture server has already been started');
    return;
  }

  try {
    await fixtureServer.start();
    console.log('The fixture server is started');
  } catch (err) {
    console.log('Fixture server error:', err);
  }
};

// Stop the fixture server
export const stopFixtureServer = async () => {
  await fixtureServer.stop();
  console.log('The fixture server is stopped');
};

/**
 * Executes a test suite with fixtures by setting up a fixture server, loading a specified fixture,
 * and running the test suite. After the test suite execution, it stops the fixture server.
 *
 * @param {Object} options - An object containing configuration options.
 * @param {Object} options.fixture - The fixture to load.
 * @param {boolean} [options.restartDevice=false] - If true, restarts the app to apply the loaded fixture.
 * @param {Function} testSuite - The test suite function to execute after setting up the fixture.
 * @returns {Promise<void>} - A promise that resolves once the test suite completes.
 * @throws {Error} - Throws an error if an exception occurs during the test suite execution.
 */
export async function withFixtures(options, testSuite) {
  const { fixture, restartDevice = false } = options;
  let failed;
  try {
    // Start the fixture server
    await startFixtureServer();
    await loadFixture({ fixture });
    console.log(
      'The fixture server is started, and the initial state is successfully loaded.',
    );
    // Due to the fact that the app was already launched on `init.js`, it is
    // necessary to restart the app to apply the new fixture loaded perviously.
    if (restartDevice) {
      await device.launchApp({ newInstance: true });
    }

    await testSuite();
  } catch (error) {
    failed = true;
    console.error(error);
    throw error;
  } finally {
    if (!failed) {
      await stopFixtureServer();
    }
  }
}
