/* eslint-disable jest/no-disabled-tests -- E2E skipped; covered by component view tests */
import { SmokeConfirmations } from '../../../tags';

describe(SmokeConfirmations('Send TRX token'), () => {
  // Moved to cv tests (send.non-evm.view.test.tsx)

  it.skip('shows insufficient funds', async () => {
    // TODO: Update the test so if does a full e2e (define what should do). Keep this test to have something tested on e2e.
    // https://consensyssoftware.atlassian.net/browse/MMQA-1793
  });
});
