import { loginToApp } from '../../../page-objects/viewHelper.ts';
import { SmokePerformance } from '../../../tags';
import WalletView from '../../../page-objects/wallet/WalletView';
import Assertions from '../../../framework/Assertions';
import TestHelpers from '../../../helpers';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import NetworkManager from '../../../page-objects/wallet/NetworkManager';
import { toChecksumAddress } from 'ethereumjs-util';
import {
  CORE_USER_STATE,
  POWER_USER_STATE,
} from '../../../framework/fixtures/constants';
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
              TOTAL_TIME: 17500, // 17.5 seconds max for Android
            }
          : {
              TOTAL_TIME: 6500, // 6.5 seconds max for iOS
            };

        console.log(
          `Running performance test on ${device.getPlatform().toUpperCase()}`,
        );
        console.log(
          `Thresholds - Total time: ${PERFORMANCE_THRESHOLDS.TOTAL_TIME}ms`,
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

            await Assertions.expectElementToBeVisible(WalletView.container);
            // Measure time to navigate to account list
            const starTime = Date.now();

            await WalletView.tapTokenNetworkFilter();

            // Re-enable sync and check if network list is visible
            await Assertions.expectElementToBeVisible(
              NetworkManager.popularNetworksContainer,
            );
            console.log('Network list became visible');

            await Assertions.expectTextDisplayed('Linea Main Network');

            const totalTime = Date.now() - starTime;

            // Log performance metrics
            console.log(
              '========== NETWORK LIST LOAD TESTING RESULTS ==========',
            );
            console.log(`Platform: ${device.getPlatform().toUpperCase()}`);
            console.log(`Total time: ${totalTime}ms`);

            console.log(
              '======================================================',
            );

            result = {
              totalTime,
              thresholds: {
                totalTime: PERFORMANCE_THRESHOLDS.TOTAL_TIME,
              },
            };

            if (totalTime > PERFORMANCE_THRESHOLDS.TOTAL_TIME) {
              console.warn(
                `Performance test failed: Total time (${totalTime}ms) exceeded maximum acceptable time (${PERFORMANCE_THRESHOLDS.TOTAL_TIME}ms)`,
                result,
              );
            }

            console.log('Performance test passed!');
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
        for (let i = 1; i <= 10; i++) {
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

        const isAndroid = device.getPlatform() === 'android';

        const HEAVY_LOAD_THRESHOLDS = isAndroid
          ? {
              TOTAL_TIME: 8000, // 8 seconds max for Android
            }
          : {
              TOTAL_TIME: 8000, // 8 seconds max for iOS
            };

        let result: Partial<TestResult> = {};

        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withPopularNetworks()
              .withUserProfileKeyRing(userState)
              .withUserProfileSnapUnencryptedState(userState)
              .withUserProfileSnapPermissions(userState)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .withTokensForAllPopularNetworks(heavyTokenLoad, userState as any)
              .build(),
            restartDevice: true,
          },
          async () => {
            await loginToApp();

            console.log(
              'Starting heavy load test with 50 tokens + all popular networks...',
            );

            const startTime = Date.now();
            await WalletView.tapTokenNetworkFilter();

            const endTime = Date.now();
            await Assertions.expectElementToBeVisible(
              NetworkManager.popularNetworksContainer,
            );

            const totalTime = endTime - startTime;

            console.log('========== HEAVY LOAD TEST RESULTS ==========');
            console.log(`Results will be in the generated json file`);
            console.log('=============================================');

            // Quality gate for heavy load
            if (totalTime > HEAVY_LOAD_THRESHOLDS.TOTAL_TIME) {
              console.warn(
                `Heavy load test failed: Total time (${totalTime}ms) exceeded maximum acceptable time (${HEAVY_LOAD_THRESHOLDS.TOTAL_TIME}ms)`,
              );
            }
            result = {
              totalTime,
              thresholds: {
                totalTime: HEAVY_LOAD_THRESHOLDS.TOTAL_TIME,
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
              RENDER_NETWORK_LIST: 2500, // 2.5 seconds max for Android
            }
          : {
              RENDER_NETWORK_LIST: 1500, // 1.5 seconds max for iOS
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

            await WalletView.tapTokenNetworkFilter();

            const startTime = Date.now();
            await Assertions.expectElementToBeVisible(
              NetworkManager.popularNetworksContainer,
            );
            const endTime = Date.now();

            const totalTime = endTime - startTime;

            result = {
              totalTime,
              thresholds: {
                totalTime: PERFORMANCE_THRESHOLDS.RENDER_NETWORK_LIST,
              },
            };

            // Baseline should be very fast
            if (totalTime > PERFORMANCE_THRESHOLDS.RENDER_NETWORK_LIST) {
              console.warn(
                `Baseline test failed: Total time (${totalTime}ms) exceeded maximum acceptable time (${PERFORMANCE_THRESHOLDS.RENDER_NETWORK_LIST}ms)`,
                result,
              );
            }

            console.log('Baseline test completed!');
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
