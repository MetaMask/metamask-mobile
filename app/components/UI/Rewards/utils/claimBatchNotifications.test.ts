import Engine from '../../../../core/Engine';
import { clearNotificationSkipPredicates } from '../../../../core/notificationSkipPredicates';
import {
  CLAIM_REWARDS_IN_PLACE_OF_SETTLED_BANNER_MS,
  CLAIM_REWARDS_NOTIFICATION_MS,
  claimRewardsNotification,
  clearReplacedClaimBatches,
  clearSettledClaimBatchBanners,
  isReplacedClaimBatch,
  queueClaimRewardsInPlaceOfSettledBanner,
  suppressSettledClaimBatchBanner,
} from './claimBatchNotifications';

jest.mock('../../../../core/Engine', () => ({
  context: {
    TransactionController: {
      state: {
        transactions: [] as { id: string; batchId?: string }[],
      },
    },
  },
}));

describe('claimBatchNotifications', () => {
  const transactions = Engine.context.TransactionController.state
    .transactions as { id: string; batchId?: string }[];

  afterEach(() => {
    transactions.length = 0;
    clearReplacedClaimBatches();
    clearNotificationSkipPredicates();
  });

  it('uses the wallet banner for the rewards line', () => {
    expect(
      claimRewardsNotification(
        'claim-rewards-1',
        'mUSD successfully claimed to your Money account',
      ),
    ).toMatchObject({
      id: 'claim-rewards-1',
      type: 'SHOW_SIMPLE_NOTIFICATION',
      autodismiss: CLAIM_REWARDS_NOTIFICATION_MS,
      title: 'mUSD successfully claimed to your Money account',
      status: 'success',
    });
  });

  it('shows the rewards line when the wallet would show its settled banner', () => {
    const show = jest.fn();
    const schedule = jest.fn();

    queueClaimRewardsInPlaceOfSettledBanner(show, schedule);

    expect(show).not.toHaveBeenCalled();
    expect(schedule).toHaveBeenCalledWith(
      show,
      CLAIM_REWARDS_IN_PLACE_OF_SETTLED_BANNER_MS,
    );
    expect(CLAIM_REWARDS_IN_PLACE_OF_SETTLED_BANNER_MS).toBe(2000);
  });

  it('skips the settled trade banner and clears a leftover submitted one', () => {
    transactions.push(
      { id: 'tx-1', batchId: '0xABC' },
      { id: 'tx-2', batchId: '0xabc' },
      { id: 'tx-other', batchId: '0xother' },
    );

    suppressSettledClaimBatchBanner('0xAbC');

    expect(isReplacedClaimBatch({ batchId: '0xabc' })).toBe(true);
    expect(isReplacedClaimBatch({ batchId: '0xother' })).toBe(false);
    expect(isReplacedClaimBatch(undefined)).toBe(false);
    expect(clearSettledClaimBatchBanners('0xabc')).toEqual([
      { type: 'REMOVE_NOTIFICATION_BY_ID', id: 'tx-1' },
      { type: 'REMOVE_NOTIFICATION_BY_ID', id: 'tx-2' },
    ]);
  });
});
