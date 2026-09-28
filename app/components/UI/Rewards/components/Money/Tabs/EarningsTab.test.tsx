import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type {
  EarningsSummaryDto,
  LedgerEntryDto,
  ReferralLocalizedText,
  ReferralMeDto,
  ReferralVariant,
} from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import Routes from '../../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { navigateToRewardsRoute } from '../../../utils';
import { useEarningsSummary } from '../../../hooks/useEarningsSummary';
import { useLast7DaysEarnings } from '../../../hooks/useLast7DaysEarnings';
import { useEarningsHistory } from '../../../hooks/useEarningsHistory';
import { TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS } from '../TradingActivityListSkeleton';
import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from '../ClaimableRewardsCard';
import { EARNINGS_HISTORY_TEST_IDS } from '../EarningsHistoryRows';
import EarningsTab, { EARNINGS_TAB_TEST_IDS } from './EarningsTab';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
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

const PROFILE_ID = 'profile-a';

const LOCALIZED_TEXT = {
  availableToClaim: 'Available to claim',
  claim: 'Claim',
  claimed: 'Claimed',
  last7Days: 'Last 7 days',
  recordedEarningsLabel: 'Recorded earnings',
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
  variant: ReferralVariant,
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
      variant={variant}
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
                variant,
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

  it('shows referral and commission totals for a referrer', () => {
    const { getByText, queryByText, getByTestId } = renderTab('REFERRER');

    expect(getByText('Referrals')).toBeOnTheScreen();
    expect(getByText('$41.75')).toBeOnTheScreen();
    expect(getByText('Trade commissions')).toBeOnTheScreen();
    expect(getByText('$9.15')).toBeOnTheScreen();
    expect(queryByText('Trading rebates')).toBeNull();
    expect(getByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN)).toBeOnTheScreen();
    expect(getByText('$2.00')).toBeOnTheScreen();
    expect(getByText('$58.50')).toBeOnTheScreen();
  });

  it('shows commission and rebate totals for a referee', () => {
    const { getByText, queryByText } = renderTab('REFEREE');

    expect(queryByText('Referrals')).toBeNull();
    expect(getByText('Trading commissions')).toBeOnTheScreen();
    expect(getByText('$9.15')).toBeOnTheScreen();
    expect(getByText('Trading rebates')).toBeOnTheScreen();
    expect(getByText('$7.65')).toBeOnTheScreen();
  });

  it('omits the breakdown when the variant is none', () => {
    const { queryByTestId, getByTestId } = renderTab('NONE');

    expect(queryByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN)).toBeNull();
    expect(getByTestId(EARNINGS_TAB_TEST_IDS.HISTORY)).toBeOnTheScreen();
  });

  it('renders Claim when claimable is positive', () => {
    const { getByTestId, queryByTestId } = renderTab('REFERRER', {
      summary: { ...SUMMARY, claimable: '50', claimed: '50' },
    });

    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeNull();
  });

  it('renders a disabled Claimed button when only claimed is positive', () => {
    const { getByTestId, queryByTestId } = renderTab('REFERRER', {
      summary: { ...SUMMARY, claimable: '0', claimed: '50' },
    });

    expect(
      queryByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIM_BUTTON),
    ).toBeNull();
    expect(
      getByTestId(CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON),
    ).toBeDisabled();
  });

  it('hides the button when nothing is claimable or claimed', () => {
    const { queryByTestId } = renderTab('REFERRER');

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

    const { getAllByTestId, getAllByText } = renderTab('REFERRER', {
      historyItems,
    });

    expect(
      getAllByTestId(new RegExp(EARNINGS_HISTORY_TEST_IDS.ROW)),
    ).toHaveLength(5);
    expect(getAllByText('Referral earning').length).toBeGreaterThan(0);
    expect(getAllByText('Claimed').length).toBeGreaterThan(0);
  });

  it('opens Performance from the breakdown header and history from its header', () => {
    const onViewPerformance = jest.fn();
    const { getByTestId } = renderTab('REFERRER', { onViewPerformance });

    fireEvent.press(getByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN_HEADER));
    fireEvent.press(getByTestId(EARNINGS_TAB_TEST_IDS.HISTORY_HEADER));

    expect(onViewPerformance).toHaveBeenCalledTimes(1);
    expect(navigateToRewardsRoute).toHaveBeenCalledWith(
      expect.anything(),
      Routes.REWARDS_EARNINGS_HISTORY_VIEW,
    );
  });

  it('skeletons the card, breakdown, and history while each is loading', () => {
    const { getByTestId, queryByTestId } = renderTab('REFERRER', {
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
    expect(
      getByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN_SKELETON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(TRADING_ACTIVITY_LIST_SKELETON_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(queryByTestId(EARNINGS_TAB_TEST_IDS.BREAKDOWN)).toBeNull();
    expect(queryByTestId(EARNINGS_TAB_TEST_IDS.HISTORY)).toBeNull();
  });

  it('shows one summary banner and retries only that source', () => {
    const { getByTestId, getByText, queryByTestId } = renderTab('REFERRER', {
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
    const { getByTestId, getByText } = renderTab('REFERRER', {
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
    const { queryByTestId, getByTestId } = renderTab('REFERRER', {
      historyItems: [],
      historyError: 'failed',
    });

    expect(queryByTestId(EARNINGS_TAB_TEST_IDS.HISTORY_HEADER)).toBeNull();
    expect(getByTestId(EARNINGS_TAB_TEST_IDS.HISTORY_ERROR)).toBeOnTheScreen();
  });

  it('retries history from the banner when cached rows remain', () => {
    const { getByTestId, getByText } = renderTab('REFERRER', {
      historyError: 'failed',
    });

    expect(getByTestId(EARNINGS_TAB_TEST_IDS.HISTORY)).toBeOnTheScreen();
    expect(getByText('Error loading your transactions')).toBeOnTheScreen();

    fireEvent.press(getByText('Retry'));

    expect(retryHistory).toHaveBeenCalledTimes(1);
  });
});
