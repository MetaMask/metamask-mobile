/* eslint-disable no-console, import/no-nodejs-modules */
import { loginToApp } from '../../viewHelper';
import { SmokePerformance } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../utils/Assertions';
import TestHelpers from '../../helpers';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
// import NetworkListModal from '../../pages/Network/NetworkListModal';
// import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import { toChecksumAddress } from 'ethereumjs-util';
import { CORE_USER_STATE, POWER_USER_STATE } from '../../fixtures/constants';
import fs from 'fs';
import path from 'path';

// Test results storage
interface TestResult {
  testName: string;
  userProfile: string;
  platform: string;
  navigationTime: number;
  renderTime: number;
  totalTime: number;
  status: 'PASSED' | 'FAILED';
  error?: string;
  timestamp: string;
  thresholds: {
    navigation: number;
    render: number;
    total: number;
  };
}

interface TestSuiteResults {
  suiteName: string;
  startTime: string;
  endTime: string;
  platform: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
}

let testSuiteResults: TestSuiteResults;

// Helper function to save results to JSON file
const saveTestResults = (results: TestSuiteResults) => {
  const performanceDir = path.join(__dirname);
  const outputFile = path.join(
    performanceDir,
    'account-list-performance-results.json',
  );

  try {
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.warn(`📊 Test results saved to: ${outputFile}`);
  } catch (error) {
    console.error(`❌ Failed to save test results: ${error}`);
  }
};

// Helper function to create test iterations for different user profiles
const createUserProfileTests = (
  testName: string,
  testFunction: (userState: unknown) => Promise<Partial<TestResult>>,
) => {
  const userStates = [
    { name: 'POWER_USER', state: POWER_USER_STATE },
    { name: 'CORE_USER', state: CORE_USER_STATE },
    // { name: 'CASUAL_USER', state: CASUAL_USER_STATE },
  ];

  userStates.forEach(({ name, state }, index) => {
    it(`${testName} - ${name}`, async () => {
      // Use console.warn to ensure visibility in test output
      console.warn(
        `\n🚀 STARTING TEST BLOCK ${index + 1}/${
          userStates.length
        }: ${testName} - ${name}`,
      );
      console.warn(`📊 Test Details: ${testName} - ${name}`);
      console.warn(`⏰ Start Time: ${new Date().toISOString()}`);

      const startTime = Date.now();

      try {
        const result = await testFunction(state);
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Create test result object
        const testResult: TestResult = {
          testName,
          userProfile: name,
          platform: device.getPlatform().toUpperCase(),
          navigationTime: result.navigationTime || 0,
          renderTime: result.renderTime || 0,
          totalTime: duration,
          status: 'PASSED',
          timestamp: new Date().toISOString(),
          thresholds: result.thresholds || {
            navigation: 0,
            render: 0,
            total: 0,
          },
        };

        // Add to test suite results
        testSuiteResults.results.push(testResult);
        testSuiteResults.passedTests++;

        console.warn(
          `✅ TEST BLOCK ${index + 1}/${
            userStates.length
          } PASSED: ${testName} - ${name}`,
        );
        console.warn(`⏱️  Total Duration: ${duration}ms`);
        console.warn(`⏰ End Time: ${new Date().toISOString()}`);
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Create failed test result object
        const testResult: TestResult = {
          testName,
          userProfile: name,
          platform: device.getPlatform().toUpperCase(),
          navigationTime: 0,
          renderTime: 0,
          totalTime: duration,
          status: 'FAILED',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          thresholds: { navigation: 0, render: 0, total: 0 },
        };

        // Add to test suite results
        testSuiteResults.results.push(testResult);
        testSuiteResults.failedTests++;

        console.error(
          `❌ TEST BLOCK ${index + 1}/${
            userStates.length
          } FAILED: ${testName} - ${name}`,
        );
        console.error(`⏱️  Duration: ${duration}ms`);
        console.error(
          `💥 Error: ${error instanceof Error ? error.message : String(error)}`,
        );

        throw error;
      }
    });
  });
};

describe(SmokePerformance('Account List Load Testing'), () => {
  beforeAll(async () => {
    console.warn('\n🚀 STARTING ACCOUNT LIST PERFORMANCE TEST SUITE');
    console.warn(`📱 Platform: ${device.getPlatform().toUpperCase()}`);
    console.warn(`⏰ Start Time: ${new Date().toISOString()}`);
    console.warn('='.repeat(60));

    jest.setTimeout(300000); // 5 minutes timeout for load testing
    await TestHelpers.reverseServerPort();

    // Initialize test suite results
    testSuiteResults = {
      suiteName: 'Account List Load Testing',
      startTime: new Date().toISOString(),
      endTime: '',
      platform: device.getPlatform().toUpperCase(),
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      results: [],
    };
  });

  afterAll(async () => {
    testSuiteResults.endTime = new Date().toISOString();
    saveTestResults(testSuiteResults);
    console.warn('\n🏁 FINISHED ACCOUNT LIST PERFORMANCE TEST SUITE');
    console.warn(`⏰ End Time: ${new Date().toISOString()}`);
    console.warn('='.repeat(60));
  });

  // createUserProfileTests('render account list efficiently with multiple accounts and networks w/profile syncing', async (_userState) => {
  //   // Platform-specific performance thresholds (in milliseconds)
  //   const isAndroid = device.getPlatform() === 'android';
  //   const PERFORMANCE_THRESHOLDS = isAndroid
  //     ? {
  //         ACCOUNT_LIST_RENDER: 35000, // 15 seconds max for Android
  //         NAVIGATION_TO_ACCOUNT_LIST: 2500, // 2.5 seconds max for Android
  //       }
  //     : {
  //         ACCOUNT_LIST_RENDER: 5000, // 5 seconds max for iOS
  //         NAVIGATION_TO_ACCOUNT_LIST: 1500, // 1.5 seconds max for iOS
  //       };

  //   console.log(
  //     `Running performance test on ${device.getPlatform().toUpperCase()}`,
  //   );
  //   console.log(
  //     `Thresholds - Render: ${PERFORMANCE_THRESHOLDS.ACCOUNT_LIST_RENDER}ms, Navigation: ${PERFORMANCE_THRESHOLDS.NAVIGATION_TO_ACCOUNT_LIST}ms`,
  //   );

  //   await withFixtures(
  //     {
  //       fixture: new FixtureBuilder()
  //         .withPopularNetworks()
  //         .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountOneImportedHdAccountOneQrAccountOneSimpleKeyPairAccount()
  //         .withProfileSyncingEnabled()
  //         .build(),
  //       restartDevice: true,
  //     },
  //     async () => {
  //       await loginToApp();

  //       await Assertions.checkIfVisible(WalletView.container);
  //       // Measure time to navigate to account list
  //       const navigationStartTime = Date.now();

  //       await WalletView.tapIdenticon();

  //       // Re-enable sync and check if account list is visible
  //       await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
  //       console.log('✅ Account list became visible');

  //       const navigationEndTime = Date.now();
  //       const navigationTime = navigationEndTime - navigationStartTime;
  //       console.log(`⏱️ Navigation time: ${navigationTime}ms`);

  //       // Measure time for account list to fully render and become interactive
  //       const renderStartTime = Date.now();
  //       console.log('🎨 Starting render timing...');

  //       // Wait for accounts to be fully loaded

  //       // Check if all accounts are loaded
  //       await Assertions.checkIfTextIsDisplayed('Account 1');

  //       const renderEndTime = Date.now();
  //       const renderTime = renderEndTime - renderStartTime;

  //       // Log performance metrics
  //       console.log('========== ACCOUNT LIST LOAD TESTING RESULTS ==========');
  //       console.log(`Navigation to account list: ${navigationTime}ms`);
  //       console.log(`Account list render time: ${renderTime}ms`);
  //       console.log(`Total time: ${navigationTime + renderTime}ms`);
  //       console.log('======================================================');

  //       // Performance assertions with warnings
  //       if (
  //         navigationTime > PERFORMANCE_THRESHOLDS.NAVIGATION_TO_ACCOUNT_LIST
  //       ) {
  //         console.warn(
  //           `⚠️  PERFORMANCE WARNING: Navigation time (${navigationTime}ms) exceeded threshold (${PERFORMANCE_THRESHOLDS.NAVIGATION_TO_ACCOUNT_LIST}ms)`,
  //         );
  //       }

  //       if (renderTime > PERFORMANCE_THRESHOLDS.ACCOUNT_LIST_RENDER) {
  //         console.warn(
  //           `⚠️  PERFORMANCE WARNING: Render time (${renderTime}ms) exceeded threshold (${PERFORMANCE_THRESHOLDS.ACCOUNT_LIST_RENDER}ms)`,
  //         );
  //       }

  //       // Quality gate: Fail test if performance is unacceptable
  //       const totalTime = navigationTime + renderTime;
  //       const maxAcceptableTime =
  //         PERFORMANCE_THRESHOLDS.NAVIGATION_TO_ACCOUNT_LIST +
  //         PERFORMANCE_THRESHOLDS.ACCOUNT_LIST_RENDER;

  //       if (totalTime > maxAcceptableTime) {
  //         throw new Error(
  //           `Performance test failed: Total time (${totalTime}ms) exceeded maximum acceptable time (${maxAcceptableTime}ms)`,
  //         );
  //       }

  //       console.log('✅ Performance test passed!');

  //       await AccountListBottomSheet.swipeToDismissAccountsModal();
  //     },
  //   );
  // });

  // createUserProfileTests('handle account list performance with heavy token load w/profile syncing', async (_userState) => {
  //   // Create a large number of test tokens to stress test the system
  //   const heavyTokenLoad = [];
  //   for (let i = 1; i <= 50; i++) {
  //     // 50 tokens for stress testing
  //     heavyTokenLoad.push({
  //       address: toChecksumAddress(`0xabcd${i.toString().padStart(36, '0')}`),
  //       symbol: `HEAVY${i}`,
  //       decimals: 18,
  //       name: `Heavy Load Token ${i}`,
  //     });
  //   }

  //   const HEAVY_LOAD_THRESHOLDS =
  //     device.getPlatform() === 'android'
  //       ? {
  //           ACCOUNT_LIST_RENDER: 35000, // Allow more time for heavy load
  //           NAVIGATION_TO_ACCOUNT_LIST: 2500, // Allow more time for heavy load
  //         }
  //       : {
  //           ACCOUNT_LIST_RENDER: 8000, // Allow more time for heavy load
  //           NAVIGATION_TO_ACCOUNT_LIST: 3000,
  //         };

  //   await withFixtures(
  //     {
  //       fixture: new FixtureBuilder()
  //         .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
  //         .withProfileSyncingEnabled()
  //         .withTokens(heavyTokenLoad)
  //         .build(),
  //       restartDevice: true,
  //     },
  //     async () => {
  //       await loginToApp();

  //       console.log('Starting heavy load test with 50 tokens...');

  //       const startTime = Date.now();
  //       await WalletView.tapIdenticon();
  //       await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
  //       const endTime = Date.now();

  //       const totalTime = endTime - startTime;

  //       console.log('========== HEAVY LOAD TEST RESULTS ==========');
  //       console.log(`Configuration: 16 accounts, popular networks, 50 tokens`);
  //       console.log(`Total time to render account list: ${totalTime}ms`);
  //       console.log('=============================================');

  //       // Quality gate for heavy load
  //       const maxHeavyLoadTime =
  //         HEAVY_LOAD_THRESHOLDS.NAVIGATION_TO_ACCOUNT_LIST +
  //         HEAVY_LOAD_THRESHOLDS.ACCOUNT_LIST_RENDER;
  //       if (totalTime > maxHeavyLoadTime) {
  //         throw new Error(
  //           `Heavy load test failed: Total time (${totalTime}ms) exceeded maximum acceptable time (${maxHeavyLoadTime}ms)`,
  //         );
  //       }

  //       console.log('✅ Heavy load test passed!');
  //       await AccountListBottomSheet.swipeToDismissAccountsModal();
  //     },
  //   );
  // });

  // createUserProfileTests('handle network list performance with heavy token load + all popular networks w/profile syncing', async (_userState) => {
  //   // Create a large number of test tokens to stress test the system
  //   const heavyTokenLoad = [];
  //   for (let i = 1; i <= 50; i++) {
  //     // 50 tokens for stress testing
  //     heavyTokenLoad.push({
  //       address: toChecksumAddress(`0xabcd${i.toString().padStart(36, '0')}`),
  //       symbol: `HEAVY${i}`,
  //       decimals: 18,
  //       name: `Heavy Load Token ${i}`,
  //     });
  //   }

  //   const HEAVY_LOAD_THRESHOLDS =
  //     device.getPlatform() === 'android'
  //       ? {
  //           ACCOUNT_LIST_RENDER: 35000, // Allow more time for heavy load
  //           NAVIGATION_TO_ACCOUNT_LIST: 2500, // Allow more time for heavy load
  //         }
  //       : {
  //           ACCOUNT_LIST_RENDER: 8000, // Allow more time for heavy load
  //           NAVIGATION_TO_ACCOUNT_LIST: 3000,
  //         };

  //   await withFixtures(
  //     {
  //       fixture: new FixtureBuilder()
  //         .withPopularNetworks()
  //         .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
  //         .withProfileSyncingEnabled()
  //         .withTokens(heavyTokenLoad)
  //         .build(),
  //       restartDevice: true,
  //     },
  //     async () => {
  //       await loginToApp();

  //       console.log(
  //         'Starting heavy load test with 50 tokens + all popular networks...',
  //       );
  //       await WalletView.tapTokenNetworkFilter();
  //       await WalletView.tapTokenNetworkFilterAll();

  //       const startTime = Date.now();
  //       await WalletView.tapNetworksButtonOnNavBar();

  //       const endTime = Date.now();
  //       await Assertions.checkIfVisible(NetworkListModal.networkScroll);

  //       const totalTime = endTime - startTime;

  //       console.log('========== HEAVY LOAD TEST RESULTS ==========');
  //       console.log(`Configuration: 16 accounts, popular networks, 50 tokens`);
  //       console.log(`Total time to render network list: ${totalTime}ms`);
  //       console.log('=============================================');

  //       // Quality gate for heavy load
  //       const maxHeavyLoadTime =
  //         HEAVY_LOAD_THRESHOLDS.NAVIGATION_TO_ACCOUNT_LIST +
  //         HEAVY_LOAD_THRESHOLDS.ACCOUNT_LIST_RENDER;
  //       if (totalTime > maxHeavyLoadTime) {
  //         throw new Error(
  //           `Heavy load test failed: Total time (${totalTime}ms) exceeded maximum acceptable time (${maxHeavyLoadTime}ms)`,
  //         );
  //       }
  //       await NetworkListModal.changeNetworkTo('BNB Smart Chain');
  //       await NetworkEducationModal.tapGotItButton();
  //       const secondstartTime = Date.now();
  //       await WalletView.tapNetworksButtonOnNavBar();

  //       const secondEndTime = Date.now();
  //       await Assertions.checkIfVisible(NetworkListModal.networkScroll);

  //       const secondTotalTime = secondEndTime - secondstartTime;

  //       console.log('========== HEAVY LOAD TEST RESULTS ==========');
  //       console.log(
  //         `Configuration: 16 accounts, switching between long network list, 50 tokens`,
  //       );
  //       console.log(
  //         `Total time to render network list after switching networks: ${secondTotalTime}ms`,
  //       );
  //       console.log('=============================================');

  //       // Quality gate for heavy load
  //       const SecondmaxHeavyLoadTime =
  //         HEAVY_LOAD_THRESHOLDS.NAVIGATION_TO_ACCOUNT_LIST +
  //         HEAVY_LOAD_THRESHOLDS.ACCOUNT_LIST_RENDER;
  //       if (secondTotalTime > SecondmaxHeavyLoadTime) {
  //         throw new Error(
  //           `Heavy load test failed: Total time (${secondTotalTime}ms) exceeded maximum acceptable time (${SecondmaxHeavyLoadTime}ms)`,
  //         );
  //       }

  //       console.log('✅ Heavy load test passed!');
  //       // await AccountListBottomSheet.swipeToDismissAccountsModal();
  //     },
  //   );
  // });

  createUserProfileTests(
    'render account list efficiently with multiple accounts and networks (profile syncing disabled)',
    async (userState) => {
      // Platform-specific performance thresholds (in milliseconds)
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
        `Running performance test on ${device
          .getPlatform()
          .toUpperCase()} (Profile Syncing Disabled)`,
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
          console.warn(
            `👤 User Profile: ${
              userState ? 'PROFILE_SYNCING_DISABLED' : 'UNKNOWN'
            }`,
          );
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
  );

  createUserProfileTests(
    'handle account list performance with heavy token load (profile syncing disabled)',
    async (userState) => {
      // Create a large number of test tokens to stress test the system
      const heavyTokenLoad = [];
      for (let i = 1; i <= 50; i++) {
        // 50 tokens for stress testing
        heavyTokenLoad.push({
          address: toChecksumAddress(`0xabcd${i.toString().padStart(36, '0')}`),
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

          console.log(
            'Starting heavy load test with 50 tokens (Profile Syncing Disabled)...',
          );

          await WalletView.tapIdenticon();
          await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
          console.log('✅ Account list became visible');

          const startTime = Date.now();
          await AccountListBottomSheet.tapAccountByName('Account 3');
          await Assertions.checkIfNotVisible(
            AccountListBottomSheet.accountList,
          );
          const endTime = Date.now();
          const totalTime = endTime - startTime;

          console.log(
            '========== HEAVY LOAD TEST RESULTS (PROFILE SYNCING DISABLED) ==========',
          );
          console.log(
            `Configuration: 11 accounts, popular networks, 50 tokens`,
          );
          console.log(`Total time to render account list: ${totalTime}ms`);
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
            navigationTime: 0, // No navigation in this specific test
            renderTime: totalTime,
            thresholds: {
              navigation: 0,
              render: maxHeavyLoadTime,
              total: maxHeavyLoadTime,
            },
          };
        },
      );

      return result;
    },
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
            .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController() // Minimal 2 accounts
            .withTokens(minimalTokens)
            .withTokensRates(minimalTokens)
            .withTokensBalances(minimalTokens)
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();

          console.log('Starting baseline test with minimal load...');

          const startTime = Date.now();
          await WalletView.tapIdenticon();
          await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
          const endTime = Date.now();

          const totalTime = endTime - startTime;

          console.log('========== BASELINE TEST RESULTS ==========');
          console.log(`Configuration: 2 accounts, default network, 2 tokens`);
          console.log(`Total time to render account list: ${totalTime}ms`);
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
            navigationTime: 0, // No navigation in this specific test
            renderTime: totalTime,
            thresholds: {
              navigation: 0,
              render: 3000, // Baseline threshold
              total: 3000,
            },
          };
        },
      );

      return result;
    },
  );
});
