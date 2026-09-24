import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { ReferralLocalizedText } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { useCommissions } from '../hooks/useCommissions';
import { useSessionProfileId } from '../hooks/useReferralMe';
import RewardsTradingCommissionsView, {
  REWARDS_TRADING_COMMISSIONS_VIEW_TEST_IDS,
} from './RewardsTradingCommissionsView';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../hooks/useCommissions');
jest.mock('../hooks/useReferralMe');

const PROFILE_ID = 'profile-a';
const LOCALIZED_TEXT = {
  tradingCommissionsSection: 'Trading commissions',
  copiedOnce: 'Copied 1 time',
  copiedTimes: 'Copied {count} times',
} as unknown as ReferralLocalizedText;

describe('RewardsTradingCommissionsView', () => {
  const loadMore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useSessionProfileId as jest.Mock).mockReturnValue({
      profileId: PROFILE_ID,
      isResolved: true,
    });
    (useCommissions as jest.Mock).mockReturnValue({
      items: [
        {
          id: 'c1',
          earning_origin_type: 'SOCIAL_FOLLOW_TRADE',
          day: '2026-09-01',
          token: { key: 'perps:BTC', symbol: 'BTC', source: 'PERPS' },
          musd_amount: '2500000',
          fee_amount_usd: '10',
          fill_count: 3,
          copied_times: 2,
        },
      ],
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

  it('renders the full commissions list and loads the next page at the end', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <RewardsTradingCommissionsView />,
      {
        state: {
          rewardsMoney: {
            referralMe: {
              [PROFILE_ID]: {
                loading: false,
                error: false,
                data: { localized_text: LOCALIZED_TEXT },
              },
            },
          },
        },
      },
    );

    expect(
      getByTestId(REWARDS_TRADING_COMMISSIONS_VIEW_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('Trading commissions')).toBeOnTheScreen();
    expect(getByText('BTC')).toBeOnTheScreen();

    fireEvent(
      getByTestId(REWARDS_TRADING_COMMISSIONS_VIEW_TEST_IDS.LIST),
      'endReached',
    );

    expect(loadMore).toHaveBeenCalled();
  });
});
