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
              ACCOUNT_LIST_RENDER: 15000, // 15 seconds max for Android
              NAVIGATION_TO_ACCOUNT_LIST: 2500, // 2.5 seconds max for Android
            }
          : {
              ACCOUNT_LIST_RENDER: 5000, // 5 seconds max for iOS
              NAVIGATION_TO_ACCOUNT_LIST: 1500, // 1.5 seconds max for iOS
            };

        console.log(
          `Running performance test on ${device.getPlatform().toUpperCase()}`,
        );
        console.log(
          `Thresholds - Render: ${PERFORMANCE_THRESHOLDS.ACCOUNT_LIST_RENDER}ms, Navigation: ${PERFORMANCE_THRESHOLDS.NAVIGATION_TO_ACCOUNT_LIST}ms`,
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

            await WalletView.tapIdenticon();

            // Check if account list is visible
            await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
            console.log('✅ Account list became visible');

            const navigationEndTime = Date.now();
            const navigationTime = navigationEndTime - navigationStartTime;
            console.log(`⏱️ Navigation time: ${navigationTime}ms`);

            // Measure time for account list to fully render and become interactive
            const renderStartTime = Date.now();
            console.log('🎨 Starting render timing...');

            // Wait for accounts to be fully loaded

            // Check if all accounts are loaded
            await Assertions.checkIfTextIsDisplayed('Account 1');

            const renderEndTime = Date.now();
            const renderTime = renderEndTime - renderStartTime;

            // Log performance metrics
            console.warn('\n🎯 PERFORMANCE RESULTS');
            console.warn(`📱 Platform: ${device.getPlatform().toUpperCase()}`);
            console.warn(`⏱️  Navigation Time: ${navigationTime}ms`);
            console.warn(`🎨 Render Time: ${renderTime}ms`);
            console.warn(`📊 Total Time: ${navigationTime + renderTime}ms`);
            console.warn('='.repeat(50));

            // Performance assertions with warnings
            if (
              navigationTime > PERFORMANCE_THRESHOLDS.NAVIGATION_TO_ACCOUNT_LIST
            ) {
              console.warn(
                `⚠️  PERFORMANCE WARNING: Navigation time (${navigationTime}ms) exceeded threshold (${PERFORMANCE_THRESHOLDS.NAVIGATION_TO_ACCOUNT_LIST}ms)`,
              );
            }

            if (renderTime > PERFORMANCE_THRESHOLDS.ACCOUNT_LIST_RENDER) {
              console.warn(
                `⚠️  PERFORMANCE WARNING: Render time (${renderTime}ms) exceeded threshold (${PERFORMANCE_THRESHOLDS.ACCOUNT_LIST_RENDER}ms)`,
              );
            }

            // Quality gate: Fail test if performance is unacceptable
            const totalTime = navigationTime + renderTime;
            const maxAcceptableTime =
              PERFORMANCE_THRESHOLDS.NAVIGATION_TO_ACCOUNT_LIST +
              PERFORMANCE_THRESHOLDS.ACCOUNT_LIST_RENDER;

            if (totalTime > maxAcceptableTime) {
              throw new Error(
                `Performance test failed: Total time (${totalTime}ms) exceeded maximum acceptable time (${maxAcceptableTime}ms)`,
              );
            }

            console.log('✅ Performance test passed!');

            await AccountListBottomSheet.swipeToDismissAccountsModal();

            result = {
              navigationTime,
              renderTime,
              totalTime,
              thresholds: {
                navigation: PERFORMANCE_THRESHOLDS.NAVIGATION_TO_ACCOUNT_LIST,
                render: PERFORMANCE_THRESHOLDS.ACCOUNT_LIST_RENDER,
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
      'handle account list performance with heavy token load',
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
          ACCOUNT_LIST_RENDER: 8000, // Allow more time for heavy load
          NAVIGATION_TO_ACCOUNT_LIST: 3000,
        };

        let result: Partial<TestResult> = {};

        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withUserProfileKeyRing(userState)
              .withUserProfileSnapUnencryptedState(userState)
              .withUserProfileSnapPermissions(userState)
              .withPopularNetworks()
              .withTokensForAllPopularNetworks(heavyTokenLoad)
              .build(),
            restartDevice: true,
          },
          async () => {
            await loginToApp();

            console.log('Starting heavy load test with 50 tokens');

            const startNavigationTime = Date.now();
            await WalletView.tapIdenticon();
            await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
            const navigationTime = Date.now() - startNavigationTime;
            console.log('✅ Account list became visible');

            const startTime = Date.now();
            await Assertions.checkIfTextIsDisplayed('Account 1');

            const endTime = Date.now();
            const totalRenderTime = endTime - startTime;
            const totalTime = navigationTime + totalRenderTime;

            console.log('========== HEAVY LOAD TEST RESULTS ==========');
            console.warn(`⏱️  Navigation Time: ${navigationTime}ms`);
            console.warn(`🎨 Render Time: ${totalRenderTime}ms`);
            console.warn(
              `📊 Total Time: ${navigationTime + totalRenderTime}ms`,
            );
            console.log(
              '=====================================================================',
            );

            // Quality gate for heavy load
            const maxHeavyLoadTime =
              HEAVY_LOAD_THRESHOLDS.NAVIGATION_TO_ACCOUNT_LIST +
              HEAVY_LOAD_THRESHOLDS.ACCOUNT_LIST_RENDER;
            if (totalTime > maxHeavyLoadTime) {
              throw new Error(
                `Heavy load test failed: Total time (${totalTime}ms) exceeded maximum acceptable time (${maxHeavyLoadTime}ms)`,
              );
            }

            console.log('✅ Heavy load test passed!');

            result = {
              navigationTime,
              renderTime: totalRenderTime,
              totalTime,
              thresholds: {
                navigation: HEAVY_LOAD_THRESHOLDS.NAVIGATION_TO_ACCOUNT_LIST,
                render: HEAVY_LOAD_THRESHOLDS.ACCOUNT_LIST_RENDER,
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
      'benchmark account list with minimal load',
      async (_userState) => {
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

            const startNavigationTime = Date.now();
            await WalletView.tapIdenticon();
            await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
            const endNavigationTime = Date.now();

            const navigationTime = endNavigationTime - startNavigationTime;

            console.log('✅ Account list became visible');

            const startTime = Date.now();
            await Assertions.checkIfTextIsDisplayed('Account 1');

            const endTime = Date.now();
            const totalRenderTime = endTime - startTime;
            const totalTime = navigationTime + totalRenderTime;

            console.log('========== BASELINE TEST RESULTS ==========');
            console.log(`Configuration: 2 accounts, default network, 2 tokens`);
            console.warn(`⏱️  Navigation Time: ${navigationTime}ms`);
            console.warn(`🎨 Render Time: ${totalRenderTime}ms`);
            console.warn(
              `📊 Total Time: ${navigationTime + totalRenderTime}ms`,
            );
            console.log('==========================================');

            // Baseline should be very fast
            if (totalTime > 3000) {
              console.warn(
                `⚠️  BASELINE WARNING: Even minimal load took ${totalTime}ms`,
              );
            }

            console.log('✅ Baseline test completed!');
            await AccountListBottomSheet.swipeToDismissAccountsModal();

            result = {
              navigationTime,
              renderTime: totalRenderTime,
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
