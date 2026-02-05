/* eslint-disable no-unsafe-finally */
/* eslint-disable import/no-nodejs-modules */
import FixtureServer from './FixtureServer.ts';
import {
  AnvilManager,
  Hardfork,
  DEFAULT_ANVIL_PORT,
} from '../../seeder/anvil-manager.ts';
import Ganache, { DEFAULT_GANACHE_PORT } from '../../../app/util/test/ganache';
import GanacheSeeder from '../../../app/util/test/ganache-seeder';
import axios from 'axios';
import {
  getFixturesServerPort,
  startResourceWithRetry,
  startMultiInstanceResourceWithRetry,
  cleanupAllAndroidPortForwarding,
} from './FixtureUtils.ts';
import Utilities from '../Utilities.ts';
import { dismissDevScreens } from '../../../e2e/viewHelper.ts';
import TestHelpers from '../../../e2e/helpers';
import MockServerE2E from '../../api-mocking/MockServerE2E.ts';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.ts';
import { AnvilSeeder } from '../../seeder/anvil-seeder.ts';
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
} from '../types.ts';
import {
  TestDapps,
  DappVariants,
  defaultGanacheOptions,
  FALLBACK_DAPP_SERVER_PORT,
  FALLBACK_MOCKSERVER_PORT,
  FALLBACK_FIXTURE_SERVER_PORT,
  FALLBACK_COMMAND_QUEUE_SERVER_PORT,
} from '../Constants.ts';
import ContractAddressRegistry from '../../../app/util/test/contract-address-registry';
import FixtureBuilder from './FixtureBuilder.ts';
import { createLogger } from '../logger.ts';
import { mockNotificationServices } from '../../../e2e/specs/notifications/utils/mocks.ts';
import PortManager, { ResourceType } from '../PortManager.ts';
import { DEFAULT_MOCKS } from '../../api-mocking/mock-responses/defaults';
import CommandQueueServer from './CommandQueueServer.ts';
import DappServer from '../DappServer.ts';
import { PlatformDetector } from '../PlatformLocator.ts';

const logger = createLogger({
  name: 'FixtureHelper',
});

/**
 * Handles the dapps by starting the servers and listening to the ports.
 * @param dapps - The dapps to start.
 * @param dappServer - The dapp server to start.
 */
async function handleDapps(
  dapps: DappOptions[],
  dappServer: DappServer[],
): Promise<void> {
  logger.debug(
    `Starting dapps: ${dapps.map((dapp) => dapp.dappVariant).join(', ')}`,
  );
  for (let i = 0; i < dapps.length; i++) {
    const dapp = dapps[i];
    switch (dapp.dappVariant) {
      case DappVariants.TEST_DAPP:
        dappServer.push(
          new DappServer({
            dappCounter: i,
            rootDirectory:
              dapp.dappPath || TestDapps[DappVariants.TEST_DAPP].dappPath,
            dappVariant: DappVariants.TEST_DAPP,
          }),
        );
        break;
      case DappVariants.MULTICHAIN_TEST_DAPP:
        dappServer.push(
          new DappServer({
            dappCounter: i,
            rootDirectory:
              dapp.dappPath ||
              TestDapps[DappVariants.MULTICHAIN_TEST_DAPP].dappPath,
            dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
          }),
        );
        break;
      case DappVariants.SOLANA_TEST_DAPP:
        dappServer.push(
          new DappServer({
            dappCounter: i,
            rootDirectory:
              dapp.dappPath ||
              TestDapps[DappVariants.SOLANA_TEST_DAPP].dappPath,
            dappVariant: DappVariants.SOLANA_TEST_DAPP,
          }),
        );
        break;
      case DappVariants.BROWSER_PLAYGROUND:
        dappServer.push(
          new DappServer({
            dappCounter: i,
            rootDirectory:
              dapp.dappPath ||
              TestDapps[DappVariants.BROWSER_PLAYGROUND].dappPath,
            dappVariant: DappVariants.BROWSER_PLAYGROUND,
          }),
        );
        break;
      default:
        throw new Error(
          `Unsupported dapp variant: '${dapp.dappVariant}'. Cannot start the server.`,
        );
    }

    // Dapp servers use multi-instance allocation since we can have multiple dapp servers
    const instanceId = `dapp-server-${i}`;
    await startMultiInstanceResourceWithRetry(
      ResourceType.DAPP_SERVER,
      instanceId,
      dappServer[i],
    );
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

          // Set start options before starting
          localNode.setStartOptions(localNodeSpecificOptions);
          await startResourceWithRetry(ResourceType.ANVIL, localNode);
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

          // Set start options before starting
          localNode.setStartOptions(localNodeSpecificOptions);
          await startResourceWithRetry(ResourceType.GANACHE, localNode);
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
      await node.stop();
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
  dappServer: DappServer[],
): Promise<void> {
  logger.debug(
    `Stopping dapps: ${dapps.map((dapp) => dapp.dappVariant).join(', ')}`,
  );
  for (let i = 0; i < dapps.length; i++) {
    await dappServer[i].stop();
  }
}

/**
 * Updates RPC URLs in the fixture to use actual allocated ports from PortManager.
 * This ensures that if Anvil/Ganache got a different port than the default,
 * the fixture will have the correct URL.
 *
 * @param state - The fixture state to update
 * @returns The updated fixture state
 */
function updateRpcUrlsWithAllocatedPorts(
  state: FixtureBuilder['fixture'],
): FixtureBuilder {
  const portManager = PortManager.getInstance();

  const actualAnvilPort = portManager.getPort(ResourceType.ANVIL);
  const actualGanachePort = portManager.getPort(ResourceType.GANACHE);

  const networkConfigs =
    state.state?.engine?.backgroundState?.NetworkController
      ?.networkConfigurationsByChainId;
  if (networkConfigs) {
    for (const chainId of Object.keys(networkConfigs)) {
      const config = networkConfigs[chainId];
      if (config.rpcEndpoints) {
        for (const endpoint of config.rpcEndpoints) {
          if (endpoint.url) {
            if (actualAnvilPort !== undefined) {
              endpoint.url = endpoint.url.replace(
                new RegExp(`:${DEFAULT_ANVIL_PORT}(\\/|$)`),
                `:${actualAnvilPort}$1`,
              );
            }
            if (actualGanachePort !== undefined) {
              endpoint.url = endpoint.url.replace(
                new RegExp(`:${DEFAULT_GANACHE_PORT}(\\/|$)`),
                `:${actualGanachePort}$1`,
              );
            }
          }
        }
      }
    }
  }

  return state;
}

/**
 * Updates dapp URLs in PermissionController with actual allocated ports by index.
 * Replaces all occurrences of dapp URLs (by index) with their actual allocated ports.
 */
function updateDappUrlsWithAllocatedPorts(
  state: FixtureBuilder['fixture'],
): FixtureBuilder {
  const portManager = PortManager.getInstance();
  const permissionController =
    state.state?.engine?.backgroundState?.PermissionController;

  if (!permissionController?.subjects) {
    return state;
  }

  // Serialize subjects to JSON string for easy replacement
  let subjectsJson = JSON.stringify(permissionController.subjects);

  // Update each dapp URL by index
  let index = 0;
  while (true) {
    const actualPort = portManager.getMultiInstancePort(
      ResourceType.DAPP_SERVER,
      `dapp-server-${index}`,
    );
    if (actualPort === undefined) break;

    const fallbackPort = FALLBACK_DAPP_SERVER_PORT + index;
    const oldUrl = `localhost:${fallbackPort}`;
    const newUrl = `localhost:${actualPort}`;

    // Replace all occurrences
    subjectsJson = subjectsJson.split(oldUrl).join(newUrl);

    index++;
  }

  // Parse back and update
  permissionController.subjects = JSON.parse(subjectsJson);
  return state;
}

/**
 * Updates mock server URLs in fixture with actual allocated port.
 * Replaces all occurrences of localhost:8000 with the actual mock server port.
 * This affects browser tabs and RPC endpoints that proxy through mock server.
 */
function updateMockServerUrlsInFixture(
  state: FixtureBuilder['fixture'],
): FixtureBuilder {
  const portManager = PortManager.getInstance();
  const actualPort = portManager.getPort(ResourceType.MOCK_SERVER);

  // Serialize entire fixture to JSON for easy replacement
  let fixtureJson = JSON.stringify(state);

  // Replace all mock server URLs
  const oldUrl = `localhost:${FALLBACK_MOCKSERVER_PORT}`;
  const newUrl = `localhost:${actualPort}`;

  fixtureJson = fixtureJson.split(oldUrl).join(newUrl);

  // Parse back and return
  return JSON.parse(fixtureJson);
}

/**
 * Loads a fixture into the fixture server.
 *
 * @param fixtureServer - An instance of the FixtureServer class responsible for loading fixtures.
 * @param options - An object containing the fixture to load.
 * @param options.fixture - The fixture data to load. If not provided, a default fixture is created.
 */
export const loadFixture = async (
  fixtureServer: FixtureServer,
  { fixture }: { fixture: FixtureBuilder },
) => {
  // If no fixture is provided, the `onboarding` option is set to `true` by default, which means
  // the app will be loaded without any fixtures and will start and go through the onboarding process.
  let state = fixture || new FixtureBuilder({ onboarding: true }).build();

  // Update RPC URLs with actual allocated ports from PortManager
  state = updateRpcUrlsWithAllocatedPorts(state);

  // Update dapp URLs and mock server URLs with actual allocated ports (iOS only)
  // On Android, fixture uses fallback ports which are mapped via adb reverse
  if (await PlatformDetector.isIOS()) {
    state = updateDappUrlsWithAllocatedPorts(state);
    state = updateMockServerUrlsInFixture(state);
  }

  fixtureServer.loadJsonState(state, null);
  // Checks if state is loaded
  logger.debug(
    `Loading fixture into fixture server: ${fixtureServer.getServerUrl}`,
  );
  const response = await axios.get(fixtureServer.getServerUrl);

  // Throws if state is not properly loaded
  if (response.status !== 200) {
    logger.error('Not able to load fixtures');
    throw new Error('Not able to load fixtures');
  }
};

export const createMockAPIServer = async (
  testSpecificMock?: TestSpecificMock,
): Promise<{
  mockServerInstance: MockServerE2E;
  mockServerPort: number;
}> => {
  const mockServerInstance = new MockServerE2E({
    events: DEFAULT_MOCKS,
    testSpecificMock,
  });

  const mockServerPort = await startResourceWithRetry(
    ResourceType.MOCK_SERVER,
    mockServerInstance,
  );

  const mockServer = mockServerInstance.server;

  if (testSpecificMock) {
    logger.debug(
      `Mock server started with testSpecificMock (priority) + defaults fallback on port ${mockServerPort}`,
    );
  } else {
    logger.debug(`Mock server started with defaults on port ${mockServerPort}`);
  }

  // Additional Global Mocks
  await mockNotificationServices(mockServer);

  // Feature Flags
  // testSpecificMock can override this if needed
  await setupRemoteFeatureFlagsMock(mockServer);

  const endpoints = await mockServer.getMockedEndpoints();
  logger.debug(`Mocked endpoints: ${endpoints.length}`);

  return {
    mockServerInstance,
    mockServerPort,
  };
};

/**
 * Executes a test suite with fixtures by setting up a fixture server, loading a specified fixture,
 * and running the test suite. After the test suite execution, it stops the fixture server.
 *
 * @param options - The specific options for the test suite to run with.
 * @param testSuite - The test suite function to execute after setting up the fixture.
 */
export async function withFixtures(
  options: WithFixturesOptions,
  testSuite: TestSuiteFunction,
) {
  const {
    fixture: fixtureOption,
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
    launchArgs,
    languageAndLocale,
    permissions = {},
    endTestfn,
    skipReactNativeReload = false,
    useCommandQueueServer = false,
  } = options;

  // Clean up any stale port forwarding from previous failed tests
  // This ensures we start with a clean slate on Android
  await cleanupAllAndroidPortForwarding();

  // Prepare android devices for testing to avoid having this in all tests
  await TestHelpers.reverseServerPort();

  // ========== RESOURCE STARTUP ORDER (IMPORTANT!) ==========
  // Resources must be started in this specific order to ensure ports are allocated
  // before they're referenced by subsequent resources, especially in testSpecificMock.
  //
  // 1. Local nodes (Anvil/Ganache) - Foundation for contracts and fixtures
  // 2. Smart contracts - Deploy to local nodes
  // 3. Dapp servers - May reference contract addresses
  // 4. Mock server - testSpecificMock can reference all above (dapps, nodes, contracts)
  // 5. Fixture server - Loads state with proper port mappings
  //
  // WHY: testSpecificMock runs during MockServer.start() and may call:
  // - getTestDappLocalUrl() / getDappUrl() - needs dapp ports allocated (iOS)
  // - getGanachePort() / AnvilPort() - needs node ports allocated
  // - Contract addresses from contractRegistry
  // ==========================================================

  // Initialize resource references for cleanup
  let localNodes;
  let contractRegistry;
  const dappServer: DappServer[] = [];
  let mockServerInstance;
  let mockServerPort;
  const fixtureServer = new FixtureServer();
  const commandQueueServer = new CommandQueueServer();
  let testError: Error | null = null;

  try {
    // Step 1: Start local nodes (Anvil/Ganache)
    if (!disableLocalNodes) {
      localNodes = await handleLocalNodes(localNodeOptions);
    }

    // Step 2: Deploy smart contracts (needs local nodes running)
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

    // Step 3: Start dapp servers (may reference contract addresses)
    if (dapps && dapps.length > 0) {
      await handleDapps(dapps, dappServer);
    }

    // Step 4: Start mock server (testSpecificMock can reference everything above)
    const mockServerResult = await createMockAPIServer(testSpecificMock);
    mockServerInstance = mockServerResult.mockServerInstance;
    mockServerPort = mockServerResult.mockServerPort;
    // Resolve fixture after local nodes are started so dynamic ports are known
    let resolvedFixture: FixtureBuilder;
    if (typeof fixtureOption === 'function') {
      resolvedFixture = await fixtureOption({ localNodes });
    } else {
      resolvedFixture = fixtureOption;
    }

    // Start fixture server
    await startResourceWithRetry(ResourceType.FIXTURE_SERVER, fixtureServer);
    await loadFixture(fixtureServer, { fixture: resolvedFixture });
    logger.debug(
      'The fixture server is started, and the initial state is successfully loaded.',
    );

    if (useCommandQueueServer) {
      await startResourceWithRetry(
        ResourceType.COMMAND_QUEUE_SERVER,
        commandQueueServer,
      );
    }
    // Due to the fact that the app was already launched on `init.js`, it is necessary to
    // launch into a fresh installation of the app to apply the new fixture loaded perviously.

    if (restartDevice) {
      // On Android, LaunchArguments library integration is unreliable on CI
      // We must pass fallback ports so the app uses them and adb reverse can map them
      // to the actual allocated ports
      const isAndroid = device.getPlatform() === 'android';

      await TestHelpers.launchApp({
        delete: true,
        launchArgs: {
          fixtureServerPort: isAndroid
            ? `${FALLBACK_FIXTURE_SERVER_PORT}`
            : `${getFixturesServerPort()}`,
          commandQueueServerPort: isAndroid
            ? `${FALLBACK_COMMAND_QUEUE_SERVER_PORT}`
            : `${commandQueueServer.getServerPort()}`,
          detoxURLBlacklistRegex: Utilities.BlacklistURLs,
          mockServerPort: isAndroid
            ? `${FALLBACK_MOCKSERVER_PORT}`
            : `${mockServerPort}`,
          ...(launchArgs || {}),
        },
        languageAndLocale,
        permissions,
      });
    }

    // Dismiss dev screens if running locally (not in CI)
    if (process.env.CI !== 'true') {
      await dismissDevScreens();
    }

    await testSuite({
      contractRegistry,
      mockServer: mockServerInstance.server,
      localNodes,
      commandQueueServer,
    });
  } catch (error) {
    testError = error as Error;
    logger.error('Error in withFixtures:', error);
  } finally {
    const cleanupErrors: Error[] = [];

    if (endTestfn) {
      try {
        // Pass the mockServer to the endTestfn if it exists as we may want
        // to capture events before cleanup
        if (mockServerInstance) {
          await endTestfn({ mockServer: mockServerInstance.server });
        } else {
          await endTestfn({});
        }
      } catch (endTestError) {
        logger.error('Error in endTestfn:', endTestError);
        cleanupErrors.push(endTestError as Error);
      }
    }

    // Clean up all local nodes
    if (localNodes && localNodes.length > 0) {
      try {
        await handleLocalNodeCleanup(localNodes);
      } catch (cleanupError) {
        logger.error('Error during local node cleanup:', cleanupError);
        cleanupErrors.push(cleanupError as Error);
      }
    }

    if (dapps && dapps.length > 0) {
      try {
        await handleDappCleanup(dapps, dappServer);
      } catch (cleanupError) {
        logger.error('Error during dapp cleanup:', cleanupError);
        cleanupErrors.push(cleanupError as Error);
      }
    }

    // skipReactNativeReload needs to happen before killing the mock server to avoid race conditions
    if (!skipReactNativeReload) {
      try {
        // Disable synchronization to prevent race conditions with pending timers
        await device.disableSynchronization();
        await device.reloadReactNative();
        await device.enableSynchronization();
      } catch (cleanupError) {
        logger.warn('React Native reload failed (non-critical):', cleanupError);
        // Ensure synchronization is re-enabled even on failure
        try {
          await device.enableSynchronization();
        } catch {
          // Ignore - best effort
        }
        // Don't add to cleanupErrors as this is a non-critical cleanup operation
      }
    }

    if (mockServerInstance) {
      try {
        // Validate live requests
        mockServerInstance.validateLiveRequests();
      } catch (cleanupError) {
        logger.error('Error during live request validation:', cleanupError);
        cleanupErrors.push(cleanupError as Error);
      }
    }

    // Clean up the mock server
    if (mockServerInstance?.isStarted()) {
      try {
        await mockServerInstance.stop();
      } catch (cleanupError) {
        logger.error('Error during mock server cleanup:', cleanupError);
        cleanupErrors.push(cleanupError as Error);
      }
    }

    // Clean up the fixture server
    if (fixtureServer?.isStarted()) {
      try {
        await fixtureServer.stop();
      } catch (cleanupError) {
        logger.error('Error during fixture server cleanup:', cleanupError);
        cleanupErrors.push(cleanupError as Error);
      }
    }

    // Clean up the command queue server
    if (useCommandQueueServer) {
      if (commandQueueServer?.isStarted()) {
        try {
          await commandQueueServer.stop();
        } catch (cleanupError) {
          logger.error(
            'Error during command queue server cleanup:',
            cleanupError,
          );
          cleanupErrors.push(cleanupError as Error);
        }
      }
    }

    // Handle error reporting: prioritize test error over cleanup errors
    if (testError && cleanupErrors.length > 0) {
      // Both test and cleanup failed - report both but throw the test error
      const cleanupErrorMessages = cleanupErrors
        .map((err, index) => `${index + 1}. ${err.message}`)
        .join('\n');
      logger.error(
        `Test failed AND cleanup failed with ${cleanupErrors.length} error(s):\n${cleanupErrorMessages}`,
      );
      throw testError; // Preserve original test failure
    } else if (testError) {
      // Only test failed - normal case
      throw testError;
    } else if (cleanupErrors.length > 0) {
      // Only cleanup failed - throw cleanup error
      const errorMessages = cleanupErrors
        .map((err, index) => `${index + 1}. ${err.message}`)
        .join('\n');
      const errorMessage = `Test cleanup failed with ${cleanupErrors.length} error(s):\n${errorMessages}`;
      throw new Error(errorMessage);
    }
    // No errors - test passed successfully
  }
}
