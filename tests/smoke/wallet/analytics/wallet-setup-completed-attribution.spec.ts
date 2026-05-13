'use strict';

import { Mockttp } from 'mockttp';
import TestHelpers from '../../../helpers';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { SmokeSeedlessOnboarding } from '../../../tags';
import { onboardingEvents } from '../../../helpers/analytics/helpers';
import { createOAuthMockttpService } from '../../../api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../../module-mocking/oauth';
import {
  completeAppleNewUserOnboarding,
  completeGoogleNewUserOnboarding,
} from '../../seedless/utils';
import type { AnalyticsExpectations } from '../../../framework';
import { E2E_WALLET_SETUP_ATTRIBUTION_FIELDS } from '../../../helpers/analytics/walletSetupAttributionE2eConstants';

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

describe(
  SmokeSeedlessOnboarding(
    'Wallet Setup Completed includes persisted attribution (Google + Apple)',
  ),
  () => {
    beforeAll(async () => {
      jest.setTimeout(300000);
      await TestHelpers.reverseServerPort();
    });

    beforeEach(() => {
      E2EOAuthHelpers.reset();
    });

    it('Google new user flow attaches persisted acquisition on Wallet Setup Completed', async () => {
      E2EOAuthHelpers.configureGoogleNewUser();
      await withFixtures(
        {
          fixture: new FixtureBuilder({ onboarding: true })
            .withWalletSetupAttributionForE2e(
              E2E_WALLET_SETUP_ATTRIBUTION_FIELDS,
            )
            .build(),
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            const oAuthMockttpService = createOAuthMockttpService();
            oAuthMockttpService.configureGoogleNewUser();
            await oAuthMockttpService.setup(mockServer);
          },
          analyticsExpectations:
            walletSetupCompletedOnlyExpectations('metamask_google'),
        },
        async () => {
          await completeGoogleNewUserOnboarding();
        },
      );
    });

    it('Apple new user flow attaches persisted acquisition on Wallet Setup Completed', async () => {
      E2EOAuthHelpers.configureAppleNewUser();
      await withFixtures(
        {
          fixture: new FixtureBuilder({ onboarding: true })
            .withWalletSetupAttributionForE2e(
              E2E_WALLET_SETUP_ATTRIBUTION_FIELDS,
            )
            .build(),
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            const oAuthMockttpService = createOAuthMockttpService();
            oAuthMockttpService.configureAppleNewUser();
            await oAuthMockttpService.setup(mockServer);
          },
          analyticsExpectations:
            walletSetupCompletedOnlyExpectations('metamask_apple'),
        },
        async () => {
          await completeAppleNewUserOnboarding();
        },
      );
    });
  },
);
