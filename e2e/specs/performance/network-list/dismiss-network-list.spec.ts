/* eslint-disable no-console, import/no-nodejs-modules */
import { loginToApp } from '../../../viewHelper';
import { SmokePerformance } from '../../../tags';
import WalletView from '../../../pages/wallet/WalletView';
import Assertions from '../../../utils/Assertions';
import TestHelpers from '../../../helpers';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import { withFixtures } from '../../../fixtures/fixture-helper';
import NetworkListModal from '../../../pages/Network/NetworkListModal';
import { CORE_USER_STATE, POWER_USER_STATE } from '../../../fixtures/constants';
import {
  PerformanceTestReporter,
  createUserProfileTests,
  type TestResult,
} from '../../../utils/PerformanceTestReporter';

describe(SmokePerformance('Network List Load Testing'), () => {
  const reporter = new PerformanceTestReporter('Network List Load Testing');

  const userStates = [
    { name: 'CORE_USER', state: CORE_USER_STATE },
    { name: 'POWER_USER', state: POWER_USER_STATE },
  ];

  function registerPerformanceTests() {
    createUserProfileTests(
      'benchmark switching networks from the network list',
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
              DISMISS_NETWORK_LIST: 2500, // 2.5 seconds max for Android
            }
          : {
              DISMISS_NETWORK_LIST: 1500, // 1.5 seconds max for iOS
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

            console.log('Starting network switching test...');

            await WalletView.tapNetworksButtonOnNavBar();
            await Assertions.checkIfVisible(NetworkListModal.networkScroll);
            console.log('Network list became visible');

            const startTime = Date.now();
            await NetworkListModal.changeNetworkTo('Polygon Mainnet', false);
            await Assertions.checkIfNotVisible(NetworkListModal.networkScroll);
            const endTime = Date.now();
            console.log('Network switched and list is not visible');

            const timeToDismissNetworkList = endTime - startTime;

            // Baseline should be very fast
            if (
              timeToDismissNetworkList >
              PERFORMANCE_THRESHOLDS.DISMISS_NETWORK_LIST
            ) {
              console.warn(
                `⚠️  BASELINE WARNING: Network switching took ${timeToDismissNetworkList}ms`,
              );
            }

            console.log('Network switching test completed!');

            result = {
              totalTime: timeToDismissNetworkList,
              thresholds: {
                totalTime: PERFORMANCE_THRESHOLDS.DISMISS_NETWORK_LIST,
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
