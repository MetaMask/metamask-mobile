/* eslint-disable import/no-nodejs-modules */
import FixtureServer from './FixtureServer';
import { AnvilManager, Hardfork } from '../../seeder/anvil-manager';
import Ganache from '../../../app/util/test/ganache';

import GanacheSeeder from '../../../app/util/test/ganache-seeder';
import axios from 'axios';
import createStaticServer from '../../create-static-server';
import {
  AnvilPort,
  getFixturesServerPort,
  getLocalTestDappPort,
  getMockServerPort,
  killServiceByPid,
} from './FixtureUtils';
import Utilities from '../../utils/Utilities';
import TestHelpers from '../../helpers';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import { AnvilSeeder } from '../../seeder/anvil-seeder';
import http from 'http';
import {
  LocalNodeConfig,
  LocalNodeOptionsInput,
  LocalNodeType,
  WithFixturesOptions,
  TestSuiteFunction,
  LocalNode,
  DappOptions,
  AnvilNodeOptions,
  GanacheNodeOptions,
  TestSpecificMock,
} from '../types';
import {
  TestDapps,
  DappVariants,
  defaultGanacheOptions,
  DEFAULT_MOCKSERVER_PORT,
} from '../Constants';
import ContractAddressRegistry from '../../../app/util/test/contract-address-registry';
import FixtureBuilder from './FixtureBuilder';
import { createLogger } from '../logger';
import { mockNotificationServices } from '../../specs/notifications/utils/mocks';
import { type Mockttp } from 'mockttp';

const logger = createLogger({
  name: 'FixtureHelper',
});

const FIXTURE_SERVER_URL = `http://localhost:${getFixturesServerPort()}/state.json`;

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
 * Handles the dapps by starting the servers and listening to the ports.
 * @param dapps - The dapps to start.
 * @param dappServer - The dapp server to start.
 */
async function handleDapps(
  dapps: DappOptions[],
  dappServer: http.Server[],
): Promise<void> {
  logger.debug(
    `Starting dapps: ${dapps.map((dapp) => dapp.dappVariant).join(', ')}`,
  );
  const dappBasePort = getLocalTestDappPort();
  for (let i = 0; i < dapps.length; i++) {
    const dapp = dapps[i];
    switch (dapp.dappVariant) {
      case DappVariants.TEST_DAPP:
        dappServer.push(
          createStaticServer(
            dapp.dappPath || TestDapps[DappVariants.TEST_DAPP].dappPath,
          ),
        );
        break;
      case DappVariants.MULTICHAIN_TEST_DAPP:
        dappServer.push(
          createStaticServer(
            dapp.dappPath ||
              TestDapps[DappVariants.MULTICHAIN_TEST_DAPP].dappPath,
          ),
        );
        break;
      case DappVariants.SOLANA_TEST_DAPP:
        dappServer.push(
          createStaticServer(
            dapp.dappPath || TestDapps[DappVariants.SOLANA_TEST_DAPP].dappPath,
          ),
        );
        break;
      default:
        throw new Error(
          `Unsupported dapp variant: '${dapp.dappVariant}'. Cannot start the server.`,
        );
    }
    dappServer[i].listen(`${dappBasePort + i}`);
    await new Promise((resolve, reject) => {
      dappServer[i].on('listening', resolve);
      dappServer[i].on('error', reject);
    });
  }
}

/**
 * Handles the smart contracts by deploying them to the local node.
 * @param smartContracts - The smart contracts to deploy.
 * @param localNodeConfig - The local node configuration.
 * @param localNode - The local node to deploy the smart contracts to.
 * @returns The contract registry.
 */
async function handleSmartContracts(
  smartContracts: string[],
  localNodeConfig: LocalNodeConfig,
  localNode: LocalNode,
): Promise<ContractAddressRegistry | undefined> {
  logger.debug(`Deploying smart contracts: ${smartContracts.join(', ')}`);
  let seeder;
  let contractRegistry;
  if (smartContracts && smartContracts.length > 0) {
    switch (localNodeConfig.type) {
      case LocalNodeType.anvil:
        seeder = new AnvilSeeder(localNode.getProvider());
        break;

      case LocalNodeType.ganache:
        seeder = new GanacheSeeder(localNode.getProvider());
        break;

      default:
        throw new Error(
          `Unsupported localNode: '${localNode}'. Cannot deploy smart contracts.`,
        );
    }

    for (const contract of smartContracts) {
      await seeder.deploySmartContract(
        contract,
        localNodeConfig.options.hardfork as string,
      );
    }

    contractRegistry = seeder.getContractRegistry();
  }
  return contractRegistry;
}

/**
 * Handles the local nodes by starting the servers and listening to the ports.
 * @param localNodeOptions - The local node options to use for the test.
 * @returns The local nodes.
 */
async function handleLocalNodes(
  localNodeOptions: LocalNodeOptionsInput,
): Promise<LocalNode[]> {
  logger.debug(
    `Starting local nodes: ${localNodeOptions
      .map((node) => node.type)
      .join(', ')}`,
  );
  try {
    let localNode;
    let localNodeSpecificOptions;
    const localNodes = [];
    for (const node of localNodeOptions) {
      const nodeType = node.type;
      const nodeOptions = node.options || {};

      switch (nodeType) {
        case LocalNodeType.anvil:
          localNode = new AnvilManager();
          localNodeSpecificOptions = nodeOptions as AnvilNodeOptions;
          if (await localNode.isRunning()) {
            logger.debug('Anvil server is already running');
            // Force killing the anvil server as it is not reliable anymore
            await localNode.quit();
            await killServiceByPid(AnvilPort());
          }
          await localNode.start(localNodeSpecificOptions);
          localNodes.push(localNode);
          break;

        case LocalNodeType.ganache:
          localNode = new Ganache();
          localNodeSpecificOptions = nodeOptions as GanacheNodeOptions;
          // Check if mnemonic and/or hardfork are provided, otherwise use defaultGanacheOptions
          if (
            (!localNodeSpecificOptions?.mnemonic &&
              !localNodeSpecificOptions?.hardfork) ||
            Object.keys(localNodeSpecificOptions).length === 0
          ) {
            Object.assign(localNodeSpecificOptions, {
              ...defaultGanacheOptions,
              ...localNodeSpecificOptions,
            });
          } else {
            if (!localNodeSpecificOptions?.mnemonic) {
              localNodeSpecificOptions.mnemonic =
                defaultGanacheOptions.mnemonic;
            }
            if (!localNodeSpecificOptions?.hardfork) {
              localNodeSpecificOptions.hardfork =
                defaultGanacheOptions.hardfork;
            }
          }
          await localNode.start(localNodeSpecificOptions);
          localNodes.push(localNode);
          break;
        case LocalNodeType.bitcoin:
          break;

        default:
          throw new Error(
            `Unsupported localNode: '${nodeType}'. Cannot start the server.`,
          );
      }
    }
    return localNodes;
  } catch (error) {
    logger.error('Error in handleLocalNodes:', error);
    throw error;
  }
}

/**
 * Handles the local nodes by stopping the servers and closing the ports.
 * @param localNodes - The local nodes to stop.
 */
async function handleLocalNodeCleanup(localNodes: LocalNode[]): Promise<void> {
  logger.debug(
    `Stopping local nodes: ${localNodes
      .map((node) => node.constructor.name)
      .join(', ')}`,
  );
  for (const node of localNodes) {
    if (node) {
      await node.quit();
    }
  }
}

/**
 * Handles the dapps by stopping the servers and closing the ports.
 * @param dapps - The dapps to stop.
 * @param dappServer - The dapp server to stop.
 */
async function handleDappCleanup(
  dapps: DappOptions[],
  dappServer: http.Server[],
): Promise<void> {
  logger.debug(
    `Stopping dapps: ${dapps.map((dapp) => dapp.dappVariant).join(', ')}`,
  );
  for (let i = 0; i < dapps.length; i++) {
    if (dappServer[i]?.listening) {
      await new Promise<void>((resolve, reject) => {
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

/**
 * Loads a fixture into the fixture server.
 *
 * @param {FixtureServer} fixtureServer - An instance of the FixtureServer class responsible for loading fixtures.
 * @param {Object} options - An object containing the fixture to load.
 * @param {Object} [options.fixture] - The fixture data to load. If not provided, a default fixture is created.
 * @returns {Promise<void>} - A promise that resolves once the fixture is successfully loaded.
 * @throws {Error} - Throws an error if the fixture fails to load or if the fixture server is not properly set up.
 */
export const loadFixture = async (
  fixtureServer: FixtureServer,
  { fixture }: { fixture: FixtureBuilder },
) => {
  // If no fixture is provided, the `onboarding` option is set to `true` by default, which means
  // the app will be loaded without any fixtures and will start and go through the onboarding process.
  const state = fixture || new FixtureBuilder({ onboarding: true }).build();
  await fixtureServer.loadJsonState(state, null);
  // Checks if state is loaded
  logger.debug(`Loading fixture into fixture server: ${FIXTURE_SERVER_URL}`);
  const response = await axios.get(FIXTURE_SERVER_URL);

  // Throws if state is not properly loaded
  if (response.status !== 200) {
    logger.error('Not able to load fixtures');
    throw new Error('Not able to load fixtures');
  }
};

// Start the fixture server
export const startFixtureServer = async (fixtureServer: FixtureServer) => {
  if (await isFixtureServerStarted()) {
    logger.debug('The fixture server has already been started');
    return;
  }

  try {
    await fixtureServer.start();
    logger.debug('The fixture server is started');
  } catch (err) {
    logger.error('Fixture server error:', err);
  }
};

// Stop the fixture server
export const stopFixtureServer = async (fixtureServer: FixtureServer) => {
  if (!(await isFixtureServerStarted())) {
    logger.debug('The fixture server has already been stopped');
    return;
  }
  await fixtureServer.stop();
  logger.debug('The fixture server is stopped');
};

export const createMockAPIServer = async (
  mockServerInstance?: Mockttp,
  testSpecificMock?: TestSpecificMock,
) => {
  // Handle mock server
  let mockServer: Mockttp | undefined;
  let mockServerPort: number = DEFAULT_MOCKSERVER_PORT;

  // Both
  if (mockServerInstance && testSpecificMock) {
    throw new Error(
      'Cannot use both mockServerInstance and testSpecificMock at the same time. Please use only one.',
    );
  }

  // mockServerInstance only
  if (mockServerInstance && !testSpecificMock) {
    mockServer = mockServerInstance;
    mockServerPort = mockServer.port;
    logger.debug(
      `Mock server started from mockServerInstance on port ${mockServerPort}`,
    );

    const endpoints = await mockServer.getMockedEndpoints();

    logger.debug(`Mocked endpoints: ${endpoints.length}`);
  }

  // testSpecificMock only
  if (!mockServerInstance && testSpecificMock) {
    mockServerPort = getMockServerPort();
    mockServer = await startMockServer(testSpecificMock, mockServerPort);

    logger.debug(
      `Mock server started from testSpecificMock on port ${mockServerPort}`,
    );
  }

  // neither
  if (!mockServerInstance && !testSpecificMock) {
    mockServerPort = getMockServerPort();
    mockServer = await startMockServer({}, mockServerPort);

    logger.debug(
      `Mock server started from testSpecificMock on port ${mockServerPort}`,
    );
  }

  if (!mockServer) {
    throw new Error('Test setup failure, no mock server setup');
  }

  // Additional Global Mocks
  await mockNotificationServices(mockServer);

  return {
    mockServer,
    mockServerPort,
  };
};

/**
 * Executes a test suite with fixtures by setting up a fixture server, loading a specified fixture,
 * and running the test suite. After the test suite execution, it stops the fixture server.
 *
 * @param {WithFixturesOptions} options - The specific options for the test suite to run with.
 * @param {TestSuiteFunction} testSuite - The test suite function to execute after setting up the fixture.
 * @returns {Promise<void>} - A promise that resolves once the test suite completes.
 * @throws {Error} - Throws an error if an exception occurs during the test suite execution.
 */
export async function withFixtures(
  options: WithFixturesOptions,
  testSuite: TestSuiteFunction,
) {
  const {
    fixture,
    restartDevice = false,
    smartContracts,
    disableLocalNodes = false,
    dapps,
    localNodeOptions = [
      {
        type: LocalNodeType.anvil,
        options: {
          hardfork: 'prague' as Hardfork,
        },
      },
    ],
    testSpecificMock,
    mockServerInstance,
    launchArgs,
    languageAndLocale,
    permissions = {},
    endTestfn,
  } = options;

  const { mockServer, mockServerPort } = await createMockAPIServer(
    mockServerInstance,
    testSpecificMock,
  );

  // Prepare android devices for testing to avoid having this in all tests
  await TestHelpers.reverseServerPort();

  // Handle local nodes
  let localNodes;
  // Start servers based on the localNodes array
  if (!disableLocalNodes) {
    localNodes = await handleLocalNodes(localNodeOptions);
  }

  const dappServer: http.Server[] = [];
  const fixtureServer = new FixtureServer();

  try {
    // Handle smart contracts
    let contractRegistry;
    if (
      smartContracts &&
      smartContracts.length > 0 &&
      localNodes &&
      localNodes.length > 0
    ) {
      // We default the smart contract seeder to the first node client
      // If there's a future need to deploy multiple smart contracts in multiple clients
      // this assumption is no longer correct and the below code needs to be modified accordingly
      contractRegistry = await handleSmartContracts(
        smartContracts,
        localNodeOptions[0],
        localNodes[0],
      );
    }

    // Handle dapps
    if (dapps && dapps.length > 0) {
      await handleDapps(dapps, dappServer);
    }

    // Start fixture server
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    logger.debug(
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
        languageAndLocale,
        permissions,
      });
    }

    await testSuite({ contractRegistry, mockServer, localNodes });
  } catch (error) {
    logger.error('Error in withFixtures:', error);
    throw error;
  } finally {
    if (endTestfn) {
      // Pass the mockServer to the endTestfn if it exists as we may want
      // to capture events before cleanup
      await endTestfn({ mockServer });
    }

    // Clean up all local nodes
    if (localNodes && localNodes.length > 0) {
      await handleLocalNodeCleanup(localNodes);
    }

    if (dapps && dapps.length > 0) {
      await handleDappCleanup(dapps, dappServer);
    }

    if (mockServer) {
      await stopMockServer(mockServer);
    }

    await stopFixtureServer(fixtureServer);
  }
}
