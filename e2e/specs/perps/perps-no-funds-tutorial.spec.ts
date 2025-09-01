import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionPerps } from '../../tags';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import PerpsTabView from '../../pages/Perps/PerpsTabView';
import Assertions from '../../framework/Assertions';
import PerpsOnboarding from '../../pages/Perps/PerpsOnboarding';

describe(
  RegressionPerps('Perps - no funds shows Start Trading and tutorial'),
  () => {
    beforeEach(async () => {
      jest.setTimeout(150000);
    });

    it('should show Start Trading on Perps tab and then tutorial screens', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPopularNetworks()
            .withPerpsProfile('no-funds')
            .withPerpsFirstTimeUser(true)
            .ensureSolanaModalSuppressed()
            .build(),
          restartDevice: true,
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

          await Assertions.expectElementToNotBeVisible(
            PerpsTabView.onboardingButton,
            { description: 'Perps onboarding button hidden after tutorial' },
          );

          // Last screen outcome: empty state visible and CTA removed
          await Assertions.expectTextDisplayed('No Open Positions');
          await Assertions.expectTextNotDisplayed('Start trading');
        },
      );
    });
  },
);
