import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionTrade } from '../../../e2e/tags';
import { loginToApp } from '../../../e2e/viewHelper';
import WalletView from '../../../e2e/pages/wallet/WalletView';
import PerpsTabView from '../../../e2e/pages/Perps/PerpsTabView';
import Assertions from '../../framework/Assertions';
import PerpsOnboarding from '../../../e2e/pages/Perps/PerpsOnboarding';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';

describe(
  RegressionTrade('Perps - no funds shows Start Trading and tutorial'),
  () => {
    beforeEach(async () => {
      jest.setTimeout(150000);
    });

    it('displays Start Trading on Perps tab and tutorial screens', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPerpsProfile('no-positions')
            .withPerpsFirstTimeUser(true)
            .build(),
          restartDevice: true,
          // Ensure Hyperliquid icons and Arbitrum RPC are mocked (no live requests)
          testSpecificMock: PERPS_ARBITRUM_MOCKS,
        },
        async () => {
          await loginToApp();

          // This is needed due to disable animations
          await device.disableSynchronization();

          // Go to Perps tab from Wallet
          await WalletView.tapOnPerpsTab();

          // Start Trading should be present for first-time/no-positions
          await PerpsTabView.tapOnboardingButton();

          await PerpsOnboarding.tapContinueButton();
          await PerpsOnboarding.tapContinueButton();
          await PerpsOnboarding.tapContinueButton();
          await PerpsOnboarding.tapContinueButton();
          await PerpsOnboarding.tapContinueButton();

          await PerpsOnboarding.tapContinueButton();

          // After skipping tutorial, user should land on markets screen
          await Assertions.expectElementToBeVisible(
            PerpsTabView.marketAddFundsButton as DetoxElement,
            {
              description:
                'Perps market add funds button visible after skipping tutorial',
            },
          );
        },
      );
    });
  },
);
