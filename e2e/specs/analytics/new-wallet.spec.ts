/* eslint-disable @typescript-eslint/no-non-null-assertion */
'use strict';
import { SmokeWalletPlatform } from '../../tags';
import { CreateNewWallet } from '../../viewHelper';
import TestHelpers from '../../helpers';
import Assertions from '../../utils/Assertions';
import { withFixtures } from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { getEventsPayloads, onboardingEvents } from './helpers';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import {
  getBalanceMocks,
  INFURA_MOCK_BALANCE_1_ETH,
} from '../../api-mocking/mock-responses/balance-mocks';
import SoftAssert from '../../utils/SoftAssert';
import { MockttpServer } from 'mockttp';

const balanceMock = getBalanceMocks([
  {
    address: '0xAa4179E7f103701e904D27DF223a39Aa9c27405a',
    balance: INFURA_MOCK_BALANCE_1_ETH,
  },
]);

const testSpecificMock = {
  POST: [...balanceMock, mockEvents.POST.segmentTrack],
};

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
        testSpecificMock,
      },
      async ({ mockServer }: { mockServer: MockttpServer }) => {
        await CreateNewWallet();

        const events = await getEventsPayloads(mockServer, eventNames);

        const softAssert = new SoftAssert();

        const analyticsPreferenceSelectedEvent = events.find(
          (event) => event.event === 'Analytics Preference Selected',
        );
        const welcomeMessageViewedEvent = events.find(
          (event) => event.event === 'Welcome Message Viewed',
        );
        const onboardingStartedEvent = events.find(
          (event) => event.event === 'Onboarding Started',
        );
        const walletSetupStartedEvent = events.find(
          (event) => event.event === 'Wallet Setup Started',
        );
        const walletCreationAttemptedEvent = events.find(
          (event) => event.event === 'Wallet Creation Attempted',
        );
        const walletSetupCompletedEvent = events.find(
          (event) => event.event === 'Wallet Setup Completed',
        );

        const checkEventCount = softAssert.checkAndCollect(
          () => Assertions.checkIfArrayHasLength(events, 6),
          'Expected 6 events for new wallet onboarding',
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

        const checkWelcomeMessageViewed = softAssert.checkAndCollect(
          async () => {
            Assertions.checkIfValueIsDefined(welcomeMessageViewedEvent);
            Assertions.checkIfObjectsMatch(
              welcomeMessageViewedEvent!.properties,
              {},
            );
          },
          'Welcome Message Viewed: Should be present with empty properties',
        );

        const checkOnboardingStarted = softAssert.checkAndCollect(async () => {
          Assertions.checkIfValueIsDefined(onboardingStartedEvent);
          Assertions.checkIfObjectsMatch(
            onboardingStartedEvent!.properties,
            {},
          );
        }, 'Onboarding Started: Should be present with empty properties');

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
          checkEventCount,
          checkAnalyticsPreferenceSelected,
          checkWelcomeMessageViewed,
          checkOnboardingStarted,
          checkWalletSetupStarted,
          checkWalletCreationAttempted,
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
        testSpecificMock,
      },
      async ({ mockServer }: { mockServer: MockttpServer }) => {
        await CreateNewWallet({
          optInToMetrics: false,
        });

        const events = await getEventsPayloads(mockServer);
        await Assertions.checkIfArrayHasLength(events, 0);
      },
    );
  });
});
