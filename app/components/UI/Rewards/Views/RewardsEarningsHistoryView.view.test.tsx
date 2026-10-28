/**
 * Full earnings history, including the in-flight claim row.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsEarningsHistoryView.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { act, fireEvent, within } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import { EARNINGS_HISTORY_TEST_IDS } from '../components/Money/EarningsHistoryRows.testIds';
import { REWARDS_PAUSED_BANNER_TEST_IDS } from '../components/Money/RewardsPausedBanner.testIds';
import { REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS } from './RewardsEarningsHistoryView.testIds';
import { getRouteParamsProbeTestId } from '../../../../../tests/component-view/render';
import { renderEarningsHistory } from '../../../../../tests/component-view/renderers/rewardsMoney';
import {
  EARNINGS_HISTORY_ROW,
  PENDING_CLAIM_FIXTURE,
  REFERRAL_LOCALIZED_TEXT,
  UNDER_REVIEW_EARNINGS_SUMMARY,
} from '../../../../../tests/component-view/presets/rewardsMoney';

describe('RewardsEarningsHistoryView', () => {
  it('lists an in-flight claim ahead of the settled ledger row', async () => {
    const { findByTestId, getAllByTestId } = renderEarningsHistory({
      persona: 'referee',
      claims: [PENDING_CLAIM_FIXTURE],
      history: [EARNINGS_HISTORY_ROW],
    });

    const pendingRow = await findByTestId(
      `${EARNINGS_HISTORY_TEST_IDS.ROW}-${PENDING_CLAIM_FIXTURE.id}`,
    );
    const settledRow = await findByTestId(
      `${EARNINGS_HISTORY_TEST_IDS.ROW}-${EARNINGS_HISTORY_ROW.id}`,
    );

    expect(
      within(pendingRow).getByText(REFERRAL_LOCALIZED_TEXT.historyClaimPending),
    ).toBeOnTheScreen();
    expect(within(pendingRow).getByText('-$2.50')).toBeOnTheScreen();
    expect(
      within(pendingRow).getByText(REFERRAL_LOCALIZED_TEXT.historyClaimed),
    ).toBeOnTheScreen();
    expect(
      within(settledRow).getByText(REFERRAL_LOCALIZED_TEXT.historyRebate),
    ).toBeOnTheScreen();
    expect(within(settledRow).getByText('+$1.00')).toBeOnTheScreen();
    expect(
      getAllByTestId(new RegExp(`^${EARNINGS_HISTORY_TEST_IDS.ROW}-`)).map(
        (row) => row.props.testID,
      ),
    ).toEqual([
      `${EARNINGS_HISTORY_TEST_IDS.ROW}-${PENDING_CLAIM_FIXTURE.id}`,
      `${EARNINGS_HISTORY_TEST_IDS.ROW}-${EARNINGS_HISTORY_ROW.id}`,
    ]);
  });

  it('hides the under-review banner during the history first load and shows it once the page arrives', async () => {
    // Matches the history screen: the banner stays off until the summary and
    // the first history page have both settled, then it renders above the rows.
    let releaseHistory: (page: {
      results: (typeof EARNINGS_HISTORY_ROW)[];
      has_more: boolean;
      cursor: null;
      window: null;
    }) => void = () => undefined;
    const historyPage = new Promise<{
      results: (typeof EARNINGS_HISTORY_ROW)[];
      has_more: boolean;
      cursor: null;
      window: null;
    }>((resolve) => {
      releaseHistory = resolve;
    });
    const { findByTestId, findByText, getByTestId, queryByTestId } =
      renderEarningsHistory({
        persona: 'referee',
        summary: UNDER_REVIEW_EARNINGS_SUMMARY,
        handlers: {
          'RewardsMoneyController:getEarningsLedger': () => historyPage,
        },
      });

    expect(
      await findByTestId(REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS.SKELETON_SLOT),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER),
    ).not.toBeOnTheScreen();

    await act(async () => {
      releaseHistory({
        results: [EARNINGS_HISTORY_ROW],
        has_more: false,
        cursor: null,
        window: null,
      });
    });

    expect(
      await findByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS.SKELETON_SLOT),
    ).not.toBeOnTheScreen();
    expect(
      await findByText(
        REFERRAL_LOCALIZED_TEXT.rewardsPausedBanner.replace(
          '{amount}',
          '$12.00',
        ),
      ),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER));

    const paramsProbe = await findByTestId(
      getRouteParamsProbeTestId(Routes.MODAL.REWARDS_INFO_SHEET_MODAL),
    );

    expect(JSON.parse(String(paramsProbe.props.children))).toEqual(
      expect.objectContaining({
        title: REFERRAL_LOCALIZED_TEXT.rewardsPausedTitle,
        description: REFERRAL_LOCALIZED_TEXT.rewardsPausedDescription,
      }),
    );
  });
});
