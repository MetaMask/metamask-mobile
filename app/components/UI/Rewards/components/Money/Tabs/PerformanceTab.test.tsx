import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type {
  CommissionEntryView,
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
import PerformanceTab, { PERFORMANCE_TAB_TEST_IDS } from './PerformanceTab';
import { PERFORMANCE_ACTIVITY_TEST_IDS } from '../PerformanceActivityRows';

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
  last30DaysUpdatedDaily: 'Last 30 days · Updated daily',
  funnelConfirmed: 'Confirmed referrals',
  funnelConfirmedDescription: 'Friends who completed a first eligible action',
  funnelFeeGenerating: 'Fee-generating referrals',
  funnelFeeGeneratingDescription:
    'Referred friends whose activity generated eligible fees',
  funnelCodeUses: 'Code uses',
  funnelActive: 'Active referrals',
  tradeCommissions: 'Trade commissions',
  tradingCommissionsSection: 'Trading commissions',
  tradingRebates: 'Trading rebates',
  copiedOnce: 'Copied 1 time',
  copiedTimes: 'Copied {count} times',
  rebatePerpsVolume: 'Perps volume',
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
  variant: 'REFERRER' | 'REFEREE',
  {
    commissions = [commission],
    rebates = [rebate],
    commissionsError = null,
    rebatesError = null,
    funnelError = false,
    funnelLoading = false,
    funnelData = { enrolled: 12, earning_generating: 5 },
  }: {
    commissions?: CommissionEntryView[];
    rebates?: LedgerEarningEntryDto[];
    commissionsError?: string | null;
    rebatesError?: string | null;
    funnelError?: boolean;
    funnelLoading?: boolean;
    funnelData?: { enrolled: number; earning_generating: number } | null;
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
    <PerformanceTab profileId={PROFILE_ID} variant={variant} />,
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
          referralFunnel: {
            [PROFILE_ID]: {
              loading: funnelLoading,
              error: funnelError,
              data: funnelData,
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
      renderTab('REFERRER');

    expect(getByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL)).toBeOnTheScreen();
    expect(getByText('Confirmed referrals')).toBeOnTheScreen();
    expect(getByText('Fee-generating referrals')).toBeOnTheScreen();
    expect(queryByText('Code uses')).toBeNull();
    expect(queryByText('Active referrals')).toBeNull();
    expect(getByText('12')).toBeOnTheScreen();
    expect(getByText('5')).toBeOnTheScreen();
    expect(getByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS)).toBeOnTheScreen();
    expect(getByText('Trade commissions')).toBeOnTheScreen();
    expect(queryByTestId(PERFORMANCE_TAB_TEST_IDS.REBATES)).toBeNull();
    expect(useReferralFunnel).toHaveBeenCalledWith(PROFILE_ID, {
      enabled: true,
    });
    expect(useCashbackLedger).toHaveBeenCalledWith(PROFILE_ID, {
      enabled: false,
    });
  });

  it('shows commissions and rebates for a referee, not the funnel', () => {
    const { getByTestId, getByText, queryByTestId } = renderTab('REFEREE');

    expect(queryByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL)).toBeNull();
    expect(getByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS)).toBeOnTheScreen();
    expect(getByText('Trading commissions')).toBeOnTheScreen();
    expect(getByTestId(PERFORMANCE_TAB_TEST_IDS.REBATES)).toBeOnTheScreen();
    expect(getByText('Swaps')).toBeOnTheScreen();
    expect(useReferralFunnel).toHaveBeenCalledWith(PROFILE_ID, {
      enabled: false,
    });
    expect(useCashbackLedger).toHaveBeenCalledWith(PROFILE_ID, {
      enabled: true,
    });
  });

  it('caps the commissions preview at five rows', () => {
    const commissions = Array.from({ length: 8 }, (_, index) => ({
      ...commission,
      id: `row-${index}`,
    }));

    const { getAllByTestId } = renderTab('REFERRER', { commissions });

    expect(
      getAllByTestId(new RegExp(PERFORMANCE_ACTIVITY_TEST_IDS.COMMISSION_ROW)),
    ).toHaveLength(5);
  });

  it('navigates to the commissions list from the section header', () => {
    const { getByTestId } = renderTab('REFERRER');

    fireEvent.press(getByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_HEADER));

    expect(navigateToRewardsRoute).toHaveBeenCalledWith(
      expect.anything(),
      Routes.REWARDS_TRADING_COMMISSIONS_VIEW,
    );
  });

  it('shows a funnel row skeleton while the funnel is loading', () => {
    const { getByTestId, queryByTestId } = renderTab('REFERRER', {
      funnelData: null,
      funnelLoading: true,
    });

    expect(
      getByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL_SKELETON),
    ).toBeOnTheScreen();
    expect(queryByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL)).toBeNull();
  });

  it('shows a referral error above cached funnel data', () => {
    const { getByTestId, getByText, queryByText } = renderTab('REFERRER', {
      funnelError: true,
    });

    expect(
      getByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL_ERROR),
    ).toBeOnTheScreen();
    expect(getByText('Referral details couldn’t be loaded')).toBeOnTheScreen();
    expect(queryByText('Error loading your transactions')).toBeNull();
    expect(getByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL)).toBeOnTheScreen();
    expect(getByText('BTC')).toBeOnTheScreen();

    fireEvent.press(getByText('Retry'));

    expect(fetchReferralFunnel).toHaveBeenCalledWith({ forceFresh: true });
    expect(retryCommissions).not.toHaveBeenCalled();
  });

  it('shows a transactions error above cached commissions', () => {
    const { getByTestId, getByText, queryByText } = renderTab('REFERRER', {
      commissionsError: 'failed',
    });

    expect(
      getByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_ERROR),
    ).toBeOnTheScreen();
    expect(getByText('Error loading your transactions')).toBeOnTheScreen();
    expect(queryByText('Referral details couldn’t be loaded')).toBeNull();
    expect(getByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS)).toBeOnTheScreen();

    fireEvent.press(getByText('Retry'));

    expect(retryCommissions).toHaveBeenCalledTimes(1);
    expect(fetchReferralFunnel).not.toHaveBeenCalled();
  });

  it('keeps one banner and retries commissions when the funnel also failed', () => {
    const { getByTestId, getByText, queryByTestId } = renderTab('REFERRER', {
      commissionsError: 'failed',
      funnelError: true,
    });

    expect(
      getByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_ERROR),
    ).toBeOnTheScreen();
    expect(queryByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL_ERROR)).toBeNull();
    expect(getByText('Error loading your transactions')).toBeOnTheScreen();
    expect(getByTestId(PERFORMANCE_TAB_TEST_IDS.FUNNEL)).toBeOnTheScreen();
    expect(getByText('BTC')).toBeOnTheScreen();

    fireEvent.press(getByText('Retry'));

    expect(retryCommissions).toHaveBeenCalledTimes(1);
    expect(fetchReferralFunnel).not.toHaveBeenCalled();
  });

  it('retries rebates from the transactions error when only rebates failed', () => {
    const { getByTestId, getByText, queryByTestId } = renderTab('REFEREE', {
      rebatesError: 'failed',
    });

    expect(
      getByTestId(PERFORMANCE_TAB_TEST_IDS.REBATES_ERROR),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(PERFORMANCE_TAB_TEST_IDS.COMMISSIONS_ERROR),
    ).toBeNull();
    expect(getByText('Error loading your transactions')).toBeOnTheScreen();
    expect(getByText('Swaps')).toBeOnTheScreen();

    fireEvent.press(getByText('Retry'));

    expect(retryRebates).toHaveBeenCalledTimes(1);
    expect(retryCommissions).not.toHaveBeenCalled();
  });

  it('hides a section header when that request failed and nothing is cached', () => {
    const { getByText, queryByText } = renderTab('REFEREE', {
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
    const { getByText, queryByText } = renderTab('REFERRER', {
      funnelError: true,
      funnelData: null,
    });

    expect(getByText('Referral details couldn’t be loaded')).toBeOnTheScreen();
    expect(queryByText('Referrals')).toBeNull();
    expect(getByText('Trade commissions')).toBeOnTheScreen();
  });

  it('navigates to the rebates list from the section header', () => {
    const { getByTestId } = renderTab('REFEREE');

    fireEvent.press(getByTestId(PERFORMANCE_TAB_TEST_IDS.REBATES_HEADER));

    expect(navigateToRewardsRoute).toHaveBeenCalledWith(
      expect.anything(),
      Routes.REWARDS_TRADING_REBATES_VIEW,
    );
  });
});
