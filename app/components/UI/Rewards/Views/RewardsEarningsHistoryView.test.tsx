import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type {
  LedgerEntryDto,
  ReferralLocalizedText,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import Routes from '../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { TRADING_ACTIVITY_LIST_EMPTY_TEST_ID } from '../components/Money/TradingActivityListView';
import { useEarningsHistory } from '../hooks/useEarningsHistory';
import { useSessionProfileId } from '../hooks/useReferralMe';
import { EARNINGS_HISTORY_TEST_IDS } from '../components/Money/EarningsHistoryRows';
import RewardsEarningsHistoryView, {
  REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS,
} from './RewardsEarningsHistoryView';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  };
});

jest.mock('../hooks/useEarningsHistory');
jest.mock('../hooks/useReferralMe');

const PROFILE_ID = 'profile-a';
const LOCALIZED_TEXT = {
  history: 'History',
  historyReferrals: 'Referral earning',
  historyCommission: 'Commission',
  historyRebate: 'Rebate',
  historyClaimed: 'Claimed',
  tradingActivityEmptyDescription:
    'Your activity is empty now. Start trading to earn today!',
  tradingActivityEmptyAction: 'Start trading',
} as unknown as ReferralLocalizedText;

const earning: LedgerEntryDto = {
  type: 'earning',
  id: 'earn-1',
  earning_origin_type: 'SWAPS_FEE_CASHBACK',
  musd_amount: '1000000',
  fee_amount_usd: '1',
  entry_count: 1,
  transaction_hash: null,
  chain_id: null,
  ledger_timestamp: '2026-09-01T00:00:00.000Z',
  claim_status: 'unclaimed',
  claim_expires_at: null,
  swaps_source: null,
  perps_source: null,
};

const STATE = {
  rewardsMoney: {
    referralMe: {
      [PROFILE_ID]: {
        loading: false,
        error: false,
        data: { localized_text: LOCALIZED_TEXT },
      },
    },
  },
};

describe('RewardsEarningsHistoryView', () => {
  const loadMore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSessionProfileId as jest.Mock).mockReturnValue({
      profileId: PROFILE_ID,
      isResolved: true,
    });
    (useEarningsHistory as jest.Mock).mockReturnValue({
      items: [earning],
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      error: null,
      loadMore,
      refresh: jest.fn(),
      retry: jest.fn(),
      isRefreshing: false,
    });
  });

  it('lists the unified feed under the localized history title', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <RewardsEarningsHistoryView />,
      { state: STATE },
    );

    expect(useEarningsHistory).toHaveBeenCalledWith(PROFILE_ID);
    expect(
      getByTestId(REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('History')).toBeOnTheScreen();
    expect(getByText('Rebate')).toBeOnTheScreen();
    expect(getByText('+$1.00')).toBeOnTheScreen();
    expect(
      getByTestId(`${EARNINGS_HISTORY_TEST_IDS.ROW}-${earning.id}`),
    ).toBeOnTheScreen();

    fireEvent(
      getByTestId(REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS.LIST),
      'endReached',
    );

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('opens the trade tray from the empty history action', () => {
    (useEarningsHistory as jest.Mock).mockReturnValue({
      items: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      error: null,
      loadMore,
      refresh: jest.fn(),
      retry: jest.fn(),
      isRefreshing: false,
    });

    const { getByTestId, getByText } = renderWithProvider(
      <RewardsEarningsHistoryView />,
      { state: STATE },
    );

    expect(
      getByText('Your activity is empty now. Start trading to earn today!'),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(`${TRADING_ACTIVITY_LIST_EMPTY_TEST_ID}-action`),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
    });
  });
});
