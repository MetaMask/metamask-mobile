import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import PerpsTabView from '../../pages/Perps/PerpsTabView';
import Assertions from '../../framework/Assertions';
import PerpsOnboarding from '../../pages/Perps/PerpsOnboarding';
import PerpsMarketListView from '../../pages/Perps/PerpsMarketListView';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';

describe(
  RegressionTrade('Perps - no funds shows Start Trading and tutorial'),
  () => {
    beforeEach(async () => {
      jest.setTimeout(150000);
    });

    it.skip('should show Start Trading on Perps tab and then tutorial screens', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPerpsProfile('no-funds')
            .withPerpsFirstTimeUser(true)
            .build(),
          restartDevice: true,
          // Ensure Hyperliquid icons and Arbitrum RPC are mocked (no live requests)
          testSpecificMock: PERPS_ARBITRUM_MOCKS,
        },
        async () => {
          await loginToApp();

          // Go to Perps tab from Wallet
          await WalletView.tapOnPerpsTab();

          // Start Trading should be present for first-time/no-funds
          await PerpsTabView.tapOnboardingButton();

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
