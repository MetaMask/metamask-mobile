'use strict';
import { SmokeAnalytics } from '../../tags';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import TestHelpers from '../../helpers';
import SegmentHelper from './utils/SegmentHelper';
import { startSegmentTracking } from './utils/segmentEventTracker';

describe(SmokeAnalytics('Analytics during import wallet flow'), () => {
  let mockServer;

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    mockServer = await startSegmentTracking()
    await TestHelpers.launchApp();
    await SegmentHelper.clearEvents();
  });

  afterAll(async () => {
    await mockServer.stop();
  });

  it('should track analytics events during wallet import', async () => {
    await importWalletWithRecoveryPhrase(process.env.MM_TEST_WALLET_SRP); 
    await SegmentHelper.assertEventWithPropertiesExists('Wallet Setup Completed',  { wallet_setup_type: 'import', new_wallet: false} );
  });
});
