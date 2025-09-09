import { loginToApp } from '../../../viewHelper';
import { SmokePerformance } from '../../../tags';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../framework/Assertions';
import TestHelpers from '../../../helpers';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
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

describe(SmokePerformance('Switching Accounts to Dismiss Load Testing'), () => {
  const reporter = new PerformanceTestReporter(
    'Switching Accounts to Dismiss Load Testing',
  );

  const userStates = [
    { name: 'CORE_USER', state: CORE_USER_STATE },
    { name: 'POWER_USER', state: POWER_USER_STATE },
  ];

  function registerPerformanceTests() {
    createUserProfileTests(
      'benchmark switching accounts from the account list',
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
        const isAndroid = device.getPlatform() === 'android';

        const PERFORMANCE_THRESHOLDS = isAndroid
          ? {
              DISMISS_ACCOUNT_LIST: 4000, // 4 seconds max for Android
            }
          : {
              DISMISS_ACCOUNT_LIST: 4000, // 4 seconds max for iOS
            };

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

            await WalletView.tapIdenticon();
            await Assertions.expectElementToBeVisible(
              AccountListBottomSheet.accountList,
            );

            console.log('Account list became visible');
            const startTime = Date.now();
            await AccountListBottomSheet.tapAccountByName('Account 3');

            await Assertions.expectElementToNotBeVisible(
              AccountListBottomSheet.accountList,
            );
            const endTime = Date.now();
            console.log('Account list is not visible');

            const dismissTime = endTime - startTime;

            // Baseline should be very fast
            if (dismissTime > PERFORMANCE_THRESHOLDS.DISMISS_ACCOUNT_LIST) {
              console.warn(
                `Baseline test failed: Account dismissal took ${dismissTime}ms, which exceeded the maximum acceptable time (${PERFORMANCE_THRESHOLDS.DISMISS_ACCOUNT_LIST}ms)`,
              );
            }

            console.log('Account dismissal test completed!');
            console.log(
              '📊 Performance metrics: No navigation/render time measured for this test type',
            );

            result = {
              totalTime: dismissTime,
              thresholds: {
                totalTime: PERFORMANCE_THRESHOLDS.DISMISS_ACCOUNT_LIST,
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
