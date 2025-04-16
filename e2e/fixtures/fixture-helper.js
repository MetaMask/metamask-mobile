/* eslint-disable no-console, import/no-nodejs-modules */
import FixtureServer, { DEFAULT_FIXTURE_SERVER_PORT } from './fixture-server';
import FixtureBuilder from './fixture-builder';
import Ganache from '../../app/util/test/ganache';
import GanacheSeeder from '../../app/util/test/ganache-seeder';
import axios from 'axios';
import path from 'path';
import createStaticServer from '../create-static-server';
import {
  DEFAULT_MOCKSERVER_PORT,
  getFixturesServerPort,
  getLocalTestDappPort,
  getMockServerPort,
} from './utils';
import Utilities from '../utils/Utilities';
import { device } from 'detox';
import TestHelpers from '../helpers';
import { startMockServer, stopMockServer } from '../api-mocking/mock-server';

export const DEFAULT_DAPP_SERVER_PORT = 8085;

// While Appium is still in use it's necessary to check if getFixturesServerPort if defined and provide a fallback in case it's not.
const getFixturesPort =
  typeof getFixturesServerPort === 'function'
    ? getFixturesServerPort
    : () => DEFAULT_FIXTURE_SERVER_PORT;
const FIXTURE_SERVER_URL = `http://localhost:${getFixturesPort()}/state.json`;

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
 * @param {FixtureServer} fixtureServer - An instance of the FixtureServer class responsible for loading fixtures.
 * @param {Object} options - An object containing the fixture to load.
 * @param {Object} [options.fixture] - The fixture data to load. If not provided, a default fixture is created.
 * @returns {Promise<void>} - A promise that resolves once the fixture is successfully loaded.
 * @throws {Error} - Throws an error if the fixture fails to load or if the fixture server is not properly set up.
 */
export const loadFixture = async (fixtureServer, { fixture } = {}) => {
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
export const startFixtureServer = async (fixtureServer) => {
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
export const stopFixtureServer = async (fixtureServer) => {
  if (!(await isFixtureServerStarted())) {
    console.log('The fixture server has already been stopped');
    return;
  }
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
 * @param {Object} [options.launchArgs] - Additional launch arguments for the app.
 * @param {Function} testSuite - The test suite function to execute after setting up the fixture.
 * @returns {Promise<void>} - A promise that resolves once the test suite completes.
 * @throws {Error} - Throws an error if an exception occurs during the test suite execution.
 */
export async function withFixtures(options, testSuite) {
  const {
    fixture,
    restartDevice = false,
    ganacheOptions,
    smartContract,
    disableGanache,
    dapp,
    dappOptions,
    dappPath = undefined,
    dappPaths,
    testSpecificMock,
    launchArgs,
  } = options;

  const fixtureServer = new FixtureServer();
  let mockServer;
  let mockServerPort = DEFAULT_MOCKSERVER_PORT;

  if (testSpecificMock) {
    mockServerPort = getMockServerPort();
    mockServer = await startMockServer(testSpecificMock, mockServerPort);
  }

  let ganacheServer;
  if (!disableGanache) {
    ganacheServer = new Ganache();
  }
  const dappBasePort = getLocalTestDappPort();
  let numberOfDapps = dapp ? 1 : 0;
  const dappServer = [];

  try {
    let contractRegistry;
    if (ganacheOptions && !disableGanache) {
      await ganacheServer.start(ganacheOptions);

      if (smartContract) {
        const ganacheSeeder = new GanacheSeeder(ganacheServer.getProvider());
        await ganacheSeeder.deploySmartContract(smartContract);
        contractRegistry = ganacheSeeder.getContractRegistry();
      }
    }

    if (dapp) {
      if (dappOptions?.numberOfDapps) {
        numberOfDapps = dappOptions.numberOfDapps;
      }
      for (let i = 0; i < numberOfDapps; i++) {
        let dappDirectory;
        if (dappPath || (dappPaths && dappPaths[i])) {
          dappDirectory = path.resolve(__dirname, dappPath || dappPaths[i]);
        } else {
          dappDirectory = path.resolve(
            __dirname,
            '..',
            '..',
            'node_modules',
            '@metamask',
            'test-dapp',
            'dist',
          );
        }
        dappServer.push(createStaticServer(dappDirectory));
        dappServer[i].listen(`${dappBasePort + i}`);
        await new Promise((resolve, reject) => {
          dappServer[i].on('listening', resolve);
          dappServer[i].on('error', reject);
        });
      }
    }

    // Start the fixture server
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    console.log(
      'The fixture server is started, and the initial state is successfully loaded.',
    );
    // Due to the fact that the app was already launched on `init.js`, it is necessary to
    // launch into a fresh installation of the app to apply the new fixture loaded perviously.
    if (restartDevice) {
      await TestHelpers.launchApp({
        delete: true,
        launchArgs: {
          fixtureServerPort: `${getFixturesServerPort()}`,
          detoxURLBlacklistRegex: Utilities.BlacklistURLs,
          mockServerPort: `${mockServerPort}`,
          ...(launchArgs || {}),
        },
      });
    }

    await testSuite({ contractRegistry, mockServer });
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    if (ganacheOptions && !disableGanache) {
      await ganacheServer.quit();
    }
    if (dapp) {
      for (let i = 0; i < numberOfDapps; i++) {
        if (dappServer[i] && dappServer[i].listening) {
          await new Promise((resolve, reject) => {
            dappServer[i].close((error) => {
              if (error) {
                return reject(error);
              }
              return resolve();
            });
          });
        }
      }
    }

    if (testSpecificMock) {
      await stopMockServer(mockServer);
    }

    await stopFixtureServer(fixtureServer);
  }
}

// SRP corresponding to the vault set in the default fixtures - it's an empty test account, not secret
export const defaultGanacheOptions = {
  hardfork: 'london',
  mnemonic:
    'drive manage close raven tape average sausage pledge riot furnace august tip',
};
