import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type {
  CommissionEntryView,
  ReferralLocalizedText,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { useCommissions } from '../hooks/useCommissions';
import { useSessionProfileId } from '../hooks/useReferralMe';
import { PERFORMANCE_ACTIVITY_TEST_IDS } from '../components/Money/PerformanceActivityRows';
import RewardsTradingCommissionsView, {
  REWARDS_TRADING_COMMISSIONS_VIEW_TEST_IDS,
} from './RewardsTradingCommissionsView';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  };
});

jest.mock('../hooks/useCommissions');
jest.mock('../hooks/useReferralMe');

const PROFILE_ID = 'profile-a';
const LOCALIZED_TEXT = {
  tradingCommissionsSection: 'Trading commissions',
  tradeCommissions: 'Trade commissions',
  copiedOnce: 'Copied 1 time',
  copiedTimes: 'Copied {count} times',
} as unknown as ReferralLocalizedText;

const COMMISSION: CommissionEntryView = {
  id: 'c1',
  earning_origin_type: 'SOCIAL_FOLLOW_TRADE',
  day: '2026-09-01',
  token: { key: 'perps:BTC', symbol: 'BTC', source: 'PERPS' },
  musd_amount: '2500000',
  fee_amount_usd: '10',
  fill_count: 3,
  copied_times: 2,
};

const stateWith = (localizedText: Partial<ReferralLocalizedText>) => ({
  rewardsMoney: {
    referralMe: {
      [PROFILE_ID]: {
        loading: false,
        error: false,
        data: { localized_text: localizedText },
      },
    },
  },
});

describe('RewardsTradingCommissionsView', () => {
  const loadMore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSessionProfileId as jest.Mock).mockReturnValue({
      profileId: PROFILE_ID,
      isResolved: true,
    });
    (useCommissions as jest.Mock).mockReturnValue({
      items: [COMMISSION],
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

  it('lists the session profile’s commissions under the localized section title', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <RewardsTradingCommissionsView />,
      { state: stateWith(LOCALIZED_TEXT) },
    );

    expect(useCommissions).toHaveBeenCalledWith(PROFILE_ID);
    expect(
      getByTestId(REWARDS_TRADING_COMMISSIONS_VIEW_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('Trading commissions')).toBeOnTheScreen();
    expect(getByText('BTC')).toBeOnTheScreen();
    expect(getByText('Copied 2 times')).toBeOnTheScreen();
    expect(
      getByTestId(
        `${PERFORMANCE_ACTIVITY_TEST_IDS.COMMISSION_ROW}-${COMMISSION.id}`,
      ),
    ).toBeOnTheScreen();

    fireEvent(
      getByTestId(REWARDS_TRADING_COMMISSIONS_VIEW_TEST_IDS.LIST),
      'endReached',
    );

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('falls back to the trade commissions label when the section title is missing', () => {
    const { tradingCommissionsSection: _omitted, ...rest } = LOCALIZED_TEXT;

    const { getByText } = renderWithProvider(
      <RewardsTradingCommissionsView />,
      { state: stateWith(rest) },
    );

    expect(getByText('Trade commissions')).toBeOnTheScreen();
  });

  it('renders no rows until localized text is available', () => {
    const { queryByTestId } = renderWithProvider(
      <RewardsTradingCommissionsView />,
    );

    expect(
      queryByTestId(
        `${PERFORMANCE_ACTIVITY_TEST_IDS.COMMISSION_ROW}-${COMMISSION.id}`,
      ),
    ).toBeNull();
  });
});
