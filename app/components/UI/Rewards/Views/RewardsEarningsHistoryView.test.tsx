import React from 'react';
import { FlatList } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import type {
  LedgerClaimEntryDto,
  EarningsSummaryDto,
  LedgerEntryDto,
  ReferralLocalizedText,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import ExtendedKeyringTypes from '../../../../constants/keyringTypes';
import Routes from '../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { TRADING_ACTIVITY_LIST_EMPTY_TEST_ID } from '../components/Money/TradingActivityListView';
import { useEarningsHistory } from '../hooks/useEarningsHistory';
import { useEarningsSummary } from '../hooks/useEarningsSummary';
import { REWARDS_PAUSED_BANNER_TEST_IDS } from '../components/Money/RewardsPausedBanner.testIds';
import { EARNINGS_HISTORY_TEST_IDS } from '../components/Money/EarningsHistoryRows.testIds';
import RewardsEarningsHistoryView from './RewardsEarningsHistoryView';
import { REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS } from './RewardsEarningsHistoryView.testIds';

const mockNavigate = jest.fn();

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

jest.mock('../hooks/useEarningsHistory');
jest.mock('../hooks/useEarningsSummary');
jest.mock('../hooks/useInFlightClaims', () => ({
  useInFlightClaims: () => ({ claims: [], refresh: jest.fn() }),
}));

const PROFILE_ID = 'profile-a';
const KEYRING_ID = 'entropy-source-1';
const LOCALIZED_TEXT = {
  history: 'History',
  historyReferrals: 'Referral earning',
  historyCommission: 'Commission',
  historyRebate: 'Rebate',
  historyClaimed: 'Claimed',
  tradingActivityEmptyDescription:
    'Your activity is empty now. Start trading to earn today!',
  tradingActivityEmptyAction: 'Start trading',
  rewardsPausedTitle: 'Rewards paused',
  rewardsPausedDescription:
    "We've paused these rewards while we review them. Your other rewards aren't affected, and you can still claim them as usual. You don't need to do anything.",
  rewardsPausedBanner: '{amount} of rewards paused.',
  rewardsPausedLearnMore: 'Learn more',
} as unknown as ReferralLocalizedText;

const earning: LedgerEntryDto = {
  type: 'earning',
  id: 'earn-1',
  earning_origin_type: 'SWAPS_FEE_CASHBACK',
  musd_amount: '1000000',
  voided_musd_amount: '0',
  fee_amount_usd: '1',
  entry_count: 1,
  transaction_hash: null,
  chain_id: null,
  ledger_timestamp: '2026-09-01T00:00:00.000Z',
  claim_status: 'unclaimed',
  claimable_at: '2026-09-02T00:00:00.000Z',
  swaps_source: null,
  perps_source: null,
  predict_source: null,
};

const claim: LedgerClaimEntryDto = {
  type: 'claim',
  id: earning.id,
  route: 'REFERRAL_REV_SHARE',
  gross_amount: '1000000',
  net_amount: '1000000',
  withholding_rate_bps: 0,
  status: 'SETTLED',
  ledger_timestamp: '2026-09-02T00:00:00.000Z',
  settled_at: '2026-09-02T00:00:00.000Z',
  payout_method: 'VOUCHER',
};

const UNDER_REVIEW_SUMMARY = {
  lifetime_total: '0',
  window: null,
  pending: '0',
  claimed: '0',
  minimum_musd_base_units: '1000000',
  pairing_pending: false,
  self_earned: {
    lifetime: '0',
    pending: '0',
    claimed: '0',
    by_claim_family: {
      REFERRAL_TRADE_FEE_CASHBACK: {
        lifetime: '0',
        pending: '0',
        claimed: '0',
        blocked: '9150000',
        blocking_reason: 'UNDER_REVIEW',
      },
    },
  },
  earned_by_others: {
    lifetime: '0',
    pending: '0',
    claimed: '0',
    by_claim_family: {},
  },
} as unknown as EarningsSummaryDto;

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
    earningsSummary: {},
  },
};

function underReviewState() {
  return {
    ...STATE,
    rewardsMoney: {
      ...STATE.rewardsMoney,
      earningsSummary: {
        [PROFILE_ID]: {
          loading: false,
          error: false,
          data: UNDER_REVIEW_SUMMARY,
        },
      },
    },
  };
}

describe('RewardsEarningsHistoryView', () => {
  const loadMore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useEarningsSummary as jest.Mock).mockReturnValue({
      fetchEarningsSummary: jest.fn(),
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

  it('hides the paused banner when the summary has no under-review total', () => {
    const { queryByTestId } = renderWithProvider(
      <RewardsEarningsHistoryView />,
      { state: STATE },
    );

    expect(queryByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER)).toBeNull();
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

  it('keys an earning and a claim that share an id apart', () => {
    (useEarningsHistory as jest.Mock).mockReturnValue({
      items: [earning, claim],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      error: null,
      loadMore,
      refresh: jest.fn(),
      retry: jest.fn(),
      isRefreshing: false,
    });

    const { UNSAFE_getByType } = renderWithProvider(
      <RewardsEarningsHistoryView />,
      { state: STATE },
    );
    const { keyExtractor } = UNSAFE_getByType(FlatList).props;

    expect(keyExtractor(earning)).toBe(`earning-${earning.id}`);
    expect(keyExtractor(claim)).toBe(`claim-${earning.id}`);
    expect(
      keyExtractor({
        kind: 'pending-claim',
        id: 'claim-open',
        net_amount: '1000000',
      }),
    ).toBe('pending-claim-open');
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

  it('hides the under-review banner while history is still on its first load', () => {
    (useEarningsHistory as jest.Mock).mockReturnValue({
      items: null,
      isLoading: true,
      isLoadingMore: false,
      hasMore: false,
      error: null,
      loadMore,
      refresh: jest.fn(),
      retry: jest.fn(),
      isRefreshing: false,
    });

    const { queryByTestId, getByTestId } = renderWithProvider(
      <RewardsEarningsHistoryView />,
      { state: underReviewState() },
    );

    expect(
      getByTestId(REWARDS_EARNINGS_HISTORY_VIEW_TEST_IDS.SKELETON_SLOT),
    ).toBeOnTheScreen();
    expect(queryByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER)).toBeNull();
  });

  it('keeps the under-review banner while a summary refresh is in flight', () => {
    const state = underReviewState();
    state.rewardsMoney.earningsSummary[PROFILE_ID].loading = true;

    const { getByTestId } = renderWithProvider(<RewardsEarningsHistoryView />, {
      state,
    });

    expect(
      getByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER),
    ).toBeOnTheScreen();
  });

  it('shows the under-review banner from the summary and opens the paused sheet', () => {
    const { getByTestId } = renderWithProvider(<RewardsEarningsHistoryView />, {
      state: underReviewState(),
    });

    expect(useEarningsSummary).toHaveBeenCalledWith(PROFILE_ID);
    expect(
      getByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER),
    ).toHaveTextContent('$9.15 of rewards paused.Learn more');

    fireEvent.press(getByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_INFO_SHEET_MODAL,
      {
        title: 'Rewards paused',
        description:
          "We've paused these rewards while we review them. Your other rewards aren't affected, and you can still claim them as usual. You don't need to do anything.",
      },
    );
  });
});
