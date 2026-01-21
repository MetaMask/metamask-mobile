/* eslint-disable @typescript-eslint/no-non-null-assertion */
'use strict';
import { SmokeWalletPlatform } from '../../../tags';
import { CreateNewWallet } from '../../../page-objects/viewHelper.ts';
import TestHelpers from '../../../helpers';
import Assertions from '../../../framework/Assertions';
import { getEventsPayloads, onboardingEvents } from './helpers';
import SoftAssert from '../../../framework/SoftAssert';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';

const eventNames = [
  onboardingEvents.ANALYTICS_PREFERENCE_SELECTED,
  onboardingEvents.WELCOME_MESSAGE_VIEWED,
  onboardingEvents.ONBOARDING_STARTED,
  onboardingEvents.WALLET_SETUP_STARTED,
  onboardingEvents.WALLET_CREATION_ATTEMPTED,
  onboardingEvents.WALLET_CREATED,
  onboardingEvents.WALLET_SETUP_COMPLETED,
  onboardingEvents.WALLET_SECURITY_SKIP_INITIATED,
  onboardingEvents.WALLET_SECURITY_SKIP_CONFIRMED,
  onboardingEvents.AUTOMATIC_SECURITY_CHECKS_PROMPT_VIEWED,
  onboardingEvents.AUTOMATIC_SECURITY_CHECKS_DISABLED_FROM_PROMPT,
  onboardingEvents.WALLET_SECURITY_REMINDER_DISMISSED,
];
describe(SmokeWalletPlatform('Analytics during import wallet flow'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  it('should track analytics events during new wallet flow', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withOnboardingFixture().build(),
        restartDevice: true,
      },
      async ({ mockServer }) => {
        await CreateNewWallet();

        if (!mockServer) {
          throw new Error(
            'Mock server is not defined, check testSpecificMock setup',
          );
        }

        const events = await getEventsPayloads(mockServer, eventNames);

        const softAssert = new SoftAssert();

        const analyticsPreferenceSelectedEvent = events.find(
          (event) => event.event === 'Analytics Preference Selected',
        );
        const walletSetupStartedEvent = events.find(
          (event) => event.event === 'Wallet Setup Started',
        );
        const walletCreationAttemptedEvent = events.find(
          (event) => event.event === 'Wallet Creation Attempted',
        );
        const walletCreatedEvent = events.find(
          (event) => event.event === 'Wallet Created',
        );
        const walletSetupCompletedEvent = events.find(
          (event) => event.event === 'Wallet Setup Completed',
        );

        const checkAnalyticsPreferenceSelected = softAssert.checkAndCollect(
          async () => {
            Assertions.checkIfValueIsDefined(analyticsPreferenceSelectedEvent);
            Assertions.checkIfObjectsMatch(
              analyticsPreferenceSelectedEvent!.properties,
              {
                has_marketing_consent: false,
                is_metrics_opted_in: true,
                location: 'onboarding_metametrics',
                updated_after_onboarding: false,
              },
            );
          },
          'Analytics Preference Selected: Should be present with correct properties',
        );

        const checkWalletSetupStarted = softAssert.checkAndCollect(async () => {
          Assertions.checkIfValueIsDefined(walletSetupStartedEvent);
          Assertions.checkIfObjectsMatch(walletSetupStartedEvent!.properties, {
            account_type: 'metamask',
          });
        }, 'Wallet Setup Started: Should be present with correct properties');

        const checkWalletCreationAttempted = softAssert.checkAndCollect(
          async () => {
            Assertions.checkIfValueIsDefined(walletCreationAttemptedEvent);
            Assertions.checkIfObjectsMatch(
              walletCreationAttemptedEvent!.properties,
              {
                account_type: 'metamask',
              },
            );
          },
          'Wallet Creation Attempted: Should be present with correct properties',
        );

        const checkWalletCreated = softAssert.checkAndCollect(async () => {
          Assertions.checkIfValueIsDefined(walletCreatedEvent);
          Assertions.checkIfObjectsMatch(walletCreatedEvent!.properties, {
            biometrics_enabled: false,
            account_type: 'metamask',
          });
        }, 'Wallet Created: Should be present with correct properties');

        const checkWalletSetupCompleted = softAssert.checkAndCollect(
          async () => {
            Assertions.checkIfValueIsDefined(walletSetupCompletedEvent);
            Assertions.checkIfObjectsMatch(
              walletSetupCompletedEvent!.properties,
              {
                wallet_setup_type: 'new',
                new_wallet: true,
                account_type: 'metamask',
              },
            );
          },
          'Wallet Setup Completed: Should be present with correct properties',
        );

        await Promise.all([
          checkAnalyticsPreferenceSelected,
          checkWalletSetupStarted,
          checkWalletCreationAttempted,
          checkWalletCreated,
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
        await CreateNewWallet({
          optInToMetrics: false,
        });

        if (!mockServer) {
          throw new Error(
            'Mock server is not defined, check testSpecificMock setup',
          );
        }

        const events = await getEventsPayloads(mockServer);
        await Assertions.checkIfArrayHasLength(events, 0);
      },
    );
  });
});
