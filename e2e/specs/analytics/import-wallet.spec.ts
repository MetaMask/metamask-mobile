'use strict';
import { SmokeWalletPlatform } from '../../tags';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import TestHelpers from '../../helpers';
import Assertions from '../../utils/Assertions';
import { withFixtures } from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  EventPayload,
  filterEvents,
  findEvent,
  getEventsPayloads,
  onboardingEvents,
} from './helpers';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import {
  getBalanceMocks,
  INFURA_MOCK_BALANCE_1_ETH,
} from '../../api-mocking/mock-responses/balance-mocks';
import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
} from '../identity/utils/constants';
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

describe(SmokeWalletPlatform('Analytics during import wallet flow'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  it('should track analytics events during wallet import flow', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withOnboardingFixture().build(),
        restartDevice: true,
        testSpecificMock,
        launchArgs: {
          sendMetaMetricsinE2E: true,
        },
      },
      async ({ mockServer }: { mockServer: MockttpServer }) => {
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
          onboardingEvents.AUTOMATIC_SECURITY_CHECKS_PROMPT_VIEWED,
          onboardingEvents.AUTOMATIC_SECURITY_CHECKS_DISABLED_FROM_PROMPT,
          onboardingEvents.WELCOME_MESSAGE_VIEWED,
          onboardingEvents.ONBOARDING_STARTED,
        ]);

        const softAssert = new SoftAssert();

        softAssert.checkAndCollect(
          () => Assertions.checkIfArrayHasLength(events, 9),
          'Expected 9 events, but found a different number of events',
        );

        // ANALYTICS_PREFERENCE_SELECTED
        const analyticsPreferenceSelectedEvent = findEvent(
          events,
          onboardingEvents.ANALYTICS_PREFERENCE_SELECTED,
        ) as EventPayload;

        softAssert.checkAndCollect(async () => {
          Assertions.checkIfObjectsMatch(
            analyticsPreferenceSelectedEvent?.properties,
            {
              has_marketing_consent: false,
              is_metrics_opted_in: true,
              location: 'onboarding_metametrics',
              updated_after_onboarding: false,
            },
          );
        }, 'Analytics Preference Selected event properties do not match expected values');

        // WELCOME_MESSAGE_VIEWED
        const welcomeMessageViewedEvent = findEvent(
          events,
          onboardingEvents.WELCOME_MESSAGE_VIEWED,
        ) as EventPayload;

        softAssert.checkAndCollect(
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

        softAssert.checkAndCollect(
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
        softAssert.checkAndCollect(
          () =>
            Assertions.checkIfObjectsMatch(
              walletImportStartedEvent.properties,
              {},
            ),
          'Wallet Import Started event properties do not match expected values',
        );

        // WALLET IMPORTED ATTEMPTED
        const walletImportAttemptedEvent = findEvent(
          events,
          onboardingEvents.WALLET_IMPORT_ATTEMPTED,
        ) as EventPayload;
        softAssert.checkAndCollect(
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
        softAssert.checkAndCollect(
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
        softAssert.checkAndCollect(
          () =>
            Assertions.checkIfObjectsMatch(
              walletSetupCompletedEvent.properties,
              {
                wallet_setup_type: 'import',
                new_wallet: false,
              },
            ),
          'Wallet Setup Completed event properties do not match expected values',
        );

        // AUTOMATIC_SECURITY_CHECKS_PROMPT_VIEWED - TODO: Use @christopherferreira9 new function to check object value types once merged
        const automaticSecurityChecksPromptViewedEvent = filterEvents(
          events,
          onboardingEvents.AUTOMATIC_SECURITY_CHECKS_PROMPT_VIEWED,
        );
        softAssert.checkAndCollect(
          () =>
            Assertions.checkIfArrayHasLength(
              automaticSecurityChecksPromptViewedEvent,
              1,
            ),
          'Automatic Security Checks Prompt Viewed event properties do not match expected values',
        );

        // AUTOMATIC_SECURITY_CHECKS_DISABLED_FROM_PROMPT - TODO: Use @christopherferreira9 new function to check object value types once merged
        const automaticSecurityChecksDisabledFromPromptEvent = filterEvents(
          events,
          onboardingEvents.AUTOMATIC_SECURITY_CHECKS_DISABLED_FROM_PROMPT,
        );
        softAssert.checkAndCollect(
          () =>
            Assertions.checkIfArrayHasLength(
              automaticSecurityChecksDisabledFromPromptEvent,
              1,
            ),
          'Automatic Security Checks Disabled From Prompt event properties do not match expected values',
        );

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
        launchArgs: {
          sendMetaMetricsinE2E: true,
        },
      },
      async ({ mockServer }: { mockServer: MockttpServer }) => {
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
});
