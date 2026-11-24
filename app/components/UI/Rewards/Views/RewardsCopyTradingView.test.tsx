import React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import { AvatarIcon, IconName } from '@metamask/design-system-react-native';
import type {
  CommissionEntryView,
  SummaryTotalsDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import ExtendedKeyringTypes from '../../../../constants/keyringTypes';
import {
  CLAIMABLE_EARNINGS_SUMMARY,
  REFERRAL_LOCALIZED_TEXT as LOCALIZED_TEXT,
} from '../../../../../tests/component-view/presets/rewardsMoney';
import { useCommissions } from '../hooks/useCommissions';
import { EARN_ACTION_HEADER_TEST_IDS } from '../components/Money/EarnActionHeader.testIds';
import { EARN_FAMILY_EARNINGS_TEST_IDS } from '../components/Money/EarnFamilyEarningsSection.testIds';
import { REWARDS_HELD_BANNER_TEST_IDS } from '../components/Money/RewardsHeldBanner.testIds';
import { REWARDS_PAUSED_BANNER_TEST_IDS } from '../components/Money/RewardsPausedBanner.testIds';
import { PERFORMANCE_ACTIVITY_TEST_IDS } from '../components/Money/PerformanceActivityRows.testIds';
import { TRADING_ACTIVITY_LIST_EMPTY_TEST_ID } from '../components/Money/TradingActivityListView';
import RewardsCopyTradingView, {
  REWARDS_COPY_TRADING_VIEW_TEST_IDS,
} from './RewardsCopyTradingView';

const mockNavigate = jest.fn();
const mockOpenComposer = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  };
});

jest.mock('../../../Views/ErrorBoundary', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock(
  '../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer',
  () => ({
    useOpenSocialPostComposer: () => ({ openComposer: mockOpenComposer }),
  }),
);
jest.mock('../hooks/useCommissions');
jest.mock('../hooks/useEarningsSummary', () => ({
  useEarningsSummary: () => ({ fetchEarningsSummary: jest.fn() }),
}));

const PROFILE_ID = 'profile-a';
const KEYRING_ID = 'entropy-source-1';

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

const STATE = {
  engine: {
    backgroundState: {
      AuthenticationController: {
        isSignedIn: true,
        srpSessionData: {
          [KEYRING_ID]: {
            profile: { profileId: PROFILE_ID },
          },
        },
      },
      KeyringController: {
        isUnlocked: true,
        keyrings: [
          {
            type: ExtendedKeyringTypes.hd,
            accounts: [],
            metadata: { id: KEYRING_ID, name: '' },
          },
        ],
      },
    },
  },
  rewardsMoney: {
    referralMe: {
      [PROFILE_ID]: {
        loading: false,
        error: false,
        data: { localized_text: LOCALIZED_TEXT },
      },
    },
    earningsSummary: {
      [PROFILE_ID]: {
        loading: false,
        error: false,
        data: CLAIMABLE_EARNINGS_SUMMARY,
      },
    },
  },
};

const listResult = (items: CommissionEntryView[], hasMore: boolean) => ({
  items,
  isLoading: false,
  isLoadingMore: false,
  hasMore,
  error: null,
  loadMore: jest.fn(),
  refresh: jest.fn(),
  retry: jest.fn(),
  isRefreshing: false,
});

describe('RewardsCopyTradingView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCommissions as jest.Mock).mockReturnValue(
      listResult([COMMISSION], true),
    );
  });

  it('lists the session profile’s commissions under the localized section title', () => {
    const result = listResult([COMMISSION], true);
    (useCommissions as jest.Mock).mockReturnValue(result);

    const { getByTestId, getByText } = renderWithProvider(
      <RewardsCopyTradingView />,
      { state: STATE },
    );

    expect(useCommissions).toHaveBeenCalledWith(PROFILE_ID);
    expect(
      getByTestId(REWARDS_COPY_TRADING_VIEW_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByText(LOCALIZED_TEXT.tradingCommissionsSection),
    ).toBeOnTheScreen();
    expect(getByText('BTC')).toBeOnTheScreen();
    expect(getByText('Copied 2 times')).toBeOnTheScreen();
    expect(
      getByTestId(
        `${PERFORMANCE_ACTIVITY_TEST_IDS.COMMISSION_ROW}-${COMMISSION.id}`,
      ),
    ).toBeOnTheScreen();

    fireEvent(
      getByTestId(REWARDS_COPY_TRADING_VIEW_TEST_IDS.LIST),
      'endReached',
    );

    expect(result.loadMore).toHaveBeenCalledTimes(1);
  });

  it('shows the copy trading title, description and earnings above the list', () => {
    const { getByTestId } = renderWithProvider(<RewardsCopyTradingView />, {
      state: STATE,
    });

    expect(getByTestId(EARN_ACTION_HEADER_TEST_IDS.TITLE)).toHaveTextContent(
      LOCALIZED_TEXT.copyTradingInfoDescription,
    );
    expect(
      getByTestId(EARN_ACTION_HEADER_TEST_IDS.DESCRIPTION),
    ).toHaveTextContent(LOCALIZED_TEXT.copyTradingDescription);
    expect(
      getByTestId(EARN_FAMILY_EARNINGS_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('shows the held banner for this family only, below the history title', () => {
    const family: SummaryTotalsDto = {
      lifetime: '56000000',
      pending: '0',
      claimed: '0',
      voided: '0',
      held: '56000000',
      blocking_reason: 'TAX_DETERMINATION_REQUIRED',
    };
    const state = {
      ...STATE,
      rewardsMoney: {
        ...STATE.rewardsMoney,
        earningsSummary: {
          [PROFILE_ID]: {
            loading: false,
            error: false,
            data: {
              ...CLAIMABLE_EARNINGS_SUMMARY,
              self_earned: {
                ...CLAIMABLE_EARNINGS_SUMMARY.self_earned,
                by_claim_family: {
                  REFERRAL_TRADE_FEE_CASHBACK: {
                    ...family,
                    by_address: [],
                    held: '9000000',
                    blocking_reason: 'SUSPENDED' as const,
                  },
                },
              },
              earned_by_others: {
                ...CLAIMABLE_EARNINGS_SUMMARY.earned_by_others,
                by_claim_family: { SOCIAL_FOLLOW_TRADE: family },
              },
            },
          },
        },
      },
    };

    const { getByTestId, queryByTestId } = renderWithProvider(
      <RewardsCopyTradingView />,
      { state },
    );

    expect(getByTestId(REWARDS_HELD_BANNER_TEST_IDS.BANNER)).toHaveTextContent(
      '$56.00 of rewards held.Learn more',
    );
    expect(queryByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER)).toBeNull();
  });

  it('opens the composer from the header action', () => {
    const { getByTestId } = renderWithProvider(<RewardsCopyTradingView />, {
      state: STATE,
    });

    fireEvent.press(getByTestId(EARN_ACTION_HEADER_TEST_IDS.CTA));

    expect(mockOpenComposer).toHaveBeenCalledTimes(1);
  });

  it('renders no rows until localized text is available', () => {
    const { queryByTestId } = renderWithProvider(<RewardsCopyTradingView />, {
      state: {
        ...STATE,
        rewardsMoney: {
          ...STATE.rewardsMoney,
          referralMe: {
            [PROFILE_ID]: { loading: false, error: false, data: null },
          },
        },
      },
    });

    expect(
      queryByTestId(
        `${PERFORMANCE_ACTIVITY_TEST_IDS.COMMISSION_ROW}-${COMMISSION.id}`,
      ),
    ).toBeNull();
    expect(queryByTestId(EARN_ACTION_HEADER_TEST_IDS.CTA)).toBeNull();
  });

  it('shows the people icon on the copy-trading empty state', () => {
    (useCommissions as jest.Mock).mockReturnValue(listResult([], false));

    const { getByTestId } = renderWithProvider(<RewardsCopyTradingView />, {
      state: STATE,
    });

    expect(
      within(getByTestId(TRADING_ACTIVITY_LIST_EMPTY_TEST_ID)).UNSAFE_getByType(
        AvatarIcon,
      ).props.iconName,
    ).toBe(IconName.People);
  });
});
