import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import type {
  EarningsSummaryDto,
  LedgerEntryDto,
  ReferralLocalizedText,
  ReferralMeDto,
} from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import Routes from '../../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { navigateToRewardsRoute } from '../../../utils';
import { useEarningsSummary } from '../../../hooks/useEarningsSummary';
import { useLast7DaysEarnings } from '../../../hooks/useLast7DaysEarnings';
import { useEarningsHistory } from '../../../hooks/useEarningsHistory';
import { TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS } from '../TradingActivityListSkeleton.testIds';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from '../ClaimableRewardsCard.testIds';
import { EARNINGS_HISTORY_TEST_IDS } from '../EarningsHistoryRows.testIds';
import { REWARDS_PAUSED_BANNER_TEST_IDS } from '../RewardsPausedBanner.testIds';
import EarningsTab from './EarningsTab';
import { EARNINGS_TAB_TEST_IDS } from './EarningsTab.testIds';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
    }),
  };
});

jest.mock('../../../utils', () => ({
  navigateToRewardsRoute: jest.fn(),
}));

jest.mock('../../../hooks/useEarningsSummary');
jest.mock('../../../hooks/useLast7DaysEarnings');
jest.mock('../../../hooks/useEarningsHistory');
const mockClaimEarningsHandlers: { onClaimsPaused?: () => void } = {};

jest.mock('../../../hooks/useClaimEarnings', () => ({
  useClaimEarnings: (
    _profileId: string,
    options: { onClaimsPaused?: () => void },
  ) => {
    mockClaimEarningsHandlers.onClaimsPaused = options.onClaimsPaused;
    return {
      claim: jest.fn(),
      isClaiming: false,
      isClaimWaiting: false,
    };
  },
}));
jest.mock('../../../hooks/useInFlightClaims', () => ({
  useInFlightClaims: () => ({ claims: [], refresh: jest.fn() }),
}));

const PROFILE_ID = 'profile-a';

const LOCALIZED_TEXT = {
  availableToClaim: 'Available to claim',
  balance: 'Balance',
  mUSD: 'mUSD',
  claim: 'Claim',
  paused: 'Paused',
  claimed: 'Claimed',
  held: 'Held',
  blocked: 'Blocked',
  voided: 'Voided',
  pending: 'Pending',
  claimsPausedTitle: 'Claims paused',
  claimsPausedDescription: 'You cannot claim rewards right now.',
  rewardsPausedTitle: 'Rewards paused',
  rewardsPausedDescription:
    "We've paused these rewards while we review them. Your other rewards aren't affected, and you can still claim them as usual. You don't need to do anything.",
  rewardsPausedBanner: '{amount} of rewards paused.',
  rewardsPausedLearnMore: 'Learn more',
  last7Days: 'Last 7 days',
  recordedEarnings: 'Recorded earnings',
  totalEarningsLabel: 'Total earnings',
  breakdown: 'Breakdown',
  referrals: 'Referrals',
  tradeCommissions: 'Trade commissions',
  tradingCommissionsSection: 'Trading commissions',
  tradingRebates: 'Trading rebates',
  history: 'History',
  historyReferrals: 'Referral earning',
  historyCommission: 'Commission',
  historyRebate: 'Rebate',
  historyClaimed: 'Claimed',
  tradingActivityEmptyDescription:
    'Your activity is empty now. Start trading to earn today!',
  tradingActivityEmptyAction: 'Start trading',
} as unknown as ReferralLocalizedText;

const branch = (lifetime: string) => ({
  lifetime,
  pending: '0',
  claimed: '0',
  forfeited: '0',
});

const SUMMARY = {
  lifetime_total: '58500000',
  window: null,
  claimable: '0',
  held: '0',
  blocked: '0',
  pending: '0',
  claimed: '0',
  forfeited: '0',
  minimum_musd_base_units: '1000000',
  self_earned: {
    ...branch('7650000'),
    by_claim_family: {
      REFERRAL_TRADE_FEE_CASHBACK: branch('7650000'),
    },
  },
  earned_by_others: {
    ...branch('50900000'),
    by_claim_family: {
      REFERRAL_REV_SHARE: branch('41750000'),
      SOCIAL_FOLLOW_TRADE: branch('9150000'),
    },
  },
} as unknown as EarningsSummaryDto;

const LAST_7 = {
  ...SUMMARY,
  lifetime_total: '2000000',
  window: { from: '2026-09-22', to: '2026-09-28' },
} as EarningsSummaryDto;

const earning: LedgerEntryDto = {
  type: 'earning',
  id: 'earn-1',
  earning_origin_type: 'REFERRAL_REV_SHARE',
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

const claim: LedgerEntryDto = {
  type: 'claim',
  id: 'claim-1',
  route: 'REFERRAL_REV_SHARE',
  gross_amount: '2500000',
  net_amount: '2500000',
  withholding_rate_bps: 0,
  status: 'SETTLED',
  ledger_timestamp: '2026-09-02T00:00:00.000Z',
  settled_at: null,
  payout_method: 'VOUCHER',
};

const emptyList = {
  items: [] as LedgerEntryDto[] | null,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  error: null as string | null,
  loadMore: jest.fn(),
  refresh: jest.fn(),
  retry: jest.fn(),
  isRefreshing: false,
};

const fetchEarningsSummary = jest.fn();
const retryLast7 = jest.fn();
const retryHistory = jest.fn();

const renderTab = (
  persona: 'referrer' | 'referee' | 'plain',
  {
    summary = SUMMARY,
    summaryLoading = false,
    summaryError = false,
    last7 = LAST_7,
    last7Loading = false,
    last7Error = false,
    historyItems = [earning, claim] as LedgerEntryDto[] | null,
    historyLoading = false,
    historyError = null as string | null,
    onViewPerformance = jest.fn(),
  }: {
    summary?: EarningsSummaryDto | null;
    summaryLoading?: boolean;
    summaryError?: boolean;
    last7?: EarningsSummaryDto | null;
    last7Loading?: boolean;
    last7Error?: boolean;
    historyItems?: LedgerEntryDto[] | null;
    historyLoading?: boolean;
    historyError?: string | null;
    onViewPerformance?: () => void;
  } = {},
) => {
  (useEarningsSummary as jest.Mock).mockReturnValue({ fetchEarningsSummary });
  (useLast7DaysEarnings as jest.Mock).mockReturnValue({
    data: last7,
    isLoading: last7Loading,
    error: last7Error,
    retry: retryLast7,
  });
  (useEarningsHistory as jest.Mock).mockReturnValue({
    ...emptyList,
    items: historyItems,
    isLoading: historyLoading,
    error: historyError,
    retry: retryHistory,
  });

  return renderWithProvider(
    <EarningsTab
      profileId={PROFILE_ID}
      persona={persona}
      onViewPerformance={onViewPerformance}
    />,
    {
      state: {
        rewardsMoney: {
          referralMe: {
            [PROFILE_ID]: {
              loading: false,
              error: false,
              data: {
                localized_text: LOCALIZED_TEXT,
              } as ReferralMeDto,
            },
          },
          earningsSummary: {
            [PROFILE_ID]: {
              loading: summaryLoading,
              error: summaryError,
              data: summary,
            },
          },
        },
      },
    },
  );
};

describe('EarningsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the breakdown for a referrer and hides the claimable amount row', () => {
    const { getByText, getByTestId, queryByTestId, queryByText } =
      renderTab('referrer');

    expect(getByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN)).toBeOnTheScreen();
    expect(
      getByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-referrals`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-social`),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-trading`),
    ).toBeNull();
    expect(getByText('Referrals')).toBeOnTheScreen();
    expect(getByText('Trading commissions')).toBeOnTheScreen();
    expect(getByText('$41.75')).toBeOnTheScreen();
    expect(getByText('$9.15')).toBeOnTheScreen();
    expect(queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT)).toBeNull();
    expect(queryByText('Available to claim')).toBeNull();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.LAST_7_DAYS),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.RECORDED),
    ).toBeOnTheScreen();
    expect(getByText('$2.00')).toBeOnTheScreen();
    expect(getByText('$58.50')).toBeOnTheScreen();
  });

  it('shows the breakdown for a referee and keeps the claimable amount', () => {
    const { getByText, getByTestId, queryByText } = renderTab('referee');

    expect(getByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN)).toBeOnTheScreen();
    expect(
      getByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-trading`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(`${EARNINGS_TAB_TEST_IDS.BREAKDOWN_ROW}-social`),
    ).toBeOnTheScreen();
    expect(getByText('Trading commissions')).toBeOnTheScreen();
    expect(queryByText('Trading rebates')).toBeNull();
    expect(queryByText('Referrals')).toBeNull();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toBeOnTheScreen();
  });

  it('omits the breakdown for a plain persona', () => {
    const { queryByTestId, getByTestId } = renderTab('plain');

    expect(queryByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN)).toBeNull();
    expect(getByTestId(EARNINGS_TAB_TEST_IDS.HISTORY)).toBeOnTheScreen();
  });

  it('shows Balance from lifetime and Paused for a referee whose claims are held', () => {
    const summary = {
      ...SUMMARY,
      claimable: '0',
      held: '100000000',
      claimed: '0',
    };
    const { getByTestId, getByText, queryByTestId } = renderTab('referee', {
      summary,
    });

    expect(getByText('Balance • mUSD')).toBeOnTheScreen();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$58.50');
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeNull();

    fireEvent.press(getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON));
    expect(fetchEarningsSummary).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL,
      {
        title: 'Claims paused',
        description: 'You cannot claim rewards right now.',
        totals: {
          lifetime_total: '58500000',
          claimable: '0',
          held: '100000000',
          blocked: '0',
          voided: undefined,
          pending: '0',
          claimed: '0',
        },
        labels: {
          breakdown: 'Breakdown',
          recordedEarningsLabel: 'Total earnings',
          availableToClaim: 'Available to claim',
          held: 'Held',
          blocked: 'Blocked',
          voided: 'Voided',
          pending: 'Pending',
          claimed: 'Claimed',
        },
      },
    );
  });

  it('keeps Claim when cashback is claimable and held and blocked are positive', () => {
    const { getByTestId, queryByTestId } = renderTab('referee', {
      summary: {
        ...SUMMARY,
        lifetime_total: '132000000',
        claimable: '1000000',
        held: '100000000',
        blocked: '12000000',
        self_earned: {
          ...SUMMARY.self_earned,
          blocking_reason: 'SUSPENDED',
          by_claim_family: {
            REFERRAL_TRADE_FEE_CASHBACK: {
              ...SUMMARY.self_earned.by_claim_family
                .REFERRAL_TRADE_FEE_CASHBACK,
              claimable: '1000000',
            },
          },
        },
      },
    });

    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$1.00');
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeNull();
  });

  it('opens the balance breakdown from the info button while Claim is shown', () => {
    const { getByTestId } = renderTab('referee', {
      summary: {
        ...SUMMARY,
        lifetime_total: '132000000',
        claimable: '1000000',
        held: '100000000',
        blocked: '12000000',
        self_earned: {
          ...SUMMARY.self_earned,
          blocking_reason: 'SUSPENDED',
          by_claim_family: {
            REFERRAL_TRADE_FEE_CASHBACK: {
              ...SUMMARY.self_earned.by_claim_family
                .REFERRAL_TRADE_FEE_CASHBACK,
              claimable: '1000000',
            },
          },
        },
      },
    });

    fireEvent.press(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.BALANCE_BREAKDOWN),
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL,
      {
        variant: 'breakdown',
        title: 'Breakdown',
        totals: {
          lifetime_total: '132000000',
          claimable: '1000000',
          held: '100000000',
          blocked: '12000000',
          voided: undefined,
          pending: '0',
          claimed: '0',
        },
        labels: {
          breakdown: 'Breakdown',
          recordedEarningsLabel: 'Total earnings',
          availableToClaim: 'Available to claim',
          held: 'Held',
          blocked: 'Blocked',
          voided: 'Voided',
          pending: 'Pending',
          claimed: 'Claimed',
        },
      },
    );
  });

  it('shows Paused for blocked cashback with nothing held', () => {
    const { getByTestId, queryByTestId } = renderTab('referee', {
      summary: {
        ...SUMMARY,
        claimable: '0',
        held: '0',
        blocked: '12000000',
      },
    });

    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.AMOUNT),
    ).toHaveTextContent('$58.50');
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeNull();
  });

  it('opens the paused sheet with the summary the refresh returns', async () => {
    const refreshed = {
      ...SUMMARY,
      claimable: '0',
      held: '12000000',
      blocked: '0',
    };
    fetchEarningsSummary.mockResolvedValue(refreshed);
    renderTab('referee', {
      summary: {
        ...SUMMARY,
        claimable: '12000000',
        held: '0',
        blocked: '0',
        self_earned: {
          ...SUMMARY.self_earned,
          by_claim_family: {
            REFERRAL_TRADE_FEE_CASHBACK: {
              ...SUMMARY.self_earned.by_claim_family
                .REFERRAL_TRADE_FEE_CASHBACK,
              claimable: '12000000',
            },
          },
        },
      },
    });

    mockClaimEarningsHandlers.onClaimsPaused?.();

    expect(fetchEarningsSummary).toHaveBeenCalledWith({ forceFresh: true });
    expect(mockNavigate).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL,
        expect.objectContaining({
          title: 'Claims paused',
          totals: expect.objectContaining({
            lifetime_total: '58500000',
            claimable: '0',
            held: '12000000',
            blocked: '0',
          }),
        }),
      );
    });
  });

  it('leaves the paused sheet closed when the refresh returns no summary', async () => {
    fetchEarningsSummary.mockResolvedValue(undefined);
    renderTab('referee', {
      summary: {
        ...SUMMARY,
        claimable: '12000000',
        held: '0',
        blocked: '0',
      },
    });

    mockClaimEarningsHandlers.onClaimsPaused?.();
    await waitFor(() => {
      expect(fetchEarningsSummary).toHaveBeenCalledWith({ forceFresh: true });
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens the paused sheet with the on-screen summary when the refresh fails', async () => {
    fetchEarningsSummary.mockRejectedValue(new Error('network'));
    renderTab('referee', {
      summary: {
        ...SUMMARY,
        claimable: '12000000',
        held: '0',
        blocked: '0',
      },
    });

    mockClaimEarningsHandlers.onClaimsPaused?.();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.REWARDS_MONEY_CLAIMS_PAUSED_MODAL,
        expect.objectContaining({
          totals: expect.objectContaining({
            lifetime_total: '58500000',
            claimable: '12000000',
            held: '0',
            blocked: '0',
          }),
        }),
      );
    });
  });

  it('does not show Paused for a referrer with a positive hold', () => {
    const { queryByTestId } = renderTab('referrer', {
      summary: { ...SUMMARY, claimable: '0', held: '100000000', claimed: '50' },
    });

    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.PAUSED_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeNull();
  });

  it('hides the button when nothing is claimable or claimed', () => {
    const { queryByTestId } = renderTab('referrer');

    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeNull();
  });

  it('mixes earning and claim rows and caps the preview at five', () => {
    const historyItems = Array.from({ length: 8 }, (_, index) =>
      index % 2 === 0
        ? { ...earning, id: `earn-${index}` }
        : { ...claim, id: `claim-${index}` },
    );

    const { getAllByTestId, getAllByText } = renderTab('referrer', {
      historyItems,
    });

    expect(
      getAllByTestId(new RegExp(EARNINGS_HISTORY_TEST_IDS.ROW)),
    ).toHaveLength(5);
    expect(getAllByText('Referral earning').length).toBeGreaterThan(0);
    expect(getAllByText('Claimed').length).toBeGreaterThan(0);
  });

  it('shows an empty history message and keeps the header from navigating', () => {
    const { getByTestId, getByText, queryByRole, queryByTestId } = renderTab(
      'referrer',
      { historyItems: [] },
    );

    expect(getByTestId(EARNINGS_TAB_TEST_IDS.HISTORY_EMPTY)).toBeOnTheScreen();
    expect(
      getByText('Your activity is empty now. Start trading to earn today!'),
    ).toBeOnTheScreen();
    expect(queryByTestId(EARNINGS_TAB_TEST_IDS.HISTORY)).toBeNull();
    expect(queryByRole('button', { name: 'History' })).toBeNull();

    fireEvent.press(getByTestId(EARNINGS_TAB_TEST_IDS.HISTORY_HEADER));
    fireEvent.press(
      getByTestId(`${EARNINGS_TAB_TEST_IDS.HISTORY_EMPTY}-action`),
    );

    expect(navigateToRewardsRoute).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
    });
  });

  it('opens performance from the breakdown and history from its header', () => {
    const onViewPerformance = jest.fn();
    const { getByTestId } = renderTab('referrer', {
      onViewPerformance,
    });

    fireEvent.press(getByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN_HEADER));

    expect(onViewPerformance).toHaveBeenCalledTimes(1);
    expect(navigateToRewardsRoute).not.toHaveBeenCalled();

    fireEvent.press(getByTestId(EARNINGS_TAB_TEST_IDS.HISTORY_HEADER));

    expect(navigateToRewardsRoute).toHaveBeenCalledWith(
      expect.anything(),
      Routes.REWARDS_EARNINGS_HISTORY_VIEW,
    );
  });

  it('skeletons the card and history while each is loading', () => {
    const { getByTestId, queryByTestId, queryByText } = renderTab('referrer', {
      summary: null,
      summaryLoading: true,
      last7: null,
      last7Loading: true,
      historyItems: null,
      historyLoading: true,
    });

    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.SKELETON),
    ).toBeOnTheScreen();
    expect(queryByText('Available to claim')).toBeNull();
    expect(
      getByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN_SKELETON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(queryByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN)).toBeNull();
    expect(queryByTestId(EARNINGS_TAB_TEST_IDS.HISTORY)).toBeNull();
    expect(queryByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER)).toBeNull();
  });

  it('hides the paused banner while history is still a skeleton', () => {
    const { getByTestId, queryByTestId } = renderTab('referrer', {
      summary: {
        ...SUMMARY,
        self_earned: {
          ...SUMMARY.self_earned,
          by_claim_family: {
            REFERRAL_TRADE_FEE_CASHBACK: {
              ...SUMMARY.self_earned.by_claim_family
                .REFERRAL_TRADE_FEE_CASHBACK,
              blocked: '9150000',
              blocking_reason: 'UNDER_REVIEW',
            },
          },
        },
      },
      historyItems: null,
      historyLoading: true,
    });

    expect(
      getByTestId(TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(queryByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER)).toBeNull();
  });

  it('keeps cached earnings without an error banner', () => {
    const { getByTestId, queryByTestId, queryByText } = renderTab('referrer', {
      summaryError: true,
      last7Error: true,
      historyError: 'failed',
    });

    expect(queryByTestId(EARNINGS_TAB_TEST_IDS.SUMMARY_ERROR)).toBeNull();
    expect(queryByTestId(EARNINGS_TAB_TEST_IDS.LAST_7_ERROR)).toBeNull();
    expect(queryByTestId(EARNINGS_TAB_TEST_IDS.HISTORY_ERROR)).toBeNull();
    expect(queryByText('Referral details couldn’t be loaded')).toBeNull();
    expect(queryByText('Error loading your transactions')).toBeNull();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByTestId(EARNINGS_TAB_TEST_IDS.HISTORY)).toBeOnTheScreen();
  });

  it('shows one summary banner and retries only that source', () => {
    const { getByTestId, getByText, queryByTestId } = renderTab('referrer', {
      summary: null,
      summaryError: true,
      last7Error: true,
      historyError: 'failed',
    });

    expect(getByTestId(EARNINGS_TAB_TEST_IDS.SUMMARY_ERROR)).toBeOnTheScreen();
    expect(queryByTestId(EARNINGS_TAB_TEST_IDS.LAST_7_ERROR)).toBeNull();
    expect(queryByTestId(EARNINGS_TAB_TEST_IDS.HISTORY_ERROR)).toBeNull();
    expect(getByText('Referral details couldn’t be loaded')).toBeOnTheScreen();
    expect(getByTestId(EARNINGS_TAB_TEST_IDS.HISTORY)).toBeOnTheScreen();

    fireEvent.press(getByText('Retry'));

    expect(fetchEarningsSummary).toHaveBeenCalledWith({ forceFresh: true });
    expect(retryLast7).not.toHaveBeenCalled();
    expect(retryHistory).not.toHaveBeenCalled();
  });

  it('retries last 7 days when that is the only failure', () => {
    const { getByTestId, getByText } = renderTab('referrer', {
      last7: null,
      last7Error: true,
    });

    expect(getByTestId(EARNINGS_TAB_TEST_IDS.LAST_7_ERROR)).toBeOnTheScreen();
    expect(getByText('—')).toBeOnTheScreen();

    fireEvent.press(getByText('Retry'));

    expect(retryLast7).toHaveBeenCalledTimes(1);
    expect(fetchEarningsSummary).not.toHaveBeenCalled();
  });

  it('hides history when it failed and nothing is cached', () => {
    const { queryByTestId, getByTestId } = renderTab('referrer', {
      historyItems: [],
      historyError: 'failed',
    });

    expect(queryByTestId(EARNINGS_TAB_TEST_IDS.HISTORY_HEADER)).toBeNull();
    expect(getByTestId(EARNINGS_TAB_TEST_IDS.HISTORY_ERROR)).toBeOnTheScreen();
  });

  it('keeps the summary error banner up while a retry is in flight', () => {
    const { getByTestId, getByRole, queryByTestId } = renderTab('referrer', {
      summary: null,
      summaryError: true,
      summaryLoading: true,
    });

    expect(getByTestId(EARNINGS_TAB_TEST_IDS.SUMMARY_ERROR)).toBeOnTheScreen();
    expect(
      getByRole('button', { name: 'Retry', busy: true }),
    ).toBeOnTheScreen();
    expect(queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.SKELETON)).toBeNull();
  });

  it('hides the paused banner when no family is under review', () => {
    const { queryByTestId } = renderTab('referrer');

    expect(queryByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER)).toBeNull();
  });

  it('shows the paused banner for blocked money under review, not held', () => {
    const { getByTestId } = renderTab('referee', {
      summary: {
        ...SUMMARY,
        self_earned: {
          ...SUMMARY.self_earned,
          by_claim_family: {
            REFERRAL_TRADE_FEE_CASHBACK: {
              ...SUMMARY.self_earned.by_claim_family
                .REFERRAL_TRADE_FEE_CASHBACK,
              held: '100000000',
              blocked: '12000000',
              blocking_reason: 'UNDER_REVIEW',
            },
          },
        },
      },
    });

    expect(
      getByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER),
    ).toHaveTextContent('$12.00 of rewards paused.Learn more');
  });

  it('shows the under-review total above history and opens the paused sheet', () => {
    const { getByTestId, getByText } = renderTab('referrer', {
      summary: {
        ...SUMMARY,
        self_earned: {
          ...SUMMARY.self_earned,
          by_claim_family: {
            REFERRAL_TRADE_FEE_CASHBACK: {
              ...SUMMARY.self_earned.by_claim_family
                .REFERRAL_TRADE_FEE_CASHBACK,
              blocked: '9150000',
              blocking_reason: 'UNDER_REVIEW',
            },
          },
        },
      },
    });

    expect(
      getByTestId(REWARDS_PAUSED_BANNER_TEST_IDS.BANNER),
    ).toHaveTextContent('$9.15 of rewards paused.Learn more');
    expect(getByText('Learn more')).toBeOnTheScreen();

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
