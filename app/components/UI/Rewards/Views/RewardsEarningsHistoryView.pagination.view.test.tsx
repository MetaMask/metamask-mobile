/**
 * Earnings history pagination and the under-review rows.
 *
 * E3: the full list fetches the next cursor page when the list end is reached.
 * G8: under review shows the paused banner, but the rows carry no per-row
 * Paused badge and never surface the hold reason.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsEarningsHistoryView.pagination.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import type { LedgerEntryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { EARNINGS_HISTORY_TEST_IDS } from '../components/Money/EarningsHistoryRows.testIds';
import { REWARDS_PAUSED_BANNER_TEST_IDS } from '../components/Money/RewardsPausedBanner.testIds';
import { REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS } from './RewardsEarningsHistoryView.testIds';
import { renderEarningsHistory } from '../../../../../tests/component-view/renderers/rewardsMoney';
import {
  EARNINGS_HISTORY_ROW,
  REFERRAL_LOCALIZED_TEXT,
  UNDER_REVIEW_EARNINGS_SUMMARY,
  earningRow,
} from '../../../../../tests/component-view/presets/rewardsMoney';

interface LedgerPage {
  results: LedgerEntryDto[];
  has_more: boolean;
  cursor: string | null;
  window: null;
}

function ledgerPage(
  results: LedgerEntryDto[],
  cursor: string | null,
): LedgerPage {
  return {
    results,
    has_more: cursor !== null,
    cursor,
    window: null,
  };
}

describe('RewardsEarningsHistoryView pagination', () => {
  it('loads the next ledger page from the list end (E3)', async () => {
    const firstPage = [EARNINGS_HISTORY_ROW, earningRow(1), earningRow(2)];
    const secondPage = [earningRow(3), earningRow(4)];
    const pages = [
      ledgerPage(firstPage, 'cursor-page-2'),
      ledgerPage(secondPage, null),
    ];
    let pageCalls = 0;
    const { getByTestId, getAllByTestId } = renderEarningsHistory({
      persona: 'referee',
      handlers: {
        'RewardsMoneyController:getEarningsLedger': () =>
          Promise.resolve(pages[Math.min(pageCalls, pages.length - 1)]).then(
            (result) => {
              pageCalls += 1;
              return result;
            },
          ),
      },
    });

    // First page renders before the next one is asked for.
    await waitFor(() => {
      expect(
        getAllByTestId(new RegExp(`^${EARNINGS_HISTORY_TEST_IDS.ROW}-`)),
      ).toHaveLength(3);
    });

    fireEvent(
      getByTestId(REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS.LIST),
      'onEndReached',
    );

    await waitFor(() => {
      expect(
        getAllByTestId(new RegExp(`^${EARNINGS_HISTORY_TEST_IDS.ROW}-`)),
      ).toHaveLength(5);
    });
    expect(
      getAllByTestId(new RegExp(`^${EARNINGS_HISTORY_TEST_IDS.ROW}-`)).map(
        (row) => row.props.testID,
      ),
    ).toEqual([
      `${EARNINGS_HISTORY_TEST_IDS.ROW}-earn-0`,
      `${EARNINGS_HISTORY_TEST_IDS.ROW}-earn-1`,
      `${EARNINGS_HISTORY_TEST_IDS.ROW}-earn-2`,
      `${EARNINGS_HISTORY_TEST_IDS.ROW}-earn-3`,
      `${EARNINGS_HISTORY_TEST_IDS.ROW}-earn-4`,
    ]);
  });
});

describe('RewardsEarningsHistoryView under review', () => {
  it('shows the paused banner while the rows carry no Paused badge or reason (G8)', async () => {
    const { findByTestId, getAllByTestId, queryAllByText, queryByText } =
      renderEarningsHistory({
        persona: 'referee',
        summary: UNDER_REVIEW_EARNINGS_SUMMARY,
        history: [EARNINGS_HISTORY_ROW, earningRow(1)],
      });

    expect(
      await findByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER),
    ).toBeOnTheScreen();

    await waitFor(() => {
      expect(
        getAllByTestId(new RegExp(`^${EARNINGS_HISTORY_TEST_IDS.ROW}-`)),
      ).toHaveLength(2);
    });

    // No per-row Paused badge: the paused label belongs to the claim card's
    // button state, not to a history row.
    expect(queryAllByText(REFERRAL_LOCALIZED_TEXT.paused)).toEqual([]);

    // The hold reason never reaches the screen: rows render their usual
    // labels and amounts only.
    expect(queryByText(/UNDER_REVIEW/)).toBeNull();

    const settledRow = getAllByTestId(
      `${EARNINGS_HISTORY_TEST_IDS.ROW}-${EARNINGS_HISTORY_ROW.id}`,
    )[0];
    expect(
      within(settledRow).getByText(REFERRAL_LOCALIZED_TEXT.rebateSwaps),
    ).toBeOnTheScreen();
    expect(within(settledRow).getByText('+$1.00')).toBeOnTheScreen();
  });
});
