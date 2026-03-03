import { renderHook } from '@testing-library/react-hooks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useMerklClaimCtaVisibility } from './useMerklClaimCtaVisibility';
import { TokenI } from '../../Tokens/types';
import { type MerklClaimData } from '../components/MerklRewards/hooks/MerklClaimHandler';
import { AGLAMERKL_ADDRESS_MAINNET } from '../components/MerklRewards/constants';

let mockIsMerklCampaignClaimingEnabled = true;
jest.mock('../selectors/featureFlags', () => ({
  selectMerklCampaignClaimingEnabledFlag: () =>
    mockIsMerklCampaignClaimingEnabled,
}));

let mockIsGeoEligible = true;
jest.mock('./useMusdConversionEligibility', () => ({
  useMusdConversionEligibility: () => ({
    isEligible: mockIsGeoEligible,
    isLoading: false,
    geolocation: 'US',
    blockedCountries: [],
  }),
}));

jest.mock('../components/MerklRewards/hooks/useMerklRewards', () => ({
  isTokenEligibleForMerklRewards: jest.requireActual(
    '../components/MerklRewards/hooks/useMerklRewards',
  ).isTokenEligibleForMerklRewards,
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

const mockClaimRewards = jest.fn().mockResolvedValue(undefined);

const claimableData: MerklClaimData = {
  claimableReward: '1.50',
  hasPendingClaim: false,
  isClaiming: false,
  claimRewards: mockClaimRewards,
};

describe('useMerklClaimCtaVisibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMerklCampaignClaimingEnabled = true;
    mockIsGeoEligible = true;
  });

  describe('shouldShowBonusClaimCta', () => {
    it('returns true when all conditions are met', () => {
      const { result } = renderHook(() => useMerklClaimCtaVisibility());

      expect(
        result.current.shouldShowBonusClaimCta(eligibleAsset, claimableData),
      ).toBe(true);
    });

    it('returns false when feature flag is disabled', () => {
      mockIsMerklCampaignClaimingEnabled = false;

      const { result } = renderHook(() => useMerklClaimCtaVisibility());

      expect(
        result.current.shouldShowBonusClaimCta(eligibleAsset, claimableData),
      ).toBe(false);
    });

    it('returns false when user is geo-blocked', () => {
      mockIsGeoEligible = false;

      const { result } = renderHook(() => useMerklClaimCtaVisibility());

      expect(
        result.current.shouldShowBonusClaimCta(eligibleAsset, claimableData),
      ).toBe(false);
    });

    it('returns false when asset is undefined', () => {
      const { result } = renderHook(() => useMerklClaimCtaVisibility());

      expect(
        result.current.shouldShowBonusClaimCta(undefined, claimableData),
      ).toBe(false);
    });

    it('returns false when asset is not eligible for Merkl rewards', () => {
      const { result } = renderHook(() => useMerklClaimCtaVisibility());

      expect(
        result.current.shouldShowBonusClaimCta(ineligibleAsset, claimableData),
      ).toBe(false);
    });

    it('returns false when claimableReward is null', () => {
      const { result } = renderHook(() => useMerklClaimCtaVisibility());

      const noRewardData: MerklClaimData = {
        ...claimableData,
        claimableReward: null,
      };

      expect(
        result.current.shouldShowBonusClaimCta(eligibleAsset, noRewardData),
      ).toBe(false);
    });

    it('returns false when merklClaimData is undefined', () => {
      const { result } = renderHook(() => useMerklClaimCtaVisibility());

      expect(
        result.current.shouldShowBonusClaimCta(eligibleAsset, undefined),
      ).toBe(false);
    });

    it('returns false when hasPendingClaim is true', () => {
      const { result } = renderHook(() => useMerklClaimCtaVisibility());

      const pendingData: MerklClaimData = {
        ...claimableData,
        hasPendingClaim: true,
      };

      expect(
        result.current.shouldShowBonusClaimCta(eligibleAsset, pendingData),
      ).toBe(false);
    });

    it('returns false when asset has no address', () => {
      const { result } = renderHook(() => useMerklClaimCtaVisibility());

      const noAddressAsset = { ...eligibleAsset, address: '' };

      expect(
        result.current.shouldShowBonusClaimCta(noAddressAsset, claimableData),
      ).toBe(false);
    });

    it('returns false when asset has no chainId', () => {
      const { result } = renderHook(() => useMerklClaimCtaVisibility());

      const noChainAsset = { ...eligibleAsset, chainId: '' };

      expect(
        result.current.shouldShowBonusClaimCta(noChainAsset, claimableData),
      ).toBe(false);
    });
  });
});
