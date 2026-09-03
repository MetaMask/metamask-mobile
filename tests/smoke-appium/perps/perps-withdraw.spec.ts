import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePerps } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { openPerpsWithdrawPayConfirmation } from '../../flows/perps.flow.js';
import {
  PERPS_ARBITRUM_MOCKS,
  mockPerpsGeolocation,
} from '../../api-mocking/mock-responses/perps-arbitrum-mocks.js';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants.js';
import TransactionPayConfirmation from '../../page-objects/Confirmation/TransactionPayConfirmation.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { Mockttp } from 'mockttp';
import {
  beginPerpsSmokeTestPlaywright,
  buildPerpsSmokeFixture,
  PERPS_SMOKE_PERMISSIONS,
} from '../../helpers/perps/perps-smoke-helpers.js';

const ENABLE_PERPS_WITHDRAW_ANY_TOKEN = {
  confirmations_pay_post_quote: {
    default: { enabled: true, tokens: {} },
    overrides: {
      perpsWithdraw: {
        enabled: true,
        tokens: {
          '0xa4b1': [
            '0x0000000000000000000000000000000000000000',
            '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          ],
        },
      },
    },
  },
};

const setupPerpsWithdrawMocks = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    ENABLE_PERPS_WITHDRAW_ANY_TOKEN,
  );
  await PERPS_ARBITRUM_MOCKS(mockServer);
  await mockPerpsGeolocation(mockServer, RampsRegions[RampsRegionsEnum.SPAIN]);
};

appiumTest.describe(
  SmokePerps('Perps - Withdraw to any token (MetaMask Pay)'),
  () => {
    appiumTest(
      'reaches the MetaMask Pay withdraw confirmation',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: buildPerpsSmokeFixture(),
            restartDevice: true,
            currentDeviceDetails,
            permissions: PERPS_SMOKE_PERMISSIONS,
            testSpecificMock: setupPerpsWithdrawMocks,
          },
          async () => {
            await beginPerpsSmokeTestPlaywright();
            await openPerpsWithdrawPayConfirmation();
            await TransactionPayConfirmation.verifyAvailableBalanceVisible();
          },
        );
      },
    );
  },
);
