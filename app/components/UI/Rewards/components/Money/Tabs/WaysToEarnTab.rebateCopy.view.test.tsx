/**
 * Rate copy and Predict-off coverage on the Ways to earn tab.
 *
 * C24: while Predict cashback is off, the served rebate copy names only swaps
 * and perps, and the history shows no Predict rows.
 * C19/C20/C21: the app renders the served rate copy verbatim — a 0% override
 * shows 0%, and a KOL or ended override shows the copy with no number.
 * E3: the history preview caps at five rows and the header opens the full list.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/components/Money/Tabs/WaysToEarnTab.rebateCopy.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import type { LedgerEntryDto } from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import { EARN_ACTION_SECTION_TEST_IDS } from './EarnActionSection.testIds';
import { EARNINGS_HISTORY_TEST_IDS } from '../EarningsHistoryRows.testIds';
import { WAYS_TO_EARN_TAB_TEST_IDS } from './WaysToEarnTab.testIds';
import { getRouteProbeTestId } from '../../../../../../../tests/component-view/render';
import { renderWaysToEarnTab } from '../../../../../../../tests/component-view/renderers/rewardsMoney';
import {
  earningRow,
  REFERRAL_LOCALIZED_TEXT,
  referralMeFixture,
} from '../../../../../../../tests/component-view/presets/rewardsMoney';

const COPY = REFERRAL_LOCALIZED_TEXT;

/** A perps cashback ledger row, the way the ledger returns it. */
function perpsEarningRow(index: number): LedgerEntryDto {
  return {
    ...earningRow(index),
    earning_origin_type: 'PERPS_FEE_CASHBACK',
  };
}

describe('WaysToEarnTab rate copy', () => {
  it('shows only the swaps and perps rebate copy while Predict cashback is off (C24)', async () => {
    const { findByTestId, getAllByTestId, queryByText } = renderWaysToEarnTab({
      persona: 'referee',
      referralMe: referralMeFixture('referee', {
        localizedText: {
          invitedBenefitTitle: '50% on Swaps and Perps',
        },
      }),
      history: [earningRow(0), perpsEarningRow(1)],
    });

    // Ways to earn names only swaps and perps. No Predict line is rendered.
    const tradingRow = await findByTestId(
      `${EARN_ACTION_SECTION_TEST_IDS.NEXT_STEPS_ROW}-trading`,
    );
    expect(within(tradingRow).getByText(COPY.tradeAndEarn)).toBeOnTheScreen();
    expect(
      within(tradingRow).getByText('50% on Swaps and Perps'),
    ).toBeOnTheScreen();
    expect(within(tradingRow).queryByText(COPY.rebatePredictions)).toBeNull();

    // The ledger carries no Predict rows while the feature is off, and no
    // Predictions row is rendered from what it did return.
    await waitFor(() => {
      expect(
        getAllByTestId(new RegExp(`^${EARNINGS_HISTORY_TEST_IDS.ROW}-`)),
      ).toHaveLength(2);
    });
    expect(queryByText(COPY.rebatePredictions)).not.toBeOnTheScreen();
    expect(
      getAllByTestId(new RegExp(`^${EARNINGS_HISTORY_TEST_IDS.ROW}-`)).map(
        (row) => row.props.testID,
      ),
    ).toEqual([
      `${EARNINGS_HISTORY_TEST_IDS.ROW}-earn-0`,
      `${EARNINGS_HISTORY_TEST_IDS.ROW}-earn-1`,
    ]);
  });

  it('shows the 0% override copy a cashback-experiment user is served (C19)', async () => {
    const { findByTestId } = renderWaysToEarnTab({
      persona: 'referee',
      referralMe: referralMeFixture('referee', {
        roles: ['CASHBACK_EXPERIMENT'],
        localizedText: {
          invitedBenefitTitle: '0% on Swaps and Perps',
        },
      }),
    });

    const tradingRow = await findByTestId(
      `${EARN_ACTION_SECTION_TEST_IDS.NEXT_STEPS_ROW}-trading`,
    );
    expect(
      within(tradingRow).getByText('0% on Swaps and Perps'),
    ).toBeOnTheScreen();
  });

  it('renders the served no-number copy for a KOL without injecting a rate (C20)', async () => {
    const servedCopy = 'Earn a share of eligible fees on Swaps and Perps';
    const { findByTestId } = renderWaysToEarnTab({
      persona: 'referee',
      referralMe: referralMeFixture('referee', {
        localizedText: {
          invitedBenefitTitle: servedCopy,
        },
      }),
    });

    const tradingRow = await findByTestId(
      `${EARN_ACTION_SECTION_TEST_IDS.NEXT_STEPS_ROW}-trading`,
    );
    expect(within(tradingRow).getByText(servedCopy)).toBeOnTheScreen();
    // The served copy carries no number, and the row renders no percentage
    // of its own: the row text is exactly the served copy.
    expect(within(tradingRow).queryByText(/%/, { exact: false })).toBeNull();
  });

  it('renders the no-number copy the same way once an override has ended (C21)', async () => {
    const servedCopy = 'Earn a share of eligible fees on Swaps and Perps';
    const { findByTestId } = renderWaysToEarnTab({
      persona: 'referee',
      referralMe: referralMeFixture('referee', {
        localizedText: {
          invitedBenefitTitle: servedCopy,
        },
      }),
    });

    const tradingRow = await findByTestId(
      `${EARN_ACTION_SECTION_TEST_IDS.NEXT_STEPS_ROW}-trading`,
    );
    expect(within(tradingRow).getByText(servedCopy)).toBeOnTheScreen();
    expect(within(tradingRow).queryByText(/%/, { exact: false })).toBeNull();
  });
});

describe('WaysToEarnTab history preview', () => {
  it('caps the history preview at five rows and opens the full list (E3)', async () => {
    const history = Array.from({ length: 8 }, (_, index) => earningRow(index));
    const { findByTestId, getByTestId, getAllByTestId } = renderWaysToEarnTab({
      persona: 'referee',
      history,
    });

    await waitFor(() => {
      expect(
        getAllByTestId(new RegExp(`^${EARNINGS_HISTORY_TEST_IDS.ROW}-`)),
      ).toHaveLength(5);
    });

    fireEvent.press(getByTestId(WAYS_TO_EARN_TAB_TEST_IDS.HISTORY_HEADER));

    expect(
      await findByTestId(
        getRouteProbeTestId(Routes.REWARDS_EARNINGS_HISTORY_VIEW),
      ),
    ).toBeOnTheScreen();
  });
});
