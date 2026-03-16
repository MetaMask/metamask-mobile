import { renderHook } from '@testing-library/react-hooks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useMerklBonusClaim } from './useMerklBonusClaim';
import { TokenI } from '../../../../Tokens/types';
import { AGLAMERKL_ADDRESS_MAINNET } from '../constants';

const mockClaimRewards = jest.fn().mockResolvedValue(undefined);

const mockUseMerklRewards = jest.fn((_opts?: unknown) => ({
  claimableReward: null as string | null,
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
  });

  it('returns default claim data when asset is undefined', () => {
    const { result } = renderHook(() => useMerklBonusClaim(undefined));

    expect(result.current.claimableReward).toBeNull();
    expect(result.current.hasPendingClaim).toBe(false);
    expect(result.current.isClaiming).toBe(false);
  });

  it('returns default claim data when feature flag is disabled', () => {
    mockIsMerklCampaignClaimingEnabled = false;

    const { result } = renderHook(() => useMerklBonusClaim(eligibleAsset));

    expect(result.current.claimableReward).toBeNull();
    expect(result.current.hasPendingClaim).toBe(false);
  });

  it('returns default claim data when user is geo-blocked', () => {
    mockIsGeoEligible = false;

    const { result } = renderHook(() => useMerklBonusClaim(eligibleAsset));

    expect(result.current.claimableReward).toBeNull();
    expect(result.current.hasPendingClaim).toBe(false);
  });

  it('returns default claim data for ineligible token', () => {
    const { result } = renderHook(() => useMerklBonusClaim(ineligibleAsset));

    expect(result.current.claimableReward).toBeNull();
    expect(result.current.hasPendingClaim).toBe(false);
  });

  it('passes undefined to underlying hooks when asset is ineligible', () => {
    renderHook(() => useMerklBonusClaim(ineligibleAsset));

    expect(mockUseMerklRewards).toHaveBeenCalledWith({ asset: undefined });
    expect(mockUseMerklClaimTransaction).toHaveBeenCalledWith(undefined);
  });

  it('passes eligible asset to underlying hooks', () => {
    renderHook(() => useMerklBonusClaim(eligibleAsset));

    expect(mockUseMerklRewards).toHaveBeenCalledWith({
      asset: eligibleAsset,
    });
    expect(mockUseMerklClaimTransaction).toHaveBeenCalledWith(eligibleAsset);
  });

  it('returns composed data from underlying hooks for eligible asset', () => {
    mockUseMerklRewards.mockReturnValue({ claimableReward: '1.50' });
    mockUsePendingMerklClaim.mockReturnValue({ hasPendingClaim: true });
    mockUseMerklClaimTransaction.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: true,
      error: null,
    });

    const { result } = renderHook(() => useMerklBonusClaim(eligibleAsset));

    expect(result.current.claimableReward).toBe('1.50');
    expect(result.current.hasPendingClaim).toBe(true);
    expect(result.current.isClaiming).toBe(true);
    expect(result.current.claimRewards).toBe(mockClaimRewards);
  });
});
