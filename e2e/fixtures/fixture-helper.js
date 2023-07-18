/* eslint-disable no-console */
import FixtureServer from './fixture-server';
import FixtureBuilder from './fixture-builder';

import axios from 'axios';

const fixtureServer = new FixtureServer();

const FIXTURE_SERVER_URL = 'http://localhost:12345/state.json';

const isFixtureServerStarted = async () => {
  try {
    const response = await axios.get(FIXTURE_SERVER_URL);
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

export const loadFixture = async ({ fixture } = {}) => {
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
