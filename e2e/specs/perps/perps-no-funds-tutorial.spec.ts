import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../framework/Assertions';
import PerpsOnboarding from '../../pages/Perps/PerpsOnboarding';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';

describe(
  RegressionTrade('Perps - no funds shows Start Trading and tutorial'),
  () => {
    beforeEach(async () => {
      jest.setTimeout(150000);
    });

    it('should show Start Trading on Perps tab and then tutorial screens', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPerpsProfile('no-funds')
            .withPerpsFirstTimeUser(true)
            .build(),
          restartDevice: true,
          testSpecificMock: PERPS_ARBITRUM_MOCKS,
        },
        async () => {
          await loginToApp();

          // Go to Perps tab from Wallet
          await TabBarComponent.tapTrade();
          await WalletActionsBottomSheet.tapPerpsButton();

          await PerpsOnboarding.tapContinueButton();
          await PerpsOnboarding.tapContinueButton();
          await PerpsOnboarding.tapContinueButton();
          await PerpsOnboarding.tapContinueButton();
          await PerpsOnboarding.tapContinueButton();

          await PerpsOnboarding.tapSkipButton();

          // After skipping tutorial, user should land on markets screen
          await Assertions.expectElementToBeVisible(
            PerpsMarketListView.listHeader as DetoxElement,
            {
              description:
                'Perps market list header visible after skipping tutorial',
            },
          );
        },
      );
    });
  },
);
