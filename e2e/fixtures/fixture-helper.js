/* eslint-disable no-console, import/no-nodejs-modules */
import FixtureServer from './fixture-server';
import FixtureBuilder from './fixture-builder';
import Ganache from '../../app/util/test/ganache';
import GanacheSeeder from '../../app/util/test/ganache-seeder';
import axios from 'axios';
import path from 'path';
import createStaticServer from '../create-static-server';

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
    dapp,
    dappOptions,
    dappPath = undefined,
    dappPaths,
  } = options;

  const ganacheServer = new Ganache();
  const dappBasePort = 8080;
  let numberOfDapps = dapp ? 1 : 0;
  const dappServer = [];

  try {
    let contractRegistry;
    if (ganacheOptions) {
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
    await startFixtureServer();
    await loadFixture({ fixture });
    console.log(
      'The fixture server is started, and the initial state is successfully loaded.',
    );
    // Due to the fact that the app was already launched on `init.js`, it is necessary to
    // launch into a fresh installation of the app to apply the new fixture loaded perviously.
    if (restartDevice) {
      await device.launchApp({ delete: true });
    }

    await testSuite({ contractRegistry, ganacheServer });
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    /* if (ganacheOptions) {
      try {
        await ganacheServer.quit();
      } catch (error) {
        console.log(error);
      }
    } */
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
    await stopFixtureServer();
  }
}

// SRP corresponding to the vault set in the default fixtures - it's an empty test account, not secret
export const defaultGanacheOptions = {
  hardfork: 'london',
  mnemonic:
    'drive manage close raven tape average sausage pledge riot furnace august tip',
};
