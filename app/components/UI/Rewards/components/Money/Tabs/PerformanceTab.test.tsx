import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type {
  CommissionEntryView,
  EarningsSummaryDto,
  LedgerEarningEntryDto,
  ReferralLocalizedText,
  ReferralMeDto,
} from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import Routes from '../../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { navigateToRewardsRoute } from '../../../utils';
import { useReferralFunnel } from '../../../hooks/useReferralFunnel';
import { useCommissions } from '../../../hooks/useCommissions';
import { useCashbackLedger } from '../../../hooks/useCashbackLedger';
import PerformanceTab from './PerformanceTab';
import { PERFORMANCE_TAB_TEST_IDS } from './PerformanceTab.testIds';
import { PERFORMANCE_ACTIVITY_TEST_IDS } from '../PerformanceActivityRows.testIds';

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

jest.mock('../../../hooks/useReferralFunnel');
jest.mock('../../../hooks/useCommissions');
jest.mock('../../../hooks/useCashbackLedger');

const PROFILE_ID = 'profile-a';

const LOCALIZED_TEXT = {
  referrals: 'Referrals',
  updatedDaily: 'Updated daily',
  funnelConfirmed: 'Confirmed referrals',
  funnelConfirmedDescription: 'Friends who completed a first eligible action',
  funnelFeeGenerating: 'Fee-generating referrals',
  funnelFeeGeneratingDescription:
    'Referred friends whose activity generated eligible fees',
  funnelCodeUses: 'Code uses',
  funnelActive: 'Active referrals',
  eligibleFees: 'Eligible fees',
  tradeCommissions: 'Trade commissions',
  tradingCommissionsSection: 'Trading commissions',
  tradingRebates: 'Trading rebates',
  tradingActivityEmptyDescription:
    'Your activity is empty now. Start trading to earn today!',
  tradingActivityEmptyAction: 'Start trading',
  copiedOnce: 'Copied 1 time',
  copiedTimes: 'Copied {count} times',
  rebatePerpsVolume: 'Perps volume',
  rebateSwapsVolume: 'Swaps volume',
  rebatePredictions: 'Predictions',
  rebateSwaps: 'Swaps',
} as unknown as ReferralLocalizedText;

const commission: CommissionEntryView = {
  id: 'SOCIAL_FOLLOW_TRADE:2026-09-01:perps:BTC',
  earning_origin_type: 'SOCIAL_FOLLOW_TRADE',
  day: '2026-09-01',
  token: { key: 'perps:BTC', symbol: 'BTC', source: 'PERPS' },
  musd_amount: '2500000',
  fee_amount_usd: '10.00000000',
  fill_count: 3,
  copied_times: 2,
};

const rebate: LedgerEarningEntryDto = {
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

const emptyList = {
  items: [] as never[],
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  error: null,
  loadMore: jest.fn(),
  refresh: jest.fn(),
  retry: jest.fn(),
  isRefreshing: false,
};

const fetchReferralFunnel = jest.fn();
const retryCommissions = jest.fn();
const retryRebates = jest.fn();

const renderTab = (
  persona: 'referrer' | 'referee',
  {
    commissions = [commission],
    rebates = [rebate],
    commissionsError = null,
    rebatesError = null,
    funnelError = false,
    funnelLoading = false,
    funnelData = { enrolled: 12, earning_generating: 5 },
    active = true,
  }: {
    commissions?: CommissionEntryView[];
    rebates?: LedgerEarningEntryDto[];
    commissionsError?: string | null;
    rebatesError?: string | null;
    funnelError?: boolean;
    funnelLoading?: boolean;
    funnelData?: { enrolled: number; earning_generating: number } | null;
    active?: boolean;
  } = {},
) => {
  (useReferralFunnel as jest.Mock).mockReturnValue({
    fetchReferralFunnel,
  });
  (useCommissions as jest.Mock).mockReturnValue({
    ...emptyList,
    items: commissions,
    error: commissionsError,
    retry: retryCommissions,
  });
  (useCashbackLedger as jest.Mock).mockReturnValue({
    ...emptyList,
    items: rebates,
    error: rebatesError,
    retry: retryRebates,
  });

  return renderWithProvider(
    <PerformanceTab profileId={PROFILE_ID} persona={persona} active={active} />,
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
          referralFunnel: {
            [PROFILE_ID]: {
              loading: funnelLoading,
              error: funnelError,
              data: funnelData,
            },
          },
          earningsSummary: {
            [PROFILE_ID]: {
              loading: false,
              error: false,
              data: {
                earned_by_others: {
                  by_claim_family: {
                    REFERRAL_REV_SHARE: { lifetime: '41750000' },
                  },
                },
              } as unknown as EarningsSummaryDto,
            },
          },
        },
      },
    },
  );
};

describe('PerformanceTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the two-stage funnel and commissions for a referrer, not rebates', () => {
    const { getByTestId, getByText, queryByTestId, queryByText } =
      renderTab('referrer');

    expect(getByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL)).toBeOnTheScreen();
    expect(getByText('Confirmed referrals')).toBeOnTheScreen();
    expect(getByText('Fee-generating referrals')).toBeOnTheScreen();
    expect(getByText('$41.75')).toBeOnTheScreen();
    expect(getByText('Eligible fees')).toBeOnTheScreen();
    expect(getByText('Updated daily')).toBeOnTheScreen();
    expect(queryByText('Last 30 days · Updated daily')).toBeNull();
    expect(queryByText('Code uses')).toBeNull();
    expect(queryByText('Active referrals')).toBeNull();
    expect(getByText('12')).toBeOnTheScreen();
    expect(getByText('5')).toBeOnTheScreen();
    expect(getByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS)).toBeOnTheScreen();
    expect(getByText('Trading commissions')).toBeOnTheScreen();
    expect(
      getByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_DIVIDER),
    ).toBeOnTheScreen();
    expect(queryByTestId(PERFORMANCE_TAB_TEST_IDS.REBATES)).toBeNull();
    expect(useReferralFunnel).toHaveBeenCalledWith(PROFILE_ID, {
      enabled: true,
    });
    expect(useCommissions).toHaveBeenCalledWith(PROFILE_ID, {
      enabled: true,
    });
    expect(useCashbackLedger).toHaveBeenCalledWith(PROFILE_ID, {
      enabled: false,
    });
  });

  it('shows commissions and rebates for a referee, not the funnel', () => {
    const { getByTestId, getByText, queryByTestId } = renderTab('referee');

    expect(queryByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL)).toBeNull();
    expect(getByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS)).toBeOnTheScreen();
    expect(getByText('Trading commissions')).toBeOnTheScreen();
    expect(getByTestId(PERFORMANCE_TAB_TEST_IDS.REBATES)).toBeOnTheScreen();
    expect(getByText('Swaps volume')).toBeOnTheScreen();
    expect(useReferralFunnel).toHaveBeenCalledWith(PROFILE_ID, {
      enabled: false,
    });
    expect(useCommissions).toHaveBeenCalledWith(PROFILE_ID, {
      enabled: true,
    });
    expect(useCashbackLedger).toHaveBeenCalledWith(PROFILE_ID, {
      enabled: true,
    });
  });

  it('does not fetch while another Money tab is selected', () => {
    renderTab('referrer', { active: false });

    expect(useReferralFunnel).toHaveBeenCalledWith(PROFILE_ID, {
      enabled: false,
    });
    expect(useCommissions).toHaveBeenCalledWith(PROFILE_ID, {
      enabled: false,
    });
    expect(useCashbackLedger).toHaveBeenCalledWith(PROFILE_ID, {
      enabled: false,
    });
  });

  it('shows an empty message in rebates when there are no rows', () => {
    const { getAllByText, getByTestId, queryByRole, queryByTestId } = renderTab(
      'referee',
      {
        commissions: [],
        rebates: [],
      },
    );

    expect(
      getByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_EMPTY),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PERFORMANCE_TAB_TEST_IDS.REBATES_EMPTY),
    ).toBeOnTheScreen();
    expect(
      getAllByText('Your activity is empty now. Start trading to earn today!'),
    ).toHaveLength(2);
    expect(
      getByTestId(`${PERFORMANCE_TAB_TEST_IDS.REBATES_EMPTY}-action`),
    ).toBeOnTheScreen();
    expect(queryByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS)).toBeNull();
    expect(queryByTestId(PERFORMANCE_TAB_TEST_IDS.REBATES)).toBeNull();

    fireEvent.press(
      getByTestId(`${PERFORMANCE_TAB_TEST_IDS.REBATES_EMPTY}-action`),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.TRADE_WALLET_ACTIONS,
    });
    expect(queryByRole('button', { name: 'Trading rebates' })).toBeNull();
    expect(
      getByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_HEADER),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(PERFORMANCE_TAB_TEST_IDS.REBATES_HEADER));

    expect(navigateToRewardsRoute).not.toHaveBeenCalled();
  });

  it('caps the commissions preview at five rows', () => {
    const commissions = Array.from({ length: 8 }, (_, index) => ({
      ...commission,
      id: `row-${index}`,
    }));

    const { getAllByTestId, getByTestId, queryByTestId } = renderTab(
      'referrer',
      {
        commissions,
      },
    );

    expect(
      getAllByTestId(
        new RegExp(`^${PERFORMANCE_ACTIVITY_TEST_IDS.COMMISSION_ROW}-`),
      ),
    ).toHaveLength(5);
    expect(
      queryByTestId(`${PERFORMANCE_ACTIVITY_TEST_IDS.COMMISSION_ROW}-row-5`),
    ).toBeNull();
    expect(
      getByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_HEADER),
    ).toBeOnTheScreen();
  });

  it('keeps cached funnel data without an error banner', () => {
    const { getByTestId, queryByTestId, queryByText } = renderTab('referrer', {
      funnelError: true,
    });

    expect(queryByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL_ERROR)).toBeNull();
    expect(queryByText('Referral details couldn’t be loaded')).toBeNull();
    expect(getByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL)).toBeOnTheScreen();
  });

  it('keeps the referral error banner up with a busy retry button while refetching', () => {
    const { getByTestId, getByRole, queryByTestId } = renderTab('referrer', {
      funnelError: true,
      funnelLoading: true,
      funnelData: null,
    });

    expect(
      getByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL_ERROR),
    ).toBeOnTheScreen();
    expect(
      getByRole('button', { name: 'Retry', busy: true }),
    ).toBeOnTheScreen();
    expect(queryByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL)).toBeNull();
  });

  it('keeps cached commissions without an error banner', () => {
    const { getByTestId, queryByTestId, queryByText } = renderTab('referrer', {
      commissionsError: 'failed',
    });

    expect(
      queryByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_ERROR),
    ).toBeNull();
    expect(queryByText('Error loading your transactions')).toBeNull();
    expect(getByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS)).toBeOnTheScreen();
    expect(retryCommissions).not.toHaveBeenCalled();
  });

  it('shows the referral error when the funnel failed with nothing cached', () => {
    const { getByTestId, getByText, queryByTestId } = renderTab('referrer', {
      commissionsError: 'failed',
      funnelError: true,
      funnelData: null,
    });

    expect(
      queryByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_ERROR),
    ).toBeNull();
    expect(
      getByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL_ERROR),
    ).toBeOnTheScreen();
    expect(getByText('Referral details couldn’t be loaded')).toBeOnTheScreen();
    expect(queryByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL)).toBeNull();

    fireEvent.press(getByText('Retry'));

    expect(fetchReferralFunnel).toHaveBeenCalledWith({ forceFresh: true });
    expect(retryCommissions).not.toHaveBeenCalled();
  });

  it('keeps cached rebates without an error banner', () => {
    const { getByText, queryByTestId, queryByText } = renderTab('referee', {
      rebatesError: 'failed',
    });

    expect(queryByTestId(PERFORMANCE_TAB_TEST_IDS.REBATES_ERROR)).toBeNull();
    expect(queryByText('Error loading your transactions')).toBeNull();
    expect(getByText('Swaps volume')).toBeOnTheScreen();
  });

  it('retries rebates from the transactions error when nothing is cached', () => {
    const { getByTestId, getByText, queryByTestId, queryByText } = renderTab(
      'referee',
      {
        rebates: [],
        rebatesError: 'failed',
      },
    );

    expect(
      getByTestId(PERFORMANCE_TAB_TEST_IDS.REBATES_ERROR),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_ERROR),
    ).toBeNull();
    expect(getByText('Error loading your transactions')).toBeOnTheScreen();
    expect(queryByText('Swaps')).toBeNull();

    fireEvent.press(getByText('Retry'));

    expect(retryRebates).toHaveBeenCalledTimes(1);
    expect(retryCommissions).not.toHaveBeenCalled();
  });

  it('hides a section header when that request failed and nothing is cached', () => {
    const { getByText, queryByText } = renderTab('referee', {
      commissions: [],
      rebates: [],
      commissionsError: 'failed',
      rebatesError: 'failed',
      funnelError: true,
      funnelData: null,
    });

    expect(getByText('Error loading your transactions')).toBeOnTheScreen();
    expect(queryByText('Trading commissions')).toBeNull();
    expect(queryByText('Trading rebates')).toBeNull();
  });

  it('hides the referrals header when the funnel failed with no cache', () => {
    const { getByText, queryByText } = renderTab('referrer', {
      funnelError: true,
      funnelData: null,
    });

    expect(getByText('Referral details couldn’t be loaded')).toBeOnTheScreen();
    expect(queryByText('Referrals')).toBeNull();
    expect(getByText('Trading commissions')).toBeOnTheScreen();
  });
});
