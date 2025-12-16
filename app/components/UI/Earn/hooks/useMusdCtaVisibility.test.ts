import { renderHook } from '@testing-library/react-hooks';
import { Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useMusdCtaVisibility } from './useMusdCtaVisibility';
import { useHasMusdBalance } from './useHasMusdBalance';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import { useNetworksByCustomNamespace } from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useRampTokens, RampsToken } from '../../Ramp/hooks/useRampTokens';
import { MUSD_TOKEN_ASSET_ID_BY_CHAIN } from '../constants/musd';
import { selectIsMusdCtaEnabledFlag } from '../selectors/featureFlags';

jest.mock('./useHasMusdBalance');
jest.mock('../../../hooks/useCurrentNetworkInfo');
jest.mock('../../../hooks/useNetworksByNamespace/useNetworksByNamespace');
jest.mock('../../Ramp/hooks/useRampTokens');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('../selectors/featureFlags');

import { useSelector } from 'react-redux';

const mockUseHasMusdBalance = useHasMusdBalance as jest.MockedFunction<
  typeof useHasMusdBalance
>;
const mockUseCurrentNetworkInfo = useCurrentNetworkInfo as jest.MockedFunction<
  typeof useCurrentNetworkInfo
>;
const mockUseNetworksByCustomNamespace =
  useNetworksByCustomNamespace as jest.MockedFunction<
    typeof useNetworksByCustomNamespace
  >;
const mockUseRampTokens = useRampTokens as jest.MockedFunction<
  typeof useRampTokens
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useMusdCtaVisibility', () => {
  const defaultNetworkInfo = {
    enabledNetworks: [],
    getNetworkInfo: jest.fn(),
    getNetworkInfoByChainId: jest.fn(),
    isDisabled: false,
    hasEnabledNetworks: false,
  };

  const defaultNetworksByNamespace = {
    networks: [],
    selectedNetworks: [],
    areAllNetworksSelected: false,
    areAnyNetworksSelected: false,
    networkCount: 0,
    selectedCount: 0,
    totalEnabledNetworksCount: 0,
  };

  const createMusdRampToken = (
    chainId: Hex,
    tokenSupported = true,
  ): RampsToken => {
    const assetId = MUSD_TOKEN_ASSET_ID_BY_CHAIN[chainId].toLowerCase();
    // Extract CAIP-2 chainId from CAIP-19 assetId (e.g., 'eip155:1' from 'eip155:1/erc20:0x...')
    const caipChainId = assetId.split('/')[0] as `${string}:${string}`;
    return {
      assetId: assetId as `${string}:${string}/${string}:${string}`,
      symbol: 'MUSD',
      chainId: caipChainId,
      tokenSupported,
      name: 'MetaMask USD',
      iconUrl: '',
      decimals: 6,
    };
  };

  const defaultRampTokens = {
    topTokens: null,
    allTokens: [
      createMusdRampToken(CHAIN_IDS.MAINNET),
      createMusdRampToken(CHAIN_IDS.LINEA_MAINNET),
    ],
    isLoading: false,
    error: null,
  };

  let mockIsMusdCtaEnabled = true;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMusdCtaEnabled = true;
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsMusdCtaEnabledFlag) {
        return mockIsMusdCtaEnabled;
      }
      return undefined;
    });
    mockUseHasMusdBalance.mockReturnValue({
      hasMusdBalance: false,
      balancesByChain: {},
    });
    mockUseCurrentNetworkInfo.mockReturnValue(defaultNetworkInfo);
    mockUseNetworksByCustomNamespace.mockReturnValue(
      defaultNetworksByNamespace,
    );
    mockUseRampTokens.mockReturnValue(defaultRampTokens);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('hook structure', () => {
    it('returns object with shouldShowCta, showNetworkIcon, and selectedChainId properties', () => {
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: true,
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current).toHaveProperty('shouldShowCta');
      expect(result.current).toHaveProperty('showNetworkIcon');
      expect(result.current).toHaveProperty('selectedChainId');
    });
  });

  describe('feature flag', () => {
    it('returns shouldShowCta false when feature flag is disabled', () => {
      mockIsMusdCtaEnabled = false;
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectIsMusdCtaEnabledFlag) {
          return mockIsMusdCtaEnabled;
        }
        return undefined;
      });
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: true,
      });
      mockUseCurrentNetworkInfo.mockReturnValue({
        ...defaultNetworkInfo,
        enabledNetworks: [
          { chainId: CHAIN_IDS.MAINNET, enabled: true },
          { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
        ],
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current.shouldShowCta).toBe(false);
      expect(result.current.showNetworkIcon).toBe(false);
      expect(result.current.selectedChainId).toBeNull();
    });

    it('returns shouldShowCta true when feature flag is enabled and conditions are met', () => {
      mockIsMusdCtaEnabled = true;
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectIsMusdCtaEnabledFlag) {
          return mockIsMusdCtaEnabled;
        }
        return undefined;
      });
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: true,
      });
      mockUseCurrentNetworkInfo.mockReturnValue({
        ...defaultNetworkInfo,
        enabledNetworks: [
          { chainId: CHAIN_IDS.MAINNET, enabled: true },
          { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
        ],
      });
      mockUseHasMusdBalance.mockReturnValue({
        hasMusdBalance: false,
        balancesByChain: {},
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current.shouldShowCta).toBe(true);
    });

    it('returns shouldShowCta false when feature flag is disabled even on supported single chain', () => {
      mockIsMusdCtaEnabled = false;
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectIsMusdCtaEnabledFlag) {
          return mockIsMusdCtaEnabled;
        }
        return undefined;
      });
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: false,
      });
      mockUseCurrentNetworkInfo.mockReturnValue({
        ...defaultNetworkInfo,
        enabledNetworks: [{ chainId: CHAIN_IDS.MAINNET, enabled: true }],
      });
      mockUseHasMusdBalance.mockReturnValue({
        hasMusdBalance: false,
        balancesByChain: {},
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current.shouldShowCta).toBe(false);
      expect(result.current.showNetworkIcon).toBe(false);
      expect(result.current.selectedChainId).toBeNull();
    });
  });

  describe('all networks selected (popular networks)', () => {
    beforeEach(() => {
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: true,
      });
      mockUseCurrentNetworkInfo.mockReturnValue({
        ...defaultNetworkInfo,
        enabledNetworks: [
          { chainId: CHAIN_IDS.MAINNET, enabled: true },
          { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
          { chainId: CHAIN_IDS.BSC, enabled: true },
        ],
      });
    });

    it('returns shouldShowCta true when user has no MUSD balance and MUSD is buyable', () => {
      mockUseHasMusdBalance.mockReturnValue({
        hasMusdBalance: false,
        balancesByChain: {},
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current.shouldShowCta).toBe(true);
      expect(result.current.showNetworkIcon).toBe(false);
      expect(result.current.selectedChainId).toBeNull();
    });

    it('returns shouldShowCta false when user has MUSD balance', () => {
      mockUseHasMusdBalance.mockReturnValue({
        hasMusdBalance: true,
        balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current.shouldShowCta).toBe(false);
      expect(result.current.showNetworkIcon).toBe(false);
      expect(result.current.selectedChainId).toBeNull();
    });

    it('returns shouldShowCta false when MUSD is not buyable on any chain', () => {
      mockUseRampTokens.mockReturnValue({
        ...defaultRampTokens,
        allTokens: [],
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current.shouldShowCta).toBe(false);
    });

    it('returns showNetworkIcon false for all networks', () => {
      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current.showNetworkIcon).toBe(false);
    });
  });

  describe('single supported network selected', () => {
    describe('mainnet selected', () => {
      beforeEach(() => {
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: false,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [{ chainId: CHAIN_IDS.MAINNET, enabled: true }],
        });
      });

      it('returns shouldShowCta true when user has no MUSD on mainnet', () => {
        mockUseHasMusdBalance.mockReturnValue({
          hasMusdBalance: false,
          balancesByChain: {},
        });

        const { result } = renderHook(() => useMusdCtaVisibility());

        expect(result.current.shouldShowCta).toBe(true);
        expect(result.current.showNetworkIcon).toBe(true);
        expect(result.current.selectedChainId).toBe(CHAIN_IDS.MAINNET);
      });

      it('returns shouldShowCta false when user has MUSD on mainnet', () => {
        mockUseHasMusdBalance.mockReturnValue({
          hasMusdBalance: true,
          balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
        });

        const { result } = renderHook(() => useMusdCtaVisibility());

        expect(result.current.shouldShowCta).toBe(false);
      });

      it('returns shouldShowCta true when user has MUSD on different chain but not mainnet', () => {
        mockUseHasMusdBalance.mockReturnValue({
          hasMusdBalance: true,
          balancesByChain: { [CHAIN_IDS.LINEA_MAINNET]: '0x1234' },
        });

        const { result } = renderHook(() => useMusdCtaVisibility());

        expect(result.current.shouldShowCta).toBe(true);
        expect(result.current.showNetworkIcon).toBe(true);
      });

      it('returns shouldShowCta false when MUSD not buyable in region for mainnet', () => {
        mockUseRampTokens.mockReturnValue({
          ...defaultRampTokens,
          allTokens: [
            createMusdRampToken(CHAIN_IDS.MAINNET, false), // tokenSupported = false
            createMusdRampToken(CHAIN_IDS.LINEA_MAINNET),
          ],
        });

        const { result } = renderHook(() => useMusdCtaVisibility());

        expect(result.current.shouldShowCta).toBe(false);
        expect(result.current.showNetworkIcon).toBe(false);
        expect(result.current.selectedChainId).toBeNull();
      });

      it('returns shouldShowCta false when MUSD not buyable anywhere', () => {
        mockUseRampTokens.mockReturnValue({
          ...defaultRampTokens,
          allTokens: [
            createMusdRampToken(CHAIN_IDS.MAINNET, false),
            createMusdRampToken(CHAIN_IDS.LINEA_MAINNET, false),
          ],
        });

        const { result } = renderHook(() => useMusdCtaVisibility());

        expect(result.current.shouldShowCta).toBe(false);
      });
    });

    describe('linea selected', () => {
      beforeEach(() => {
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: false,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [
            { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
          ],
        });
      });

      it('returns shouldShowCta true with network icon when no MUSD on Linea', () => {
        mockUseHasMusdBalance.mockReturnValue({
          hasMusdBalance: false,
          balancesByChain: {},
        });

        const { result } = renderHook(() => useMusdCtaVisibility());

        expect(result.current.shouldShowCta).toBe(true);
        expect(result.current.showNetworkIcon).toBe(true);
        expect(result.current.selectedChainId).toBe(CHAIN_IDS.LINEA_MAINNET);
      });

      it('returns shouldShowCta false when MUSD not buyable in region for Linea', () => {
        mockUseRampTokens.mockReturnValue({
          ...defaultRampTokens,
          allTokens: [
            createMusdRampToken(CHAIN_IDS.MAINNET),
            createMusdRampToken(CHAIN_IDS.LINEA_MAINNET, false), // tokenSupported = false
          ],
        });

        const { result } = renderHook(() => useMusdCtaVisibility());

        expect(result.current.shouldShowCta).toBe(false);
        expect(result.current.showNetworkIcon).toBe(false);
        expect(result.current.selectedChainId).toBeNull();
      });
    });

    describe('BSC selected', () => {
      beforeEach(() => {
        mockUseNetworksByCustomNamespace.mockReturnValue({
          ...defaultNetworksByNamespace,
          areAllNetworksSelected: false,
        });
        mockUseCurrentNetworkInfo.mockReturnValue({
          ...defaultNetworkInfo,
          enabledNetworks: [{ chainId: CHAIN_IDS.BSC, enabled: true }],
        });
      });

      it('returns shouldShowCta false when BSC selected', () => {
        mockUseHasMusdBalance.mockReturnValue({
          hasMusdBalance: false,
          balancesByChain: {},
        });

        const { result } = renderHook(() => useMusdCtaVisibility());

        expect(result.current.shouldShowCta).toBe(false);
        expect(result.current.showNetworkIcon).toBe(false);
        expect(result.current.selectedChainId).toBeNull();
      });

      it('returns shouldShowCta false when user has MUSD balance', () => {
        mockUseHasMusdBalance.mockReturnValue({
          hasMusdBalance: true,
          balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
        });

        const { result } = renderHook(() => useMusdCtaVisibility());

        expect(result.current.shouldShowCta).toBe(false);
      });
    });
  });

  describe('unsupported network selected', () => {
    it('returns shouldShowCta false for Polygon', () => {
      const polygonChainId = '0x89' as Hex;
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: false,
      });
      mockUseCurrentNetworkInfo.mockReturnValue({
        ...defaultNetworkInfo,
        enabledNetworks: [{ chainId: polygonChainId, enabled: true }],
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current.shouldShowCta).toBe(false);
      expect(result.current.showNetworkIcon).toBe(false);
      expect(result.current.selectedChainId).toBeNull();
    });

    it('returns shouldShowCta false for Arbitrum', () => {
      const arbitrumChainId = '0xa4b1' as Hex;
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: false,
      });
      mockUseCurrentNetworkInfo.mockReturnValue({
        ...defaultNetworkInfo,
        enabledNetworks: [{ chainId: arbitrumChainId, enabled: true }],
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current.shouldShowCta).toBe(false);
      expect(result.current.showNetworkIcon).toBe(false);
    });

    it('returns shouldShowCta false for Optimism', () => {
      const optimismChainId = '0xa' as Hex;
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: false,
      });
      mockUseCurrentNetworkInfo.mockReturnValue({
        ...defaultNetworkInfo,
        enabledNetworks: [{ chainId: optimismChainId, enabled: true }],
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current.shouldShowCta).toBe(false);
      expect(result.current.showNetworkIcon).toBe(false);
    });

    it('returns shouldShowCta false for unsupported network when user has MUSD balance', () => {
      const polygonChainId = '0x89' as Hex;
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: false,
      });
      mockUseCurrentNetworkInfo.mockReturnValue({
        ...defaultNetworkInfo,
        enabledNetworks: [{ chainId: polygonChainId, enabled: true }],
      });
      mockUseHasMusdBalance.mockReturnValue({
        hasMusdBalance: true,
        balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current.shouldShowCta).toBe(false);
    });
  });

  describe('multiple networks selected (not all)', () => {
    it('returns shouldShowCta true without network icon when multiple networks selected and no MUSD balance', () => {
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: false,
      });
      mockUseCurrentNetworkInfo.mockReturnValue({
        ...defaultNetworkInfo,
        enabledNetworks: [
          { chainId: CHAIN_IDS.MAINNET, enabled: true },
          { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
        ],
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current.shouldShowCta).toBe(true);
      expect(result.current.showNetworkIcon).toBe(false);
      expect(result.current.selectedChainId).toBeNull();
    });

    it('returns shouldShowCta false when multiple networks selected and user has MUSD balance', () => {
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: false,
      });
      mockUseCurrentNetworkInfo.mockReturnValue({
        ...defaultNetworkInfo,
        enabledNetworks: [
          { chainId: CHAIN_IDS.MAINNET, enabled: true },
          { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
        ],
      });
      mockUseHasMusdBalance.mockReturnValue({
        hasMusdBalance: true,
        balancesByChain: { [CHAIN_IDS.MAINNET]: '0x1234' },
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current.shouldShowCta).toBe(false);
    });
  });

  describe('geo restriction scenarios', () => {
    it('returns shouldShowCta false when allTokens is null (loading)', () => {
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: true,
      });
      mockUseRampTokens.mockReturnValue({
        ...defaultRampTokens,
        allTokens: null,
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current.shouldShowCta).toBe(false);
    });

    it('returns shouldShowCta true when MUSD buyable on at least one chain in all networks view', () => {
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: true,
      });
      mockUseRampTokens.mockReturnValue({
        ...defaultRampTokens,
        allTokens: [
          createMusdRampToken(CHAIN_IDS.MAINNET, false), // not buyable
          createMusdRampToken(CHAIN_IDS.LINEA_MAINNET, true), // buyable
        ],
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current.shouldShowCta).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns shouldShowCta false with empty enabledNetworks', () => {
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: false,
      });
      mockUseCurrentNetworkInfo.mockReturnValue({
        ...defaultNetworkInfo,
        enabledNetworks: [],
      });

      const { result } = renderHook(() => useMusdCtaVisibility());

      expect(result.current.shouldShowCta).toBe(false);
      expect(result.current.showNetworkIcon).toBe(false);
      expect(result.current.selectedChainId).toBeNull();
    });

    it('handles undefined values gracefully', () => {
      mockUseNetworksByCustomNamespace.mockReturnValue({
        ...defaultNetworksByNamespace,
        areAllNetworksSelected: false,
      });
      mockUseCurrentNetworkInfo.mockReturnValue({
        ...defaultNetworkInfo,
        enabledNetworks: [],
      });

      expect(() => renderHook(() => useMusdCtaVisibility())).not.toThrow();
    });
  });
});
