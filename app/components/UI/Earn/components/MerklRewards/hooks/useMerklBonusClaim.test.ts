import { renderHook, act } from '@testing-library/react-hooks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useMerklBonusClaim } from './useMerklBonusClaim';
import { TokenI } from '../../../../Tokens/types';
import { AGLAMERKL_ADDRESS_MAINNET } from '../constants';

const mockClaimRewards = jest.fn().mockResolvedValue(undefined);

const mockUseMerklRewards = jest.fn((_opts?: unknown) => ({
  claimableReward: null as string | null,
  hasClaimedBefore: false,
  rewardsFetchVersion: 0,
}));

jest.mock('./useMerklRewards', () => ({
  useMerklRewards: (...args: [unknown]) => mockUseMerklRewards(...args),
  isTokenEligibleForMerklRewards:
    jest.requireActual('./useMerklRewards').isTokenEligibleForMerklRewards,
}));

const mockUsePendingMerklClaim = jest.fn(() => ({
  hasPendingClaim: false,
}));
jest.mock('./usePendingMerklClaim', () => ({
  usePendingMerklClaim: () => mockUsePendingMerklClaim(),
}));

const mockUseMerklClaimTransaction = jest.fn((_asset?: unknown) => ({
  claimRewards: mockClaimRewards,
  isClaiming: false,
  error: null,
}));
jest.mock('./useMerklClaimTransaction', () => ({
  useMerklClaimTransaction: (...args: [unknown]) =>
    mockUseMerklClaimTransaction(...args),
}));

let mockIsMerklCampaignClaimingEnabled = true;
jest.mock('../../../selectors/featureFlags', () => ({
  selectMerklCampaignClaimingEnabledFlag: () =>
    mockIsMerklCampaignClaimingEnabled,
}));

let mockIsGeoEligible = true;
jest.mock('../../../hooks/useMusdConversionEligibility', () => ({
  useMusdConversionEligibility: () => ({
    isEligible: mockIsGeoEligible,
    isLoading: false,
    geolocation: 'US',
    blockedCountries: [],
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => {
  const mockBuild = jest.fn().mockReturnValue('built-event');
  const mockAddProperties = jest.fn();
  const mockEventBuilder = {
    addProperties: mockAddProperties,
    build: mockBuild,
  };
  mockAddProperties.mockReturnValue(mockEventBuilder);
  const mockCreateEventBuilder = jest.fn().mockReturnValue(mockEventBuilder);
  const mockTrackEvent = jest.fn();

  return {
    useAnalytics: () => ({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    }),
    _mocks: {
      trackEvent: mockTrackEvent,
      addProperties: mockAddProperties,
      createEventBuilder: mockCreateEventBuilder,
    },
  };
});

jest.mock('../../../../../../selectors/networkController', () => ({
  selectNetworkConfigurationByChainId: jest.fn(() => ({
    name: 'Ethereum Mainnet',
  })),
}));

const getAnalyticsMocks = (): {
  trackEvent: jest.Mock;
  addProperties: jest.Mock;
  createEventBuilder: jest.Mock;
} =>
  (
    jest.requireMock('../../../../../hooks/useAnalytics/useAnalytics') as {
      _mocks: {
        trackEvent: jest.Mock;
        addProperties: jest.Mock;
        createEventBuilder: jest.Mock;
      };
    }
  )._mocks;

const eligibleAsset: TokenI = {
  address: AGLAMERKL_ADDRESS_MAINNET,
  chainId: CHAIN_IDS.MAINNET,
  symbol: 'AGLA',
  decimals: 18,
  name: 'AGLA Token',
  balance: '1',
  balanceFiat: '$1.00',
  isNative: false,
  isETH: false,
  isStaked: false,
  image: '',
  aggregators: [],
  logo: '',
};

const ineligibleAsset: TokenI = {
  address: '0x0000000000000000000000000000000000000001',
  chainId: CHAIN_IDS.MAINNET,
  symbol: 'NOPE',
  decimals: 18,
  name: 'Ineligible Token',
  balance: '1',
  balanceFiat: '$1.00',
  isNative: false,
  isETH: false,
  isStaked: false,
  image: '',
  aggregators: [],
  logo: '',
};

describe('useMerklBonusClaim', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMerklCampaignClaimingEnabled = true;
    mockIsGeoEligible = true;

    mockUseMerklRewards.mockReturnValue({
      claimableReward: null,
      hasClaimedBefore: false,
      rewardsFetchVersion: 0,
    });
    mockUsePendingMerklClaim.mockReturnValue({ hasPendingClaim: false });
    mockUseMerklClaimTransaction.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: false,
      error: null,
    });

    const { addProperties, createEventBuilder } = getAnalyticsMocks();
    const eventBuilder = {
      addProperties,
      build: jest.fn().mockReturnValue('built-event'),
    };
    addProperties.mockReturnValue(eventBuilder);
    createEventBuilder.mockReturnValue(eventBuilder);
  });

  it('returns default claim data when asset is undefined', () => {
    const { result } = renderHook(() =>
      useMerklBonusClaim(undefined, 'test_location'),
    );

    expect(result.current.claimableReward).toBeNull();
    expect(result.current.hasPendingClaim).toBe(false);
    expect(result.current.isClaiming).toBe(false);
  });

  it('returns default claim data when feature flag is disabled', () => {
    mockIsMerklCampaignClaimingEnabled = false;

    const { result } = renderHook(() =>
      useMerklBonusClaim(eligibleAsset, 'test_location'),
    );

    expect(result.current.claimableReward).toBeNull();
    expect(result.current.hasPendingClaim).toBe(false);
  });

  it('returns default claim data when user is geo-blocked', () => {
    mockIsGeoEligible = false;

    const { result } = renderHook(() =>
      useMerklBonusClaim(eligibleAsset, 'test_location'),
    );

    expect(result.current.claimableReward).toBeNull();
    expect(result.current.hasPendingClaim).toBe(false);
  });

  it('returns default claim data for ineligible token', () => {
    const { result } = renderHook(() =>
      useMerklBonusClaim(ineligibleAsset, 'test_location'),
    );

    expect(result.current.claimableReward).toBeNull();
    expect(result.current.hasPendingClaim).toBe(false);
  });

  it('passes eligible asset to underlying hooks', () => {
    renderHook(() => useMerklBonusClaim(eligibleAsset, 'test_location'));

    expect(mockUseMerklRewards).toHaveBeenCalledWith({
      asset: eligibleAsset,
    });
    expect(mockUseMerklClaimTransaction).toHaveBeenCalledWith(eligibleAsset);
  });

  it('hides CTA after successful claim submission until remount', async () => {
    const mockSuccessfulClaimRewards = jest.fn().mockResolvedValue({
      txHash: '0x123',
      transactionMeta: {},
    });
    mockUseMerklRewards.mockReturnValue({
      claimableReward: '1.50',
      hasClaimedBefore: false,
      rewardsFetchVersion: 0,
    });
    mockUseMerklClaimTransaction.mockReturnValue({
      claimRewards: mockSuccessfulClaimRewards,
      isClaiming: false,
      error: null,
    });

    const { result } = renderHook(() =>
      useMerklBonusClaim(eligibleAsset, 'test_location'),
    );

    expect(result.current.claimableReward).toBe('1.50');

    await act(async () => {
      await result.current.claimRewards();
    });

    expect(result.current.claimableReward).toBeNull();
  });

  it('unlocks CTA after rewards refetch version changes', async () => {
    const mockSuccessfulClaimRewards = jest.fn().mockResolvedValue({
      txHash: '0x123',
      transactionMeta: {},
    });
    mockUseMerklRewards.mockReturnValue({
      claimableReward: '1.50',
      hasClaimedBefore: false,
      rewardsFetchVersion: 0,
    });
    mockUseMerklClaimTransaction.mockReturnValue({
      claimRewards: mockSuccessfulClaimRewards,
      isClaiming: false,
      error: null,
    });

    const { result, rerender } = renderHook(() =>
      useMerklBonusClaim(eligibleAsset, 'test_location'),
    );

    await act(async () => {
      await result.current.claimRewards();
    });

    expect(result.current.claimableReward).toBeNull();

    mockUseMerklRewards.mockReturnValue({
      claimableReward: '1.50',
      hasClaimedBefore: false,
      rewardsFetchVersion: 1,
    });
    rerender();

    expect(result.current.claimableReward).toBe('1.50');
  });

  it('locks CTA even when rewardsFetchVersion changes while claim is in flight', async () => {
    let resolveClaim:
      | ((value: {
          txHash: string;
          transactionMeta: Record<string, unknown>;
        }) => void)
      | undefined;
    const delayedClaim = new Promise<{
      txHash: string;
      transactionMeta: Record<string, unknown>;
    }>((resolve) => {
      resolveClaim = resolve;
    });
    const mockDelayedClaimRewards = jest.fn().mockReturnValue(delayedClaim);

    let mockedRewardsFetchVersion = 0;
    mockUseMerklRewards.mockImplementation(() => ({
      claimableReward: '1.50',
      hasClaimedBefore: false,
      rewardsFetchVersion: mockedRewardsFetchVersion,
    }));
    mockUseMerklClaimTransaction.mockReturnValue({
      claimRewards: mockDelayedClaimRewards,
      isClaiming: false,
      error: null,
    });

    const { result, rerender } = renderHook(() =>
      useMerklBonusClaim(eligibleAsset, 'test_location'),
    );

    const claimPromise = result.current.claimRewards();

    mockedRewardsFetchVersion = 1;
    rerender();
    expect(result.current.claimableReward).toBe('1.50');

    await act(async () => {
      resolveClaim?.({ txHash: '0x123', transactionMeta: {} });
      await claimPromise;
    });

    expect(result.current.claimableReward).toBeNull();
  });

  it('returns composed data from underlying hooks for eligible asset', () => {
    mockUseMerklRewards.mockReturnValue({
      claimableReward: '1.50',
      hasClaimedBefore: false,
      rewardsFetchVersion: 0,
    });
    mockUsePendingMerklClaim.mockReturnValue({ hasPendingClaim: true });
    mockUseMerklClaimTransaction.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: true,
      error: null,
    });

    const { result } = renderHook(() =>
      useMerklBonusClaim(eligibleAsset, 'test_location'),
    );

    expect(result.current.claimableReward).toBe('1.50');
    expect(result.current.hasPendingClaim).toBe(true);
    expect(result.current.isClaiming).toBe(true);
    expect(typeof result.current.claimRewards).toBe('function');
  });

  it('returns claimableReward null when raw value is "< 0.01" (below threshold)', () => {
    mockUseMerklRewards.mockReturnValue({
      claimableReward: '< 0.01',
      hasClaimedBefore: false,
      rewardsFetchVersion: 0,
    });

    const { result } = renderHook(() =>
      useMerklBonusClaim(eligibleAsset, 'test_location'),
    );

    expect(result.current.claimableReward).toBeNull();
  });

  it('returns claimableReward null when raw value is below 0.01', () => {
    mockUseMerklRewards.mockReturnValue({
      claimableReward: '0.005',
      hasClaimedBefore: false,
      rewardsFetchVersion: 0,
    });

    const { result } = renderHook(() =>
      useMerklBonusClaim(eligibleAsset, 'test_location'),
    );

    expect(result.current.claimableReward).toBeNull();
  });

  describe('CTA available analytics event', () => {
    it('fires trackEvent once when claimable bonus is available and visible', () => {
      mockUseMerklRewards.mockReturnValue({
        claimableReward: '5.00',
        hasClaimedBefore: false,
        rewardsFetchVersion: 0,
      });

      renderHook(() =>
        useMerklBonusClaim(eligibleAsset, 'test_location', true),
      );

      expect(getAnalyticsMocks().trackEvent).toHaveBeenCalledTimes(1);
    });

    it('does not fire trackEvent when not visible', () => {
      mockUseMerklRewards.mockReturnValue({
        claimableReward: '5.00',
        hasClaimedBefore: false,
        rewardsFetchVersion: 0,
      });

      renderHook(() =>
        useMerklBonusClaim(eligibleAsset, 'test_location', false),
      );

      expect(getAnalyticsMocks().trackEvent).not.toHaveBeenCalled();
    });

    it('does not fire trackEvent when there is a pending claim', () => {
      mockUseMerklRewards.mockReturnValue({
        claimableReward: '5.00',
        hasClaimedBefore: false,
        rewardsFetchVersion: 0,
      });
      mockUsePendingMerklClaim.mockReturnValue({ hasPendingClaim: true });

      renderHook(() =>
        useMerklBonusClaim(eligibleAsset, 'test_location', true),
      );

      expect(getAnalyticsMocks().trackEvent).not.toHaveBeenCalled();
    });

    it('does not fire trackEvent when claimableReward is null', () => {
      mockUseMerklRewards.mockReturnValue({
        claimableReward: null,
        hasClaimedBefore: false,
        rewardsFetchVersion: 0,
      });

      renderHook(() =>
        useMerklBonusClaim(eligibleAsset, 'test_location', true),
      );

      expect(getAnalyticsMocks().trackEvent).not.toHaveBeenCalled();
    });

    it('does not fire trackEvent when claimableReward is "< 0.01" (below threshold)', () => {
      mockUseMerklRewards.mockReturnValue({
        claimableReward: '< 0.01',
        hasClaimedBefore: false,
        rewardsFetchVersion: 0,
      });

      renderHook(() =>
        useMerklBonusClaim(eligibleAsset, 'test_location', true),
      );

      expect(getAnalyticsMocks().trackEvent).not.toHaveBeenCalled();
    });

    it('does not fire trackEvent when claimableReward is below threshold (e.g. "0.005")', () => {
      mockUseMerklRewards.mockReturnValue({
        claimableReward: '0.005',
        hasClaimedBefore: false,
        rewardsFetchVersion: 0,
      });

      renderHook(() =>
        useMerklBonusClaim(eligibleAsset, 'test_location', true),
      );

      expect(getAnalyticsMocks().trackEvent).not.toHaveBeenCalled();
    });

    it('fires trackEvent only once across multiple re-renders', () => {
      mockUseMerklRewards.mockReturnValue({
        claimableReward: '5.00',
        hasClaimedBefore: false,
        rewardsFetchVersion: 0,
      });

      const { rerender } = renderHook(() =>
        useMerklBonusClaim(eligibleAsset, 'test_location', true),
      );
      rerender();
      rerender();

      expect(getAnalyticsMocks().trackEvent).toHaveBeenCalledTimes(1);
    });

    it('includes correct analytics properties in the event', () => {
      mockUseMerklRewards.mockReturnValue({
        claimableReward: '5.00',
        hasClaimedBefore: true,
        rewardsFetchVersion: 0,
      });

      renderHook(() =>
        useMerklBonusClaim(eligibleAsset, 'test_location', true),
      );

      expect(getAnalyticsMocks().addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'test_location',
          view_trigger: 'component_mounted',
          button_text: 'Claim bonus',
          network_chain_id: eligibleAsset.chainId,
          asset_symbol: eligibleAsset.symbol,
          bonus_amount_range: '1.00 - 9.99',
          has_claimed_before: true,
        }),
      );
    });
  });

  describe('getBonusAmountRange', () => {
    const bonusRangeCases: [string, string][] = [
      ['0.50', '0.01 - 0.99'],
      ['0.99', '0.01 - 0.99'],
      ['1.00', '1.00 - 9.99'],
      ['9.99', '1.00 - 9.99'],
      ['10.00', '10.00 - 99.99'],
      ['99.99', '10.00 - 99.99'],
      ['100.00', '100.00 - 999.99'],
      ['999.99', '100.00 - 999.99'],
      ['1000.00', '1000.00+'],
      ['9999.00', '1000.00+'],
    ];

    it.each(bonusRangeCases)(
      'maps reward "%s" to range "%s" via the analytics event',
      (bonusValue, expectedRange) => {
        mockUseMerklRewards.mockReturnValue({
          claimableReward: bonusValue,
          hasClaimedBefore: false,
          rewardsFetchVersion: 0,
        });

        renderHook(() =>
          useMerklBonusClaim(eligibleAsset, 'test_location', true),
        );

        expect(getAnalyticsMocks().addProperties).toHaveBeenCalledWith(
          expect.objectContaining({ bonus_amount_range: expectedRange }),
        );
      },
    );
  });
});
