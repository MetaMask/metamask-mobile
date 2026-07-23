import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import FundActionMenu from '../../page-objects/UI/FundActionMenu.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { CustomNetworks } from '../../resources/networks.e2e.js';
import { SmokeMoney } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import BuildQuoteView from '../../page-objects/Ramps/BuildQuoteView.js';
import OrderDetailsView from '../../page-objects/Ramps/OrderDetailsView.js';
import TokenSelectScreen from '../../page-objects/Ramps/TokenSelectScreen.js';
import { RampsRegions, RampsRegionsEnum } from '../../framework/Constants.js';
import { Mockttp } from 'mockttp';
import {
  setupDepositOnRampMocks,
  setupBuyOnRampMocks,
} from '../../api-mocking/mock-responses/ramps/ramps-mocks.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { ONRAMP_PERSONA } from '../../api-mocking/mock-responses/ramps/onramp-persona-data.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView.js';
import KYCScreen from '../../page-objects/Ramps/KYCScreen.js';
import {
  onrampNewUserDepositExpectations,
  onrampReturningUserBuyExpectations,
} from '../../helpers/analytics/expectations/onramp-unified-buy.analytics.js';

const selectedRegion = RampsRegions[RampsRegionsEnum.UNITED_STATES];

const newUserUnifiedBuyV2Mocks = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    depositConfig: {
      active: true,
      providerApiKey: 'DUMMY_VALUE_FOR_TESTING',
      entrypoints: { walletActions: true },
      minimumVersion: '1.0.0',
    },
  });
  await setupDepositOnRampMocks(mockServer, selectedRegion);
};

const returningUserUnifiedBuyV2Mocks = async (mockServer: Mockttp) => {
  await setupBuyOnRampMocks(mockServer, selectedRegion);
};

// Deposit order mock (ramps-deposit-order-status-response) returns USD; UI shows $ + formatFiatValue
const nativeDepositOrder = {
  token: 'ETH',
  tokenAmount: '0.02455',
  totalFiat: '$100.00',
  feesFiat: '$23.33',
  quoteDisplayAmount: '100 USD',
  provider: 'Transak (Staging)',
};

const aggregatorBuyOrder = {
  token: 'ETH',
  tokenAmount: '0.00355',
  totalFiat: '$15.00',
  feesFiat: '$3.50',
  quoteDisplayAmount: '$15.00',
  provider: 'Transak (Staging)',
};

appiumTest.describe(SmokeMoney('Onramp Unified Buy'), () => {
  appiumTest.describe.configure({ timeout: 180000 });

  appiumTest(
    'New user native flow: Places ETH DEPOSIT order through Transak',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withNetworkController(
              CustomNetworks.Tenderly.Mainnet.providerConfig,
            )
            .withRampsSelectedRegion(selectedRegion)
            .withMetaMetricsOptIn()
            .build(),
          restartDevice: true,
          testSpecificMock: newUserUnifiedBuyV2Mocks,
          analyticsExpectations: onrampNewUserDepositExpectations,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await WalletView.tapWalletBuyButton();
          await FundActionMenu.tapUnifiedBuyButton();
          await TokenSelectScreen.tapTokenByName(nativeDepositOrder.token);

          await BuildQuoteView.tapContinueButton();

          await KYCScreen.tapVerifyIdentityContinueButton();

          await KYCScreen.enterEmail(ONRAMP_PERSONA.email);

          await Assertions.expectElementToBeVisible(KYCScreen.otpScreen, {
            description: 'OTP code screen is visible before entering code',
          });

          await KYCScreen.enterOtpCode('000000');

          // Verify order details screen
          await Assertions.expectElementToBeVisible(
            OrderDetailsView.container,
            {
              elemDescription: 'ramps order confirmation screen',
            },
          );
          await Assertions.expectElementToHaveText(
            OrderDetailsView.tokenAmount,
            `${nativeDepositOrder.tokenAmount} ${nativeDepositOrder.token}`,
          );

          for (const text of [
            nativeDepositOrder.totalFiat,
            nativeDepositOrder.feesFiat,
          ]) {
            await Assertions.expectTextDisplayed(text);
          }

          await OrderDetailsView.tapCloseButton();

          // Verify order in transfers list
          await TabBarComponent.tapActivity();
          await ActivitiesView.tapOnTransfersTab();

          await Assertions.expectTextDisplayed(
            `${nativeDepositOrder.tokenAmount} ${nativeDepositOrder.token}`,
          );
          await ActivitiesView.tapRampsOrder('deposit', 1);

          for (const text of [
            `${nativeDepositOrder.tokenAmount} ${nativeDepositOrder.token}`,
            nativeDepositOrder.totalFiat,
          ]) {
            await Assertions.expectTextDisplayed(text);
          }
        },
      );
    },
  );

  appiumTest(
    'Returning User Aggregator Flow: Places ETH BUY order',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withNetworkController(
              CustomNetworks.Tenderly.Mainnet.providerConfig,
            )
            .withRampsSelectedRegion(selectedRegion)
            .withMetaMetricsOptIn()
            .build(),
          restartDevice: true,
          testSpecificMock: returningUserUnifiedBuyV2Mocks,
          analyticsExpectations: onrampReturningUserBuyExpectations,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await WalletView.tapWalletBuyButton();
          await FundActionMenu.tapUnifiedBuyButton();
          await TokenSelectScreen.tapTokenByName(aggregatorBuyOrder.token);
          await BuildQuoteView.tapKeypadDeleteButton(1);
          await BuildQuoteView.enterAmount('15', 'unifiedBuy');

          await BuildQuoteView.tapContinueButton();

          // Verify order details screen
          await Assertions.expectElementToBeVisible(
            OrderDetailsView.container,
            {
              elemDescription: 'ramps order confirmation screen',
            },
          );
          await Assertions.expectElementToHaveText(
            OrderDetailsView.tokenAmount,
            `${aggregatorBuyOrder.tokenAmount} ${aggregatorBuyOrder.token}`,
          );

          for (const text of [
            aggregatorBuyOrder.totalFiat,
            aggregatorBuyOrder.feesFiat,
          ]) {
            await Assertions.expectTextDisplayed(text);
          }

          await OrderDetailsView.tapCloseButton();

          // Verify order in transfers list
          await TabBarComponent.tapActivity();
          await ActivitiesView.tapOnTransfersTab();

          await Assertions.expectTextDisplayed(
            `${aggregatorBuyOrder.tokenAmount} ${aggregatorBuyOrder.token}`,
          );
          await ActivitiesView.tapRampsOrder('buy', 1);

          for (const text of [
            `${aggregatorBuyOrder.tokenAmount} ${aggregatorBuyOrder.token}`,
            aggregatorBuyOrder.totalFiat,
          ]) {
            await Assertions.expectTextDisplayed(text);
          }
        },
      );
    },
  );
});
