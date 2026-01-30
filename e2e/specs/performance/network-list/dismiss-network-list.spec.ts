import { loginToApp } from '../../../viewHelper';
import { SmokePerformance } from '../../../tags';
import WalletView from '../../../pages/wallet/WalletView';
import Assertions from '../../../../tests/framework/Assertions';
import TestHelpers from '../../../helpers';
import FixtureBuilder from '../../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../tests/framework/fixtures/FixtureHelper';
import NetworkManager from '../../../pages/wallet/NetworkManager';
import {
  CORE_USER_STATE,
  POWER_USER_STATE,
} from '../../../../tests/framework/fixtures/constants';
import {
  PerformanceTestReporter,
  createUserProfileTests,
  type TestResult,
} from '../../../utils/PerformanceTestReporter';
import { NetworkToCaipChainId } from '../../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';

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

            await WalletView.tapTokenNetworkFilter();
            await Assertions.expectElementToBeVisible(
              NetworkManager.popularNetworksContainer,
            );
            console.log('Network list became visible');

            const startTime = Date.now();
            await NetworkManager.tapNetwork(NetworkToCaipChainId.POLYGON);
            await Assertions.expectElementToNotBeVisible(
              NetworkManager.popularNetworksContainer,
            );
            const endTime = Date.now();
            console.log('Network switched and list is not visible');

            const timeToDismissNetworkList = endTime - startTime;

            result = {
              totalTime: timeToDismissNetworkList,
              thresholds: {
                totalTime: PERFORMANCE_THRESHOLDS.DISMISS_NETWORK_LIST,
              },
            };

            // Baseline should be very fast
            if (
              timeToDismissNetworkList >
              PERFORMANCE_THRESHOLDS.DISMISS_NETWORK_LIST
            ) {
              console.warn(
                `Network switching test failed: Total time (${timeToDismissNetworkList}ms) exceeded maximum acceptable time (${PERFORMANCE_THRESHOLDS.DISMISS_NETWORK_LIST}ms)`,
                result,
              );
            }

            console.log('Network switching test completed!');
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
