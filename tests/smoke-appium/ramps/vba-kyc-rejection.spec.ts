import type { Mockttp } from 'mockttp';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { Assertions } from '../../framework/index.js';
import { SmokeMoney } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import {
  VBA_ENTRY_POINTS,
  countVbaKycProviderRequests,
  leaveVbaStatusToMoneyHome,
  openMoneyHome,
  openVbaFromEntryPoint,
} from '../../flows/vba-kyc.flow.js';
import VbaKycStatusView from '../../page-objects/Ramps/VbaKycStatusView.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { waitForProxiedRequestsMatching } from '../../api-mocking/helpers/mockHelpers.js';
import { moneyAccountDepositFlags } from '../../api-mocking/mock-responses/pay/feature-flag-mocks.js';
import { mockMoneyAccountApis } from '../../api-mocking/mock-responses/pay/money-account-deposit-mocks.js';
import {
  MONEY_MOVEMENT_NEOBANK_BR_FLAG,
  VBA_KYC_EMAIL,
  VBA_KYC_JOURNEY_PATH,
  buildVbaKycSessionStatus,
  setupVbaKycMocks,
  type VbaKycScenario,
} from '../../api-mocking/mock-responses/ramps/vba-kyc-mocks.js';

const RE_ENTRIES_PER_ENTRY_POINT = 2;

const buildVbaKycFixture = (scenario: VbaKycScenario) =>
  new FixtureBuilder()
    .withDetectedGeolocation('BR')
    .withCompletedOnboardingStepper('money-home-onboarding-stepper', 2)
    .withVbaKycSession(buildVbaKycSessionStatus(scenario), VBA_KYC_EMAIL)
    .build();

const vbaKycMocks =
  (scenario: VbaKycScenario) => async (mockServer: Mockttp) => {
    await setupRemoteFeatureFlagsMock(mockServer, {
      ...moneyAccountDepositFlags(),
      ...MONEY_MOVEMENT_NEOBANK_BR_FLAG,
    });
    await mockMoneyAccountApis(mockServer);
    await setupVbaKycMocks(mockServer, scenario);
  };

const requireMockServer = (mockServer?: Mockttp): Mockttp => {
  if (!mockServer) {
    throw new Error('Mock server is not defined, check testSpecificMock setup');
  }
  return mockServer;
};

appiumTest.describe(SmokeMoney('VBA KYC rejection'), () => {
  appiumTest.describe.configure({ timeout: 420_000 });

  appiumTest(
    'shows Contact support on every re-entry of a rejected session without requesting a SumSub token',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildVbaKycFixture('rejected'),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: vbaKycMocks('rejected'),
        },
        async ({ mockServer }) => {
          const server = requireMockServer(mockServer);
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await openMoneyHome();

          for (const entryPoint of VBA_ENTRY_POINTS) {
            for (
              let attempt = 1;
              attempt <= RE_ENTRIES_PER_ENTRY_POINT;
              attempt += 1
            ) {
              await openVbaFromEntryPoint(entryPoint);
              await VbaKycStatusView.expectTerminalRejectionScreen();
              await leaveVbaStatusToMoneyHome();
            }
          }

          await Assertions.checkIfObjectsMatch(
            await countVbaKycProviderRequests(server),
            { journey: 0, sessionCreate: 0 },
          );
        },
      );
    },
  );

  appiumTest(
    'opens support consent from Contact support on a rejected session without launching SumSub',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildVbaKycFixture('rejected'),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: vbaKycMocks('rejected'),
        },
        async ({ mockServer }) => {
          const server = requireMockServer(mockServer);
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await openMoneyHome();

          await openVbaFromEntryPoint('add-money-bank-account');
          await VbaKycStatusView.expectTerminalRejectionScreen();
          await VbaKycStatusView.tapContactSupport();
          await VbaKycStatusView.expectSupportConsentVisible();
          await VbaKycStatusView.dismissSupportConsent();
          await VbaKycStatusView.expectTerminalRejectionScreen();

          await Assertions.checkIfObjectsMatch(
            await countVbaKycProviderRequests(server),
            { journey: 0, sessionCreate: 0 },
          );
        },
      );
    },
  );

  appiumTest(
    'relaunches SumSub once from Try again on a retry session',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildVbaKycFixture('retry'),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: vbaKycMocks('retry'),
        },
        async ({ mockServer }) => {
          const server = requireMockServer(mockServer);
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await openMoneyHome();

          await openVbaFromEntryPoint('money-home-kyc-card');
          await VbaKycStatusView.expectRetryScreen();
          await Assertions.checkIfObjectsMatch(
            await countVbaKycProviderRequests(server),
            { journey: 0, sessionCreate: 0 },
          );

          await VbaKycStatusView.tapRetry();
          await waitForProxiedRequestsMatching(
            server,
            { method: 'POST', urlSubstring: VBA_KYC_JOURNEY_PATH },
            { description: 'SumSub applicant token requested after Try again' },
          );
          await VbaKycStatusView.expectSumSubHostLaunching();

          await Assertions.checkIfObjectsMatch(
            await countVbaKycProviderRequests(server),
            { journey: 1, sessionCreate: 0 },
          );
        },
      );
    },
  );
});
