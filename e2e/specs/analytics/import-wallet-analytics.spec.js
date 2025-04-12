'use strict';
import { SmokeAnalytics } from '../../tags';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import TestHelpers from '../../helpers';
import Assertions from '../../utils/Assertions';
import { withFixtures } from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { E2E_SEGEMENT_TRACK_URL, getEventsPayloads, getSeenRequestsPayloads } from './helpers';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';



describe(SmokeAnalytics('Analytics during import wallet flow'), () => {
  const testSpecificMock = {
    POST: [mockEvents.POST.segmentTrack],
  };

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });


  it('should track analytics events during wallet import', async () => {
    await withFixtures({fixture: new FixtureBuilder().withOnboardingFixture().build(), restartDevice: true, testSpecificMock, launchArgs: {
      sendMetaMetricsinE2E: true,
    }}, async ({ mockServer }) => {
      await importWalletWithRecoveryPhrase(process.env.MM_TEST_WALLET_SRP);

      const events = await getEventsPayloads(mockServer, ['Wallet Setup Completed']);

      await Assertions.checkIfArrayHasLength(
        events,
        1,
      );

      await Assertions.checkIfObjectsMatch(
        events[0].properties,
        {
          wallet_setup_type: 'import',
          new_wallet: false,
        },
      );
    });
  });
});
