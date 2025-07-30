/* eslint-disable no-console, import/no-nodejs-modules */

import { loginToApp } from '../../../viewHelper';
import { SmokePerformance } from '../../../tags';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../utils/Assertions';
import TestHelpers from '../../../helpers';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import { withFixtures } from '../../../fixtures/fixture-helper';
import { toChecksumAddress } from 'ethereumjs-util';
import { CORE_USER_STATE, POWER_USER_STATE } from '../../../fixtures/constants';
import {
  PerformanceTestReporter,
  createUserProfileTests,
  type TestResult,
} from '../../../utils/PerformanceTestReporter';

describe(SmokePerformance('Account List Load Testing'), () => {
  const reporter = new PerformanceTestReporter('Account List Load Testing');

  const userStates = [
    { name: 'CORE_USER', state: CORE_USER_STATE },
    { name: 'POWER_USER', state: POWER_USER_STATE },
  ];

  function registerPerformanceTests() {
    createUserProfileTests(
      'render account list efficiently with multiple accounts and networks',
      async (userState) => {
        const isAndroid = device.getPlatform() === 'android';
        const PERFORMANCE_THRESHOLDS = isAndroid
          ? {
              TOTAL_TIME: 5900, // 5.9 seconds max for Android
            }
          : {
              TOTAL_TIME: 4000, // 4 seconds max for iOS
            };

        console.log(
          `Running performance test on ${device.getPlatform().toUpperCase()}`,
        );
        console.log(
          `Thresholds - Total: ${PERFORMANCE_THRESHOLDS.TOTAL_TIME}ms`,
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
            const startTime = Date.now();

            await WalletView.tapIdenticon();

            // Check if account list is visible
            await Assertions.checkIfVisible(AccountListBottomSheet.accountList);

            await Assertions.checkIfTextIsDisplayed('Account 1');

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Log performance metrics
            console.warn('\n🎯 PERFORMANCE RESULTS');
            console.warn(`📱 Platform: ${device.getPlatform().toUpperCase()}`);
            console.warn(`⏱️  Total Time: ${totalTime}ms`);
            console.warn('='.repeat(50));

            // Performance assertions with warnings
            if (totalTime > PERFORMANCE_THRESHOLDS.TOTAL_TIME) {
              throw new Error(
                `Performance test failed: Total time (${totalTime}ms) exceeded maximum acceptable time (${PERFORMANCE_THRESHOLDS.TOTAL_TIME}ms)`,
              );
            }

            console.log('✅ Performance test passed!');

            await AccountListBottomSheet.swipeToDismissAccountsModal();

            result = {
              totalTime,
              thresholds: {
                totalTime: PERFORMANCE_THRESHOLDS.TOTAL_TIME,
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
      'handle account list performance with heavy token load',
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
              TOTAL_TIME: 4200, // 4.2 seconds max for Android
            }
          : {
              TOTAL_TIME: 4200, // 4.2 seconds max for iOS
            };

        let result: Partial<TestResult> = {};

        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withUserProfileKeyRing(userState)
              .withUserProfileSnapUnencryptedState(userState)
              .withUserProfileSnapPermissions(userState)
              .withPopularNetworks()
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .withTokensForAllPopularNetworks(heavyTokenLoad, userState as any)
              .build(),
            restartDevice: true,
          },
          async () => {
            await loginToApp();

            console.log('Starting heavy load test with 50 tokens');

            const startTime = Date.now();
            await WalletView.tapIdenticon();
            await Assertions.checkIfVisible(AccountListBottomSheet.accountList);

            await Assertions.checkIfTextIsDisplayed('Account 1');

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            console.log('========== HEAVY LOAD TEST RESULTS ==========');
            console.warn(`⏱️  Total Time: ${totalTime}ms`);
            console.log(
              '=====================================================================',
            );

            if (totalTime > HEAVY_LOAD_THRESHOLDS.TOTAL_TIME) {
              throw new Error(
                `Heavy load test failed: Total time (${totalTime}ms) exceeded maximum acceptable time (${HEAVY_LOAD_THRESHOLDS.TOTAL_TIME}ms)`,
              );
            }

            console.log('✅ Heavy load test passed!');

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
      'benchmark account list with minimal load',
      async (_userState) => {
        const isAndroid = device.getPlatform() === 'android';
        const BASELINE_THRESHOLDS = isAndroid
          ? {
              TOTAL_TIME: 3800, // 3.8 seconds max for Android
            }
          : {
              TOTAL_TIME: 3800, // 3.8 seconds max for iOS
            };
        // Baseline test with minimal tokens for comparison
        const minimalTokens = [
          {
            address: toChecksumAddress(
              `0x1111111111111111111111111111111111111111`,
            ),
            symbol: 'MIN1',
            decimals: 18,
            name: 'Minimal Token 1',
          },
          {
            address: toChecksumAddress(
              `0x2222222222222222222222222222222222222222`,
            ),
            symbol: 'MIN2',
            decimals: 18,
            name: 'Minimal Token 2',
          },
        ];

        let result: Partial<TestResult> = {};

        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withUserProfileKeyRing(_userState)
              .withUserProfileSnapUnencryptedState(_userState)
              .withUserProfileSnapPermissions(_userState)
              .withTokens(minimalTokens)
              .build(),
            restartDevice: true,
          },
          async () => {
            await loginToApp();

            console.log('Starting baseline test with minimal load...');

            const startTime = Date.now();
            await WalletView.tapIdenticon();
            await Assertions.checkIfVisible(AccountListBottomSheet.accountList);

            await Assertions.checkIfTextIsDisplayed('Account 1');

            const endTime = Date.now();
            const totalTime = endTime - startTime;

            console.log('========== BASELINE TEST RESULTS ==========');
            console.warn(`⏱️  Total Time: ${totalTime}ms`);
            console.log('==========================================');

            // Baseline should be very fast
            if (totalTime > BASELINE_THRESHOLDS.TOTAL_TIME) {
              throw new Error(
                `Baseline test failed: Total time (${totalTime}ms) exceeded maximum acceptable time (${BASELINE_THRESHOLDS.TOTAL_TIME}ms)`,
              );
            }

            console.log('✅ Minimal load test passed!');
            await AccountListBottomSheet.swipeToDismissAccountsModal();

            result = {
              totalTime,
              thresholds: {
                totalTime: BASELINE_THRESHOLDS.TOTAL_TIME,
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
    jest.setTimeout(300000);
    await TestHelpers.reverseServerPort();
    reporter.initializeSuite();
  });

  afterAll(async () => {
    reporter.finalizeSuite();
  });
});
