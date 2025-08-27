'use strict';
import { RegressionWalletPlatform } from '../../tags';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import TestHelpers from '../../helpers';
import Assertions from '../../framework/Assertions';
import {
  EventPayload,
  findEvent,
  getEventsPayloads,
  onboardingEvents,
} from './helpers';
import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
} from '../identity/utils/constants';
import SoftAssert from '../../utils/SoftAssert';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';

describe(
  RegressionWalletPlatform('Analytics during import wallet flow'),
  () => {
    beforeAll(async () => {
      await TestHelpers.reverseServerPort();
    });

    it('should track analytics events during wallet import flow', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withOnboardingFixture().build(),
          restartDevice: true,
        },
        async ({ mockServer }) => {
          if (!mockServer) {
            throw new Error(
              'Mock server is not defined, check testSpecificMock setup',
            );
          }

          await importWalletWithRecoveryPhrase({
            seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
            password: IDENTITY_TEAM_PASSWORD,
            optInToMetrics: true,
          });

          const events = await getEventsPayloads(mockServer, [
            onboardingEvents.ANALYTICS_PREFERENCE_SELECTED,
            onboardingEvents.WALLET_IMPORTED,
            onboardingEvents.WALLET_SETUP_COMPLETED,
            onboardingEvents.WALLET_IMPORT_STARTED,
            onboardingEvents.WALLET_IMPORT_ATTEMPTED,
            onboardingEvents.WELCOME_MESSAGE_VIEWED,
            onboardingEvents.ONBOARDING_STARTED,
          ]);

          const softAssert = new SoftAssert();

          const checkEventCount = softAssert.checkAndCollect(
            () => Assertions.checkIfArrayHasLength(events, 7),
            'Expected 9 events, but found a different number of events',
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

          // WELCOME_MESSAGE_VIEWED
          const welcomeMessageViewedEvent = findEvent(
            events,
            onboardingEvents.WELCOME_MESSAGE_VIEWED,
          ) as EventPayload;

          const checkWelcomeMessage = softAssert.checkAndCollect(
            () =>
              Assertions.checkIfObjectsMatch(
                welcomeMessageViewedEvent.properties,
                {},
              ),
            'Welcome Message Viewed event properties do not match expected values',
          );

          // ONBOARDING_STARTED
          const onboardingStartedEvent = findEvent(
            events,
            onboardingEvents.ONBOARDING_STARTED,
          ) as EventPayload;

          const checkOnboardingStarted = softAssert.checkAndCollect(
            () =>
              Assertions.checkIfObjectsMatch(
                onboardingStartedEvent.properties,
                {},
              ),
            'Onboarding Started event properties do not match expected values',
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
            checkWelcomeMessage,
            checkOnboardingStarted,
            checkWalletImportStarted,
            checkWalletImportAttempted,
            checkWalletImported,
            checkWalletSetupCompleted,
          ]);

          softAssert.throwIfErrors();
        },
      );
    });
    it('should not track analytics events when opt-in to metrics is off', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withOnboardingFixture().build(),
          restartDevice: true,
        },
        async ({ mockServer }) => {
          if (!mockServer) {
            throw new Error(
              'Mock server is not defined, check testSpecificMock setup',
            );
          }

          await importWalletWithRecoveryPhrase({
            seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
            password: IDENTITY_TEAM_PASSWORD,
            optInToMetrics: false,
          });

          const events = await getEventsPayloads(mockServer);
          await Assertions.checkIfArrayHasLength(events, 0);
        },
      );
    });
  },
);
