import { Mockttp } from 'mockttp';
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
import { setupRevolutBuyOnRampMocks } from '../../api-mocking/mock-responses/ramps/ramps-mocks.js';
import {
  REVOLUT_CRYPTO_AMOUNT,
  REVOLUT_PROVIDER_NAME,
  REVOLUT_RETURN_DEEPLINK,
} from '../../api-mocking/mock-responses/ramps/responses/ramps-revolut-response.js';
import { openE2EUrl } from '../../framework/DeepLink.js';

const selectedRegion = RampsRegions[RampsRegionsEnum.UNITED_STATES];

const revolutBuyMocks = async (mockServer: Mockttp) => {
  await setupRevolutBuyOnRampMocks(mockServer, selectedRegion);
};

appiumTest.describe(SmokeMoney('Onramp Revolut return'), () => {
  appiumTest.describe.configure({ timeout: 180000 });

  appiumTest(
    'opens populated order details from the Revolut return deeplink',
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
          testSpecificMock: revolutBuyMocks,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await FundActionMenu.openAndTapUnifiedBuy(() =>
            WalletView.tapWalletBuyButton(),
          );
          await TokenSelectScreen.tapTokenByName('ETH');
          await BuildQuoteView.tapKeypadDeleteButton(1);
          await BuildQuoteView.enterAmount('15', 'unifiedBuy');
          await Assertions.expectTextDisplayed(
            `Powered by ${REVOLUT_PROVIDER_NAME}`,
            {
              description: 'Build quote is using the Revolut provider',
            },
          );

          await openE2EUrl(REVOLUT_RETURN_DEEPLINK);

          await Assertions.expectElementToBeVisible(
            OrderDetailsView.container,
            {
              timeout: 20000,
              elemDescription: 'ramps order confirmation screen',
            },
          );
          await Assertions.expectElementToHaveText(
            OrderDetailsView.tokenAmount,
            `${REVOLUT_CRYPTO_AMOUNT} ETH`,
            { description: 'order crypto amount' },
          );
          await Assertions.expectElementToHaveText(
            OrderDetailsView.status,
            'Complete',
            { description: 'order status' },
          );
          await Assertions.expectElementToHaveText(
            OrderDetailsView.provider,
            `View on ${REVOLUT_PROVIDER_NAME}`,
            { description: 'order provider' },
          );
        },
      );
    },
  );
});
