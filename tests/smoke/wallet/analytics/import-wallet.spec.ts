'use strict';
import { SmokeWalletPlatform } from '../../../../e2e/tags';
import { importWalletWithRecoveryPhrase } from '../../../../e2e/viewHelper';
import TestHelpers from '../../../../e2e/helpers';
import Assertions from '../../../framework/Assertions';
import {
  EventPayload,
  findEvent,
  getEventsPayloads,
  onboardingEvents,
} from '../../../helpers/analytics/helpers';
import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
} from '../../identity/utils/constants';
import SoftAssert from '../../../framework/SoftAssert';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetails } from '../../../api-mocking/mock-responses/feature-flags-mocks';

describe(SmokeWalletPlatform('Analytics during import wallet flow'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  it('should track analytics events during wallet import flow', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withOnboardingFixture().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureMultichainAccountsAccountDetails(),
          );
        },
        endTestfn: async ({ mockServer }) => {
          const expectedEvents = [
            onboardingEvents.ANALYTICS_PREFERENCE_SELECTED,
            onboardingEvents.WALLET_IMPORTED,
            onboardingEvents.WALLET_SETUP_COMPLETED,
            onboardingEvents.WALLET_IMPORT_STARTED,
            onboardingEvents.WALLET_IMPORT_ATTEMPTED,
          ];
          const events = await getEventsPayloads(mockServer, expectedEvents);

          const softAssert = new SoftAssert();

          const checkEventCount = softAssert.checkAndCollect(
            () =>
              Assertions.checkIfArrayHasLength(events, expectedEvents.length),
            `Expected ${expectedEvents.length} events to be tracked, but found ${events.length}`,
          );

          // ANALYTICS_PREFERENCE_SELECTED
          const analyticsPreferenceSelectedEvent = findEvent(
            events,
            onboardingEvents.ANALYTICS_PREFERENCE_SELECTED,
          ) as EventPayload;

          const checkAnalyticsPreference = softAssert.checkAndCollect(
            async () => {
              Assertions.checkIfObjectsMatch(
                analyticsPreferenceSelectedEvent?.properties,
                {
                  has_marketing_consent: false,
                  is_metrics_opted_in: true,
                  location: 'onboarding_metametrics',
                  updated_after_onboarding: false,
                },
              );
            },
            'Analytics Preference Selected event properties do not match expected values',
          );

          // WALLET IMPORTED STARTED
          const walletImportStartedEvent = findEvent(
            events,
            onboardingEvents.WALLET_IMPORT_STARTED,
          ) as EventPayload;

          const checkWalletImportStarted = softAssert.checkAndCollect(
            () =>
              Assertions.checkIfObjectsMatch(
                walletImportStartedEvent.properties,
                {
                  account_type: 'imported',
                },
              ),
            'Wallet Import Started event properties do not match expected values',
          );

          // WALLET IMPORTED ATTEMPTED
          const walletImportAttemptedEvent = findEvent(
            events,
            onboardingEvents.WALLET_IMPORT_ATTEMPTED,
          ) as EventPayload;

          const checkWalletImportAttempted = softAssert.checkAndCollect(
            () =>
              Assertions.checkIfObjectsMatch(
                walletImportAttemptedEvent.properties,
                {},
              ),
            'Wallet Import Attempted event properties do not match expected values',
          );

          // WALLET IMPORTED
          const walletImportedEvent = findEvent(
            events,
            onboardingEvents.WALLET_IMPORTED,
          ) as EventPayload;

          const checkWalletImported = softAssert.checkAndCollect(
            () =>
              Assertions.checkIfObjectsMatch(walletImportedEvent.properties, {
                biometrics_enabled: false,
              }),
            'Wallet Imported event properties do not match expected values',
          );

          // WALLET SETUP COMPLETED
          const walletSetupCompletedEvent = findEvent(
            events,
            onboardingEvents.WALLET_SETUP_COMPLETED,
          ) as EventPayload;

          const checkWalletSetupCompleted = softAssert.checkAndCollect(
            () =>
              Assertions.checkIfObjectsMatch(
                walletSetupCompletedEvent.properties,
                {
                  wallet_setup_type: 'import',
                  new_wallet: false,
                  account_type: 'imported',
                },
              ),
            'Wallet Setup Completed event properties do not match expected values',
          );

          await Promise.all([
            checkEventCount,
            checkAnalyticsPreference,
            checkWalletImportStarted,
            checkWalletImportAttempted,
            checkWalletImported,
            checkWalletSetupCompleted,
          ]);

          softAssert.throwIfErrors();
        },
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
  it('should not track analytics events when opt-in to metrics is off', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withOnboardingFixture().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureMultichainAccountsAccountDetails(),
          );
        },
        endTestfn: async ({ mockServer }) => {
          const events = await getEventsPayloads(mockServer);
          await Assertions.checkIfArrayHasLength(events, 0);
        },
      },
      async () => {
        await importWalletWithRecoveryPhrase({
          seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
          password: IDENTITY_TEAM_PASSWORD,
          optInToMetrics: false,
        });
      },
    );
  });
});
