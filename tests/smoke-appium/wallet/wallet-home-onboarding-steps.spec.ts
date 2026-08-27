import { merge } from 'lodash';
import { WalletHomeOnboardingStepsSelectors } from '../../../app/components/UI/WalletHomeOnboardingSteps/WalletHomeOnboardingSteps.testIds';
import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import Assertions from '../../framework/Assertions.js';
import Matchers from '../../framework/Matchers.js';
import WalletView from '../../page-objects/wallet/WalletView.js';

/**
 * AccountGroupBalance overrides WalletHomeOnboardingSteps' root testID with the
 * empty-state container id, so the primary CTA id is composed from both.
 */
const walletHomeOnboardingPrimaryButtonId = `${WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER}-${WalletHomeOnboardingStepsSelectors.PRIMARY_BUTTON}`;

appiumTest.describe(SmokeWalletPlatform('Wallet Home Onboarding Steps'), () => {
  appiumTest.describe.configure({ timeout: 150000 });

  // Default fixture keeps eligible=false (existing-user baseline). This case
  // forces eligible=true to cover the overlay that hides Buy/Send/Swap.
  appiumTest(
    'shows wallet home onboarding steps when eligibility is true and hides main actions',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const fixture = new FixtureBuilder().build();
      merge(fixture.state, {
        onboarding: {
          walletHomeOnboardingStepsEligible: true,
          walletHomeOnboardingSkipInitialBalanceWait: true,
          walletHomeOnboardingSteps: {
            stepIndex: 0,
            suppressedReason: null,
          },
        },
      });

      await withFixtures(
        {
          fixture,
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await Assertions.expectElementToBeVisible(
            Matchers.getElementByID(walletHomeOnboardingPrimaryButtonId),
            {
              description:
                'Wallet home onboarding primary CTA should be visible when eligible',
            },
          );

          await Assertions.expectElementToNotBeVisible(
            WalletView.walletBuyButton,
            {
              description:
                'Buy button should be hidden while wallet home onboarding steps are active',
            },
          );
        },
      );
    },
  );
});
