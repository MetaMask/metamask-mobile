import type {
  EarningsSummaryDto,
  ReferralMeDto,
} from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useEarningsSummary } from './useEarningsSummary';
import { useMoneyHeroEntries } from './useMoneyHeroEntries';
import { useReferralMe } from './useReferralMe';

jest.mock('./useEarningsSummary');
jest.mock('./useReferralMe');

const PROFILE_ID = 'profile-a';
const mockFetchEarningsSummary = jest.fn(() => Promise.resolve(undefined));
const mockFetchReferralMe = jest.fn();
const summary = { lifetime_total: '1' } as EarningsSummaryDto;
const referralData = { roles: [] } as unknown as ReferralMeDto;

const renderEntries = ({
  referral = {
    loading: false,
    error: false,
    data: referralData,
  },
  earnings = { loading: false, error: false, data: summary },
}: {
  referral?: {
    loading: boolean;
    error: boolean;
    data: ReferralMeDto | null;
  };
  earnings?: {
    loading: boolean;
    error: boolean;
    data: EarningsSummaryDto | null;
  } | null;
} = {}) =>
  renderHookWithProvider(() => useMoneyHeroEntries(PROFILE_ID), {
    state: {
      rewardsMoney: {
        referralMe: { [PROFILE_ID]: referral },
        earningsSummary: earnings ? { [PROFILE_ID]: earnings } : {},
      },
    },
  });

describe('useMoneyHeroEntries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      useEarningsSummary as jest.MockedFunction<typeof useEarningsSummary>
    ).mockReturnValue({
      fetchEarningsSummary: mockFetchEarningsSummary,
    });
    (
      useReferralMe as jest.MockedFunction<typeof useReferralMe>
    ).mockReturnValue({
      profileId: PROFILE_ID,
      fetchReferralMe: mockFetchReferralMe,
    });
  });

  it('returns cached summary data when neither entry has failed', () => {
    const { result } = renderEntries();

    expect(result.current.earningsSummary).toEqual(summary);
    expect(result.current.isEarningsLoading).toBe(false);
    expect(result.current.unavailableAmount).toBeNull();
    expect(result.current.errorSource).toBeNull();
  });

  it('reports the summary as loading when it has not landed', () => {
    const { result } = renderEntries({
      earnings: { loading: true, error: false, data: null },
    });

    expect(result.current.isEarningsLoading).toBe(true);
    expect(result.current.earningsSummary).toBeNull();
  });

  it('uses a dash and an earnings error when the summary failed without data', () => {
    const { result } = renderEntries({
      earnings: { loading: false, error: true, data: null },
    });

    expect(result.current.unavailableAmount).toBe('-');
    expect(result.current.errorSource).toBe('earnings');
    expect(result.current.retryLoading).toBe(false);

    result.current.retry();

    expect(mockFetchEarningsSummary).toHaveBeenCalledWith({
      forceFresh: true,
    });
    expect(mockFetchReferralMe).not.toHaveBeenCalled();
  });

  it('prefers the referral error when both reads failed without data', () => {
    const { result } = renderEntries({
      referral: { loading: true, error: true, data: null },
      earnings: { loading: false, error: true, data: null },
    });

    expect(result.current.errorSource).toBe('referral');
    expect(result.current.retryLoading).toBe(true);

    result.current.retry();

    expect(mockFetchReferralMe).toHaveBeenCalledWith({ forceFresh: true });
    expect(mockFetchEarningsSummary).not.toHaveBeenCalled();
  });

  it('keeps cached data and skips the banner when a refresh fails', () => {
    const { result } = renderEntries({
      referral: {
        loading: false,
        error: true,
        data: referralData,
      },
      earnings: { loading: false, error: true, data: summary },
    });

    expect(result.current.errorSource).toBeNull();
    expect(result.current.unavailableAmount).toBeNull();
    expect(result.current.earningsSummary).toEqual(summary);

    result.current.retry();

    expect(mockFetchReferralMe).not.toHaveBeenCalled();
    expect(mockFetchEarningsSummary).not.toHaveBeenCalled();
  });
});
