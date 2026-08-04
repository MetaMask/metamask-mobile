import { Mockttp } from 'mockttp';
import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import { SmokeConfirmations } from '../../../tags.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import { Assertions, Matchers, Gestures } from '../../../framework/index.js';
import WalletView from '../../../page-objects/wallet/WalletView.js';
import PerpsHomeView from '../../../page-objects/Perps/PerpsHomeView.js';
import TransactionPayConfirmation from '../../../page-objects/Confirmation/TransactionPayConfirmation.js';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions.js';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent.js';
import ActivitiesView from '../../../page-objects/Transactions/ActivitiesView.js';
import ActivityDetails from '../../../page-objects/Transactions/ActivityDetails.js';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { perpsDepositFlags } from '../../../api-mocking/mock-responses/pay/feature-flag-mocks.js';
import { PERPS_DEPOSIT_MOCKS } from '../../../api-mocking/mock-responses/pay/perps-deposit-mocks.js';
import { PerpsMarketBalanceActionsSelectorsIDs } from '../../../../app/components/UI/Perps/Perps.testIds.js';

appiumTest.describe(SmokeConfirmations('MM Pay - Perps deposit'), () => {
  appiumTest.describe.configure({ timeout: 2500000 });

  appiumTest(
    'deposits $80, verifies the MM Pay quote, confirms the transaction, and sees it in perps activity',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPerpsProfile('no-positions')
            .withPerpsFirstTimeUser(false)
            .withAccountTreeController()
            .withKeyringControllerOfMultipleAccounts()
            .withNetworkController({
              type: 'rpc',
              chainId: '0xa4b1',
              rpcUrl: 'https://arb1.arbitrum.io/rpc',
              nickname: 'Arbitrum One',
              ticker: 'ETH',
            })
            .withTokensForAllPopularNetworks([
              {
                address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
                symbol: 'USDC',
                decimals: 6,
                name: 'USD Coin',
                type: 'erc20',
              },
            ])
            .withTokens(
              [
                {
                  address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                  symbol: 'USDC',
                  decimals: 6,
                  name: 'USD Coin',
                  type: 'erc20',
                },
              ],
              '0xa4b1',
              '0xbacec2e26c5c794de6e82a1a7e21b9c329fa8cf6',
            )
            .build(),
          currentDeviceDetails,
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(mockServer, perpsDepositFlags());
            await PERPS_DEPOSIT_MOCKS(mockServer);
          },
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await WalletView.scrollAndTapPerpsSection();
          await PerpsHomeView.tapExploreCryptoIfVisible();

          const addFundsButton = Matchers.getElementByID(
            PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON,
          );
          await Gestures.waitAndTap(addFundsButton, {
            elemDescription: 'Add Funds button',
          });

          await TransactionPayConfirmation.expectAmountScreenLoaded();
          await TransactionPayConfirmation.enterAmountAndContinue('80');

          await TransactionPayConfirmation.verifyTransactionFeeVisible();

          await FooterActions.tapConfirmButton();

          await Assertions.expectElementToNotBeVisible(
            FooterActions.confirmButton,
            {
              timeout: 25000,
              description: 'Wait for confirmation to process',
            },
          );

          await PerpsHomeView.tapBackHomeButton();
          await TabBarComponent.tapActivity();

          await ActivitiesView.tapTypeFilterChip();
          await ActivitiesView.selectTypeFilterOptionSafe('perps');

          await ActivitiesView.tapPerpsFilterChip();
          await ActivitiesView.selectPerpsFilterOptionSafe('deposit');

          await ActivitiesView.verifyActivityItemLabelAndAmount(
            'Account funded',
            '+$80',
          );

          await ActivitiesView.tapOnActivityItemByLabel('Account funded');

          await Assertions.expectElementToBeVisible(ActivityDetails.screen, {
            description: 'Activity details screen should be visible',
          });

          await ActivityDetails.verifyStatus('Confirmed');
        },
      );
    },
  );
});
