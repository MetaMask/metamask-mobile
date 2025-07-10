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

describe(SmokePerformance('Switching Accounts to Dismiss Load Testing'), () => {
  const reporter = new PerformanceTestReporter('Switching Accounts to Dismiss Load Testing');

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
            DISMISS_ACCOUNT_LIST: 2.5, // 2.5 seconds max for Android
          }
        : {
            DISMISS_ACCOUNT_LIST: 1.5, // 1.5 seconds max for iOS
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
            await Assertions.checkIfVisible(AccountListBottomSheet.accountList);

            console.log('Account list became visible');

            await AccountListBottomSheet.tapAccountByName('Account 3');
            const startTime = Date.now();
            await Assertions.checkIfNotVisible(
              AccountListBottomSheet.accountList,
            );
            const endTime = Date.now();
            console.log('Account list is not visible');

            const dismissTime = endTime - startTime;

            // Baseline should be very fast
            if (dismissTime > PERFORMANCE_THRESHOLDS.DISMISS_ACCOUNT_LIST) {
              console.warn(
                `⚠️  BASELINE WARNING: Account dismissal took ${dismissTime}ms`,
              );
            }

            console.log('Account dismissal test completed!');
            console.log('📊 Performance metrics: No navigation/render time measured for this test type');

            result = {
              navigationTime: -1, // Indicates no navigation time measured
              renderTime: -1, // Indicates no render time measured
              totalTime: dismissTime,
              thresholds: {
                navigation: -1,
                render: -1,
                total: PERFORMANCE_THRESHOLDS.DISMISS_ACCOUNT_LIST, // 3 seconds threshold
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
