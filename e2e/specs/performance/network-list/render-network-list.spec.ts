/* eslint-disable no-console, import/no-nodejs-modules */
import { loginToApp } from '../../../viewHelper';
import { SmokePerformance } from '../../../tags';
import WalletView from '../../../pages/wallet/WalletView';
import Assertions from '../../../utils/Assertions';
import TestHelpers from '../../../helpers';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import { withFixtures } from '../../../fixtures/fixture-helper';
import NetworkListModal from '../../../pages/Network/NetworkListModal';
import { toChecksumAddress } from 'ethereumjs-util';
import { CORE_USER_STATE, POWER_USER_STATE } from '../../../fixtures/constants';
import {
  PerformanceTestReporter,
  createUserProfileTests,
  type TestResult,
} from '../../../utils/PerformanceTestReporter';

describe(SmokePerformance('Network List Load Testing'), () => {
  const reporter = new PerformanceTestReporter('Network List Load Testing');

  const userStates = [
    { name: 'POWER_USER', state: POWER_USER_STATE },
    { name: 'CORE_USER', state: CORE_USER_STATE },
    // { name: 'CASUAL_USER', state: CASUAL_USER_STATE },
  ];

  function registerPerformanceTests() {
    createUserProfileTests(
      'render network list efficiently with multiple accounts and all popular networks',
      async (userState) => {
        // Platform-specific performance thresholds (in milliseconds)
        const isAndroid = device.getPlatform() === 'android';
        const PERFORMANCE_THRESHOLDS = isAndroid
          ? {
              NETWORK_LIST_RENDER: 15, // 15 seconds max for Android
              NAVIGATION_TO_NETWORK_LIST: 2.5, // 2.5 seconds max for Android
            }
          : {
              NETWORK_LIST_RENDER: 5, // 5 seconds max for iOS
              NAVIGATION_TO_NETWORK_LIST: 1.5, // 1.5 seconds max for iOS
            };

        console.log(
          `Running performance test on ${device.getPlatform().toUpperCase()}`,
        );
        console.log(
          `Thresholds - Render: ${PERFORMANCE_THRESHOLDS.NETWORK_LIST_RENDER}s, Navigation: ${PERFORMANCE_THRESHOLDS.NAVIGATION_TO_NETWORK_LIST}s`,
        );

        let result: Partial<TestResult> = {};

        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withPopularNetworks()
              .withUserProfileKeyRing(userState)
              .withUserProfileSnapUnencryptedState(userState)
              .withUserProfileSnapPermissions(userState)
              .build(),
            restartDevice: true,
          },
          async () => {
            await loginToApp();

            await Assertions.checkIfVisible(WalletView.container);
            // Measure time to navigate to account list
            const navigationStartTime = Date.now();

            await WalletView.tapNetworksButtonOnNavBar();

            // Re-enable sync and check if network list is visible
            await Assertions.checkIfVisible(NetworkListModal.networkScroll);
            console.log('Network list became visible');

            const navigationEndTime = Date.now();
            const navigationTime = navigationEndTime - navigationStartTime;
            console.log(`⏱️ Navigation time: ${navigationTime}ms`);

            // Measure time for network list to fully render and become interactive
            const renderStartTime = Date.now();
            console.log('🎨 Starting render timing...');

            // Check if all network is displayed
            await Assertions.checkIfTextIsDisplayed('Linea Main Network');

            const renderEndTime = Date.now();
            const renderTime = renderEndTime - renderStartTime;

            // Log performance metrics
            console.log(
              '========== NETWORK LIST LOAD TESTING RESULTS ==========',
            );
            console.log(`Platform: ${device.getPlatform().toUpperCase()}`);
            console.log(`Navigation to Network list: ${(navigationTime / 1000).toFixed(2)}s`);
            console.log(`Network list render time: ${(renderTime / 1000).toFixed(2)}s`);
            console.log(`Total time: ${((navigationTime + renderTime) / 1000).toFixed(2)}s`);
            console.log(
              '======================================================',
            );

            // Performance assertions with warnings
            if (
              navigationTime > PERFORMANCE_THRESHOLDS.NAVIGATION_TO_NETWORK_LIST * 1000
            ) {
              console.warn(
                `⚠️  PERFORMANCE WARNING: Navigation time (${(navigationTime / 1000).toFixed(2)}s) exceeded threshold (${PERFORMANCE_THRESHOLDS.NAVIGATION_TO_NETWORK_LIST}s)`,
              );
            }

            if (renderTime > PERFORMANCE_THRESHOLDS.NETWORK_LIST_RENDER * 1000) {
              console.warn(
                `⚠️  PERFORMANCE WARNING: Render time (${(renderTime / 1000).toFixed(2)}s) exceeded threshold (${PERFORMANCE_THRESHOLDS.NETWORK_LIST_RENDER}s)`,
              );
            }

            // Quality gate: Fail test if performance is unacceptable
            const totalTime = navigationTime + renderTime;
            const maxAcceptableTime =
              (PERFORMANCE_THRESHOLDS.NAVIGATION_TO_NETWORK_LIST +
              PERFORMANCE_THRESHOLDS.NETWORK_LIST_RENDER) * 1000;

            if (totalTime > maxAcceptableTime) {
              throw new Error(
                `Performance test failed: Total time (${(totalTime / 1000).toFixed(2)}s) exceeded maximum acceptable time (${((maxAcceptableTime / 1000)).toFixed(2)}s)`,
              );
            }

            console.log('Performance test passed!');

            result = {
              navigationTime,
              renderTime,
              totalTime,
              thresholds: {
                navigation: PERFORMANCE_THRESHOLDS.NAVIGATION_TO_NETWORK_LIST,
                render: PERFORMANCE_THRESHOLDS.NETWORK_LIST_RENDER,
                total: maxAcceptableTime,
              },
            };
          },
        );

        return result;
      },
      userStates,
      reporter,
    );

    createUserProfileTests(
      'handle network list performance with heavy token load on all popular networks',
      async (userState) => {
        // Create a large number of test tokens to stress test the system
        const heavyTokenLoad = [];
        for (let i = 1; i <= 50; i++) {
          // 50 tokens for stress testing
          heavyTokenLoad.push({
            address: toChecksumAddress(
              `0xabcd${i.toString().padStart(36, '0')}`,
            ),
            symbol: `HEAVY${i}`,
            decimals: 18,
            name: `Heavy Load Token ${i}`,
          });
        }

        const HEAVY_LOAD_THRESHOLDS = {
          NETWORK_LIST_RENDER: 8, // 8 seconds for heavy load
          NAVIGATION_TO_NETWORK_LIST: 3, // 3 seconds for heavy load
        };

        let result: Partial<TestResult> = {};

        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withPopularNetworks()
              .withUserProfileKeyRing(userState)
              .withUserProfileSnapUnencryptedState(userState)
              .withUserProfileSnapPermissions(userState)
              .withTokensForAllPopularNetworks(heavyTokenLoad)
              .build(),
            restartDevice: true,
          },
          async () => {
            await loginToApp();

            console.log(
              'Starting heavy load test with 50 tokens + all popular networks...',
            );

            const startTime = Date.now();
            await WalletView.tapNetworksButtonOnNavBar();

            const endTime = Date.now();
            await Assertions.checkIfVisible(NetworkListModal.networkScroll);

            const totalTime = endTime - startTime;

            console.log('========== HEAVY LOAD TEST RESULTS ==========');
            console.log(`Results will be in the generated json file`);
            console.log('=============================================');

            // Quality gate for heavy load
            const maxHeavyLoadTime =
              (HEAVY_LOAD_THRESHOLDS.NAVIGATION_TO_NETWORK_LIST +
              HEAVY_LOAD_THRESHOLDS.NETWORK_LIST_RENDER) * 1000;
            if (totalTime > maxHeavyLoadTime) {
              throw new Error(
                `Heavy load test failed: Total time (${(totalTime / 1000).toFixed(2)}s) exceeded maximum acceptable time (${(maxHeavyLoadTime / 1000).toFixed(2)}s)`,
              );
            }
            result = {
              navigationTime: 0, // No direct navigation time for this test
              renderTime: totalTime,
              totalTime,
              thresholds: {
                navigation: HEAVY_LOAD_THRESHOLDS.NAVIGATION_TO_NETWORK_LIST,
                render: HEAVY_LOAD_THRESHOLDS.NETWORK_LIST_RENDER,
                total: maxHeavyLoadTime,
              },
            };
          },
        );

        return result;
      },
      userStates,
      reporter,
    );

    createUserProfileTests(
      'benchmark network list with minimal load',
      async (userState) => {
        // Baseline test with minimal tokens for comparison
        const minimalTokens = [
          {
            address: '0x1111111111111111111111111111111111111111',
            symbol: 'MIN1',
            decimals: 18,
            name: 'Minimal Token 1',
          },
          {
            address: '0x2222222222222222222222222222222222222222',
            symbol: 'MIN2',
            decimals: 18,
            name: 'Minimal Token 2',
          },
        ];
        const isAndroid = device.getPlatform() === 'android';

        const PERFORMANCE_THRESHOLDS = isAndroid
        ? {
            RENDER_NETWORK_LIST: 2.5, // 2.5 seconds max for Android
          }
        : {
          RENDER_NETWORK_LIST: 1.5, // 1.5 seconds max for iOS
          };
        let result: Partial<TestResult> = {};

        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withTokens(minimalTokens)
              .withPopularNetworks()
              .withUserProfileKeyRing(userState)
              .withUserProfileSnapUnencryptedState(userState)
              .withUserProfileSnapPermissions(userState)
              .build(),
            restartDevice: true,
          },
          async () => {
            await loginToApp();

            console.log('Starting baseline test with minimal load...');

            await WalletView.tapNetworksButtonOnNavBar();

            const startTime = Date.now();
            await Assertions.checkIfVisible(NetworkListModal.networkScroll);
            const endTime = Date.now();

            const totalTime = endTime - startTime;

            // Baseline should be very fast
            if (totalTime > PERFORMANCE_THRESHOLDS.RENDER_NETWORK_LIST) {
              console.warn(
                `⚠️  BASELINE WARNING: Even minimal load took ${totalTime}ms`,
              );
            }

            console.log('Baseline test completed!');

            result = {
              navigationTime: 0,
              renderTime: totalTime,
              totalTime,
              thresholds: {
                navigation: 1500,
                render: 3000, // Baseline threshold
                total: 4500,
              },
            };
          },
        );

        return result;
      },
      userStates,
      reporter,
    );
  }

  registerPerformanceTests();

  beforeAll(async () => {
    jest.setTimeout(300000); // 5 minutes timeout for load testing
    await TestHelpers.reverseServerPort();
    reporter.initializeSuite();
  });

  afterAll(async () => {
    reporter.finalizeSuite();
  });
});
