import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type {
  LedgerEarningEntryDto,
  ReferralLocalizedText,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { useCashbackLedger } from '../hooks/useCashbackLedger';
import { useSessionProfileId } from '../hooks/useReferralMe';
import { PERFORMANCE_ACTIVITY_TEST_IDS } from '../components/Money/PerformanceActivityRows';
import RewardsTradingRebatesView, {
  REWARDS_TRADING_REBATES_VIEW_TEST_IDS,
} from './RewardsTradingRebatesView';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  };
});

jest.mock('../hooks/useCashbackLedger');
jest.mock('../hooks/useReferralMe');

const PROFILE_ID = 'profile-a';
const LOCALIZED_TEXT = {
  tradingRebates: 'Trading rebates',
  rebatePerpsVolume: 'Perps volume',
  rebateSwaps: 'Swaps',
} as unknown as ReferralLocalizedText;

const REBATE: LedgerEarningEntryDto = {
  type: 'earning',
  id: 'e1',
  earning_origin_type: 'PERPS_FEE_CASHBACK',
  musd_amount: '1000000',
  fee_amount_usd: '1',
  entry_count: 1,
  transaction_hash: null,
  chain_id: null,
  ledger_timestamp: '2026-09-01T12:00:00.000Z',
  claim_status: 'unclaimed',
  claim_expires_at: null,
  swaps_source: null,
  perps_source: { coin: 'BTC', trade_id: 't1', tx_hash: null },
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

describe('RewardsTradingRebatesView', () => {
  const loadMore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSessionProfileId as jest.Mock).mockReturnValue({
      profileId: PROFILE_ID,
      isResolved: true,
    });
    (useCashbackLedger as jest.Mock).mockReturnValue({
      items: [REBATE],
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

  it('lists the session profile’s rebates under the localized title', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <RewardsTradingRebatesView />,
      { state: STATE },
    );

    expect(useCashbackLedger).toHaveBeenCalledWith(PROFILE_ID);
    expect(
      getByTestId(REWARDS_TRADING_REBATES_VIEW_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('Trading rebates')).toBeOnTheScreen();
    expect(getByText('Perps volume')).toBeOnTheScreen();
    expect(getByText('+$1')).toBeOnTheScreen();
    expect(
      getByTestId(`${PERFORMANCE_ACTIVITY_TEST_IDS.REBATE_ROW}-${REBATE.id}`),
    ).toBeOnTheScreen();

    fireEvent(
      getByTestId(REWARDS_TRADING_REBATES_VIEW_TEST_IDS.LIST),
      'endReached',
    );

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('renders no rows until localized text is available', () => {
    const { queryByTestId } = renderWithProvider(<RewardsTradingRebatesView />);

    expect(
      queryByTestId(`${PERFORMANCE_ACTIVITY_TEST_IDS.REBATE_ROW}-${REBATE.id}`),
    ).toBeNull();
  });
});
