'use strict';
import { SmokeAnalytics } from '../../tags';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import TestHelpers from '../../helpers';
import Assertions from '../../utils/Assertions';
import { withFixtures } from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { getEventsPayloads } from './helpers';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import { MetaMetricsEvents } from '../../../app/core/Analytics/MetaMetrics.events';
import { getBalanceMocks, INFURA_MOCK_BALANCE_1_ETH } from '../../api-mocking/mock-responses/balance-mocks';
import { IDENTITY_TEAM_PASSWORD, IDENTITY_TEAM_SEED_PHRASE } from '../identity/utils/constants';

const balanceMock = getBalanceMocks([
  {
    address: '0xAa4179E7f103701e904D27DF223a39Aa9c27405a',
    balance: INFURA_MOCK_BALANCE_1_ETH,
  },
]);

const testSpecificMock = {
  POST: [...balanceMock, mockEvents.POST.segmentTrack, ]
};

describe(SmokeAnalytics('Analytics during import wallet flow'), () => {

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });


  it('should track analytics events during wallet import', async () => {
    await withFixtures({fixture: new FixtureBuilder().withOnboardingFixture().build(), restartDevice: true, testSpecificMock, launchArgs: {
      sendMetaMetricsinE2E: true,
    }}, async ({ mockServer }) => {
      await importWalletWithRecoveryPhrase({
        seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
        password: IDENTITY_TEAM_PASSWORD,
        optInToMetrics: true,
      });

      const events = await getEventsPayloads(mockServer, [MetaMetricsEvents.WALLET_IMPORTED.category, MetaMetricsEvents.WALLET_SETUP_COMPLETED.category]);

      await Assertions.checkIfArrayHasLength(
        events,
        2,
      );

      const walletImportedEvent = events.find(
        (event) =>
          event.event === MetaMetricsEvents.WALLET_IMPORTED.category,
      );
      const walletSetupCompletedEvent = events.find(
        (event) =>
          event.event === MetaMetricsEvents.WALLET_SETUP_COMPLETED.category,
      );

      await Assertions.checkIfObjectsMatch(
        walletSetupCompletedEvent.properties,
        {
          wallet_setup_type: 'import',
          new_wallet: false,
        },
      );

      await Assertions.checkIfObjectsMatch(
        walletImportedEvent.properties,
        { biometrics_enabled: false }
      );
    });
  });

  it('should not track analytics events when opt-in to metrics is off', async () => {
    await withFixtures({fixture: new FixtureBuilder().withOnboardingFixture().build(), restartDevice: true, testSpecificMock, launchArgs: {
      sendMetaMetricsinE2E: true,
    }}, async ({ mockServer }) => {
      await importWalletWithRecoveryPhrase({
        seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
        password: IDENTITY_TEAM_PASSWORD,
        optInToMetrics: false,
      });

      const events = await getEventsPayloads(mockServer);
      await Assertions.checkIfArrayHasLength(
        events,
        0,
      );
    });
  });
});
