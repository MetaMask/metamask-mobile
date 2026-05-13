'use strict';

import { Mockttp } from 'mockttp';
import TestHelpers from '../../../helpers';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import {
  CreateNewWallet,
  importWalletWithRecoveryPhrase,
} from '../../../flows/wallet.flow';
import { SmokeWalletPlatform, SmokeSeedlessOnboarding } from '../../../tags';
import { newWalletWithMetricsOptInExpectations } from '../../../helpers/analytics/expectations/new-wallet.analytics';
import { importWalletWithMetricsOptInExpectations } from '../../../helpers/analytics/expectations/import-wallet.analytics';
import { onboardingEvents } from '../../../helpers/analytics/helpers';
import {
  remoteFeaturePredictGtmOnboardingModalDisabled,
  remoteFeatureMultichainAccountsAccountDetails,
} from '../../../api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { E2E_WALLET_SETUP_ATTRIBUTION_FIELDS } from '../../../helpers/analytics/walletSetupAttributionE2eConstants';
import { createOAuthMockttpService } from '../../../api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../../module-mocking/oauth';
import {
  completeAppleNewUserOnboarding,
  completeGoogleNewUserOnboarding,
} from '../../seedless/utils';
import type { AnalyticsExpectations } from '../../../framework/types';
import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
} from '../../identity/utils/constants';

function withAttributionOnWalletSetupCompleted(
  base: AnalyticsExpectations,
): AnalyticsExpectations {
  return {
    ...base,
    events: base.events?.map((ev) =>
      ev.name === onboardingEvents.WALLET_SETUP_COMPLETED
        ? {
            ...ev,
            containProperties: {
              ...(ev.containProperties ?? {}),
              ...E2E_WALLET_SETUP_ATTRIBUTION_FIELDS,
            },
          }
        : ev,
    ),
  };
}

function walletSetupCompletedOnlyExpectations(
  accountType: string,
): AnalyticsExpectations {
  return {
    eventNames: [onboardingEvents.WALLET_SETUP_COMPLETED],
    events: [
      {
        name: onboardingEvents.WALLET_SETUP_COMPLETED,
        containProperties: {
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
  SmokeWalletPlatform(
    'Wallet Setup Completed includes persisted attribution (create + import)',
  ),
  () => {
    beforeAll(async () => {
      await TestHelpers.reverseServerPort();
    });

    it('new wallet flow attaches persisted UTM and attribution_id when marketing is on', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withOnboardingFixture()
            .withWalletSetupAttributionForE2e(
              E2E_WALLET_SETUP_ATTRIBUTION_FIELDS,
            )
            .build(),
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(
              mockServer,
              remoteFeaturePredictGtmOnboardingModalDisabled(),
            );
          },
          analyticsExpectations: withAttributionOnWalletSetupCompleted(
            newWalletWithMetricsOptInExpectations,
          ),
        },
        async () => {
          await CreateNewWallet();
        },
      );
    });

    it('import flow attaches persisted UTM and attribution_id when marketing is on', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withOnboardingFixture()
            .withWalletSetupAttributionForE2e(
              E2E_WALLET_SETUP_ATTRIBUTION_FIELDS,
            )
            .build(),
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(mockServer, {
              ...remoteFeatureMultichainAccountsAccountDetails(),
              ...remoteFeaturePredictGtmOnboardingModalDisabled(),
            });
          },
          analyticsExpectations: withAttributionOnWalletSetupCompleted(
            importWalletWithMetricsOptInExpectations,
          ),
        },
        async () => {
          await importWalletWithRecoveryPhrase({
            seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
            password: IDENTITY_TEAM_PASSWORD,
            optInToMetrics: true,
          });
        },
      );
    });
  },
);

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
