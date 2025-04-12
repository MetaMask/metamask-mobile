// @ts-check
import { SmokeAnalytics } from '../../tags';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import TestHelpers from '../../helpers';
import { startMockServer } from '../../api-mocking/mock-server';
import { DEFAULT_MOCKSERVER_PORT } from '../../fixtures/utils';
import SegmentTracker from './utils/SegmentTracker';
import Assertions from '../../utils/Assertions';

describe(SmokeAnalytics('Analytics during import wallet flow'), () => {
  /** @type {import('mockttp').Mockttp} */
  let mockServer;
  /** @type {SegmentTracker} */
  let segmentTracker;

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    mockServer = await startMockServer({}, DEFAULT_MOCKSERVER_PORT);
    const detoxTestId = 'import-wallet-analytics-test';
    segmentTracker = new SegmentTracker(detoxTestId, mockServer);
    await segmentTracker.start();
    await TestHelpers.launchApp({
      newInstance: true,
      launchArgs: {
        detoxTestId,
        mockServerPort: String(DEFAULT_MOCKSERVER_PORT),
        enableSegment: true,
      }
    });
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  it('should track analytics events during wallet import', async () => {
    await importWalletWithRecoveryPhrase(process.env.MM_TEST_WALLET_SRP);
    const walletSetupEvent = await segmentTracker.getEventsByName('Wallet Setup Completed');
    await Assertions.checkIfArrayHasLength(
      walletSetupEvent,
      1,
    );
    await Assertions.checkIfObjectsMatch(
      walletSetupEvent[0].properties,
      {
        wallet_setup_type: 'import',
        new_wallet: false,
      },
    );
  });
});
