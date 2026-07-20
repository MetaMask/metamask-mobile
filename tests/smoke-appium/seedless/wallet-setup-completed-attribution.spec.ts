import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSeedlessOnboarding } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { onboardingEvents } from '../../helpers/analytics/helpers.js';
import type { AnalyticsExpectations } from '../../framework/index.js';
import { E2E_WALLET_SETUP_ATTRIBUTION_FIELDS } from '../../helpers/analytics/walletSetupAttributionE2eConstants.js';
import {
  completeAppleNewUserOnboarding,
  completeGoogleNewUserOnboarding,
  setupAppleNewUserOAuthMock,
  setupGoogleNewUserOAuthMock,
} from './helpers/seedless-helpers.js';

function walletSetupCompletedOnlyExpectations(
  accountType: string,
): AnalyticsExpectations {
  return {
    eventNames: [onboardingEvents.WALLET_SETUP_COMPLETED],
    events: [
      {
        name: onboardingEvents.WALLET_SETUP_COMPLETED,
        matchProperties: {
          wallet_setup_type: 'new',
          new_wallet: true,
          account_type: accountType,
          ...E2E_WALLET_SETUP_ATTRIBUTION_FIELDS,
        },
      },
    ],
  };
}

appiumTest.describe(
  SmokeSeedlessOnboarding(
    'Wallet Setup Completed includes persisted attribution (Google + Apple)',
  ),
  () => {
    appiumTest(
      'Google new user flow attaches persisted acquisition on Wallet Setup Completed',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder({ onboarding: true })
              .withWalletSetupAttributionForE2e(
                E2E_WALLET_SETUP_ATTRIBUTION_FIELDS,
              )
              .build(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: setupGoogleNewUserOAuthMock,
            analyticsExpectations:
              walletSetupCompletedOnlyExpectations('metamask_google'),
          },
          async () => {
            await completeGoogleNewUserOnboarding();
          },
        );
      },
    );

    appiumTest(
      'Apple new user flow attaches persisted acquisition on Wallet Setup Completed',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder({ onboarding: true })
              .withWalletSetupAttributionForE2e(
                E2E_WALLET_SETUP_ATTRIBUTION_FIELDS,
              )
              .build(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: setupAppleNewUserOAuthMock,
            analyticsExpectations:
              walletSetupCompletedOnlyExpectations('metamask_apple'),
          },
          async () => {
            await completeAppleNewUserOnboarding();
          },
        );
      },
    );
  },
);
