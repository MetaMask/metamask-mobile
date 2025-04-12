'use strict';
import { SmokeAnalytics } from '../../tags';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import TestHelpers from '../../helpers';
import { startMockServer } from '../../api-mocking/mock-server';
import { DEFAULT_MOCKSERVER_PORT } from '../../fixtures/utils';
import SegmentTracker from './utils/SegmentTracker';
import Assertions from '../../utils/Assertions';
import { withFixtures } from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder';



describe(SmokeAnalytics('Analytics during import wallet flow'), () => {
  const capturedEvents = [];
  async function mockSegment(mockServer) {
    return[
      await mockServer
      .forPost('https://fakeurl.com/mm_test_track')
      .thenCallback(async (req) => {
        let body;
        try {
          body = await req.body.getJson();
          capturedEvents.push(body);
        } catch (e) {
          console.error('TRACK EVENT error:', e);
        }

        return {
          statusCode: 200,
          body
        };
      }),
    ];
  }

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });


  it('should track analytics events during wallet import', async () => {
    await withFixtures({fixture: new FixtureBuilder().withOnboardingFixture().build(), restartDevice: true, testSpecificMock: mockSegment}, async () => {
      await importWalletWithRecoveryPhrase(process.env.MM_TEST_WALLET_SRP);
    });

  });
});
