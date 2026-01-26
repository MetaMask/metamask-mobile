import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { SmokeTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import PerpsTabView from '../../pages/Perps/PerpsTabView';
import Assertions from '../../../tests/framework/Assertions';
import PerpsOnboarding from '../../pages/Perps/PerpsOnboarding';
import { PERPS_ARBITRUM_MOCKS } from '../../../tests/api-mocking/mock-responses/perps-arbitrum-mocks';

describe(
  SmokeTrade('Perps - no funds shows Start Trading and tutorial'),
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
