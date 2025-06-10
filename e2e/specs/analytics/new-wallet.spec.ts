'use strict';
import { SmokeWalletPlatform } from '../../tags';
import { CreateNewWallet } from '../../viewHelper';
import TestHelpers from '../../helpers';
import Assertions from '../../utils/Assertions';
import { withFixtures } from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  EventPayload,
  filterEvents,
  getEventsPayloads,
  onboardingEvents,
} from './helpers';
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
        launchArgs: {
          sendMetaMetricsinE2E: true,
        },
      },
      async ({ mockServer }: { mockServer: MockttpServer }) => {
        await CreateNewWallet();

        const events = await getEventsPayloads(mockServer, eventNames);

        const softAssert = new SoftAssert();

        softAssert.checkAndCollect(async () => {
          await Assertions.checkIfArrayHasLength(events, 12);
        }, 'Should have 12 events in the new wallet flow');

        eventNames.forEach((eventName) => {
          const filtered = filterEvents(events, eventName) as EventPayload[];
          softAssert.checkAndCollect(
            () => Assertions.checkIfArrayHasLength(filtered, 1),
            `${eventName} event should be tracked`,
          );
        });

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
        await CreateNewWallet({
          optInToMetrics: false,
        });

        const events = await getEventsPayloads(mockServer);
        await Assertions.checkIfArrayHasLength(events, 0);
      },
    );
  });
});
