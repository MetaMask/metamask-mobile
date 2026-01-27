import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex, KnownCaipNamespace } from '@metamask/utils';
import { useMusdConversionFlowData } from './useMusdConversionFlowData';
import { useMusdConversionTokens } from './useMusdConversionTokens';
import { useMusdConversionEligibility } from './useMusdConversionEligibility';
import { useCurrentNetworkInfo } from '../../../hooks/useCurrentNetworkInfo';
import { useNetworksByCustomNamespace } from '../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { selectAccountGroupBalanceForEmptyState } from '../../../../selectors/assets/balances';
import { AssetType } from '../../../Views/confirmations/types/token';
import { MUSD_CONVERSION_DEFAULT_CHAIN_ID } from '../constants/musd';

jest.mock('react-redux');
jest.mock('./useMusdConversionTokens');
jest.mock('./useMusdConversionEligibility');
jest.mock('../../../hooks/useCurrentNetworkInfo');
jest.mock('../../../hooks/useNetworksByNamespace/useNetworksByNamespace');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseMusdConversionTokens =
  useMusdConversionTokens as jest.MockedFunction<
    typeof useMusdConversionTokens
  >;
const mockUseMusdConversionEligibility =
  useMusdConversionEligibility as jest.MockedFunction<
    typeof useMusdConversionEligibility
  >;
const mockUseCurrentNetworkInfo = useCurrentNetworkInfo as jest.MockedFunction<
  typeof useCurrentNetworkInfo
>;
const mockUseNetworksByCustomNamespace =
  useNetworksByCustomNamespace as jest.MockedFunction<
    typeof useNetworksByCustomNamespace
  >;

describe('useMusdConversionFlowData', () => {
  const mockUsdcMainnet: AssetType = {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    chainId: '0x1',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    balance: '1000000',
    fiat: {
      balance: 100,
      currency: 'usd',
      conversionRate: 1,
    },
    logo: 'https://example.com/usdc.png',
    isETH: false,
    aggregators: [],
    image: 'https://example.com/usdc.png',
  };

  const mockUsdtMainnet: AssetType = {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    chainId: '0x1',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    balance: '2000000',
    fiat: {
      balance: 200,
      currency: 'usd',
      conversionRate: 1,
    },
    logo: 'https://example.com/usdt.png',
    isETH: false,
    aggregators: [],
    image: 'https://example.com/usdt.png',
  };

  const mockUsdcLinea: AssetType = {
    address: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
    chainId: CHAIN_IDS.LINEA_MAINNET,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    balance: '500000',
    fiat: {
      balance: 50,
      currency: 'usd',
      conversionRate: 1,
    },
    logo: 'https://example.com/usdc.png',
    isETH: false,
    aggregators: [],
    image: 'https://example.com/usdc.png',
  };

  const mockGetMusdOutputChainId = jest.fn((chainId?: string) =>
    chainId ? (chainId as Hex) : MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectAccountGroupBalanceForEmptyState) {
        return { totalBalanceInUserCurrency: 100 };
      }
      return undefined;
    });

    mockUseMusdConversionTokens.mockReturnValue({
      tokens: [mockUsdcMainnet],
      getMusdOutputChainId: mockGetMusdOutputChainId,
      filterAllowedTokens: jest.fn(),
      isConversionToken: jest.fn(),
      isMusdSupportedOnChain: jest.fn(),
    });

    mockUseMusdConversionEligibility.mockReturnValue({
      isEligible: true,
      isLoading: false,
      geolocation: { country: 'US' },
      blockedCountries: ['GB'],
    });

    mockUseCurrentNetworkInfo.mockReturnValue({
      enabledNetworks: [
        { chainId: CHAIN_IDS.MAINNET, enabled: true },
        { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: false },
      ],
    } as ReturnType<typeof useCurrentNetworkInfo>);

    mockUseNetworksByCustomNamespace.mockReturnValue({
      areAllNetworksSelected: false,
      filteredNetworks: [],
    } as ReturnType<typeof useNetworksByCustomNamespace>);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('hook structure', () => {
    it('returns object with all required properties', () => {
      const { result } = renderHook(() => useMusdConversionFlowData());

      expect(result.current).toHaveProperty('isPopularNetworksFilterActive');
      expect(result.current).toHaveProperty('selectedChainId');
      expect(result.current).toHaveProperty('selectedChains');
      expect(result.current).toHaveProperty('isGeoEligible');
      expect(result.current).toHaveProperty('isEmptyWallet');
      expect(result.current).toHaveProperty('hasConvertibleTokens');
      expect(result.current).toHaveProperty('conversionTokens');
      expect(result.current).toHaveProperty('getPreferredPaymentToken');
      expect(result.current).toHaveProperty('getChainIdForBuyFlow');
      expect(result.current).toHaveProperty('getMusdOutputChainId');
    });

    it('returns helper functions as functions', () => {
      const { result } = renderHook(() => useMusdConversionFlowData());

      expect(typeof result.current.getPreferredPaymentToken).toBe('function');
      expect(typeof result.current.getChainIdForBuyFlow).toBe('function');
      expect(typeof result.current.getMusdOutputChainId).toBe('function');
    });
  });

  describe('network filter state', () => {
    it('identifies single chain selection correctly', () => {
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [{ chainId: CHAIN_IDS.MAINNET, enabled: true }],
      } as ReturnType<typeof useCurrentNetworkInfo>);
      mockUseNetworksByCustomNamespace.mockReturnValue({
        areAllNetworksSelected: false,
        filteredNetworks: [],
      } as ReturnType<typeof useNetworksByCustomNamespace>);

      const { result } = renderHook(() => useMusdConversionFlowData());

      expect(result.current.isPopularNetworksFilterActive).toBe(false);
      expect(result.current.selectedChainId).toBe(CHAIN_IDS.MAINNET);
      expect(result.current.selectedChains).toEqual([CHAIN_IDS.MAINNET]);
    });

    it('identifies all networks filter as popular networks filter', () => {
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [
          { chainId: CHAIN_IDS.MAINNET, enabled: true },
          { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
        ],
      } as ReturnType<typeof useCurrentNetworkInfo>);
      mockUseNetworksByCustomNamespace.mockReturnValue({
        areAllNetworksSelected: true,
        filteredNetworks: [],
      } as ReturnType<typeof useNetworksByCustomNamespace>);

      const { result } = renderHook(() => useMusdConversionFlowData());

      expect(result.current.isPopularNetworksFilterActive).toBe(true);
      expect(result.current.selectedChainId).toBe(null);
      expect(result.current.selectedChains).toEqual([
        CHAIN_IDS.MAINNET,
        CHAIN_IDS.LINEA_MAINNET,
      ]);
    });

    it('identifies multiple chains as popular networks filter', () => {
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [
          { chainId: CHAIN_IDS.MAINNET, enabled: true },
          { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
        ],
      } as ReturnType<typeof useCurrentNetworkInfo>);
      mockUseNetworksByCustomNamespace.mockReturnValue({
        areAllNetworksSelected: false,
        filteredNetworks: [],
      } as ReturnType<typeof useNetworksByCustomNamespace>);

      const { result } = renderHook(() => useMusdConversionFlowData());

      expect(result.current.isPopularNetworksFilterActive).toBe(true);
      expect(result.current.selectedChainId).toBe(null);
    });

    it('filters out disabled networks', () => {
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [
          { chainId: CHAIN_IDS.MAINNET, enabled: true },
          { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: false },
        ],
      } as ReturnType<typeof useCurrentNetworkInfo>);

      const { result } = renderHook(() => useMusdConversionFlowData());

      expect(result.current.selectedChains).toEqual([CHAIN_IDS.MAINNET]);
    });
  });

  describe('user state', () => {
    it('detects empty wallet correctly', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAccountGroupBalanceForEmptyState) {
          return { totalBalanceInUserCurrency: 0 };
        }
        return undefined;
      });

      const { result } = renderHook(() => useMusdConversionFlowData());

      expect(result.current.isEmptyWallet).toBe(true);
    });

    it('detects non-empty wallet correctly', () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === selectAccountGroupBalanceForEmptyState) {
          return { totalBalanceInUserCurrency: 100 };
        }
        return undefined;
      });

      const { result } = renderHook(() => useMusdConversionFlowData());

      expect(result.current.isEmptyWallet).toBe(false);
    });

    it('returns geo-eligibility from hook', () => {
      mockUseMusdConversionEligibility.mockReturnValue({
        isEligible: true,
        isLoading: false,
        geolocation: { country: 'US' },
        blockedCountries: [],
      });

      const { result } = renderHook(() => useMusdConversionFlowData());

      expect(result.current.isGeoEligible).toBe(true);
    });

    it('returns geo-ineligibility when blocked', () => {
      mockUseMusdConversionEligibility.mockReturnValue({
        isEligible: false,
        isLoading: false,
        geolocation: { country: 'GB' },
        blockedCountries: ['GB'],
      });

      const { result } = renderHook(() => useMusdConversionFlowData());

      expect(result.current.isGeoEligible).toBe(false);
    });
  });

  describe('token availability', () => {
    it('detects convertible tokens correctly', () => {
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [mockUsdcMainnet, mockUsdtMainnet],
        getMusdOutputChainId: mockGetMusdOutputChainId,
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
      });

      const { result } = renderHook(() => useMusdConversionFlowData());

      expect(result.current.hasConvertibleTokens).toBe(true);
      expect(result.current.conversionTokens).toHaveLength(2);
    });

    it('detects no convertible tokens correctly', () => {
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [],
        getMusdOutputChainId: mockGetMusdOutputChainId,
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
      });

      const { result } = renderHook(() => useMusdConversionFlowData());

      expect(result.current.hasConvertibleTokens).toBe(false);
      expect(result.current.conversionTokens).toEqual([]);
    });
  });

  describe('getPreferredPaymentToken', () => {
    it('returns first token when all networks selected', () => {
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [mockUsdcMainnet, mockUsdtMainnet],
        getMusdOutputChainId: mockGetMusdOutputChainId,
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
      });
      mockUseNetworksByCustomNamespace.mockReturnValue({
        areAllNetworksSelected: true,
        filteredNetworks: [],
      } as ReturnType<typeof useNetworksByCustomNamespace>);

      const { result } = renderHook(() => useMusdConversionFlowData());
      const paymentToken = result.current.getPreferredPaymentToken();

      expect(paymentToken).toEqual({
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1',
      });
    });

    it('returns token on selected chain when specific chain selected', () => {
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [mockUsdcMainnet, mockUsdcLinea],
        getMusdOutputChainId: mockGetMusdOutputChainId,
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
      });
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [{ chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true }],
      } as ReturnType<typeof useCurrentNetworkInfo>);
      mockUseNetworksByCustomNamespace.mockReturnValue({
        areAllNetworksSelected: false,
        filteredNetworks: [],
      } as ReturnType<typeof useNetworksByCustomNamespace>);

      const { result } = renderHook(() => useMusdConversionFlowData());
      const paymentToken = result.current.getPreferredPaymentToken();

      expect(paymentToken).toEqual({
        address: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
        chainId: CHAIN_IDS.LINEA_MAINNET,
      });
    });

    it('falls back to first token when selected chain has no tokens', () => {
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [mockUsdcMainnet],
        getMusdOutputChainId: mockGetMusdOutputChainId,
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
      });
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [{ chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true }],
      } as ReturnType<typeof useCurrentNetworkInfo>);
      mockUseNetworksByCustomNamespace.mockReturnValue({
        areAllNetworksSelected: false,
        filteredNetworks: [],
      } as ReturnType<typeof useNetworksByCustomNamespace>);

      const { result } = renderHook(() => useMusdConversionFlowData());
      const paymentToken = result.current.getPreferredPaymentToken();

      expect(paymentToken).toEqual({
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1',
      });
    });

    it('returns null when no tokens available', () => {
      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [],
        getMusdOutputChainId: mockGetMusdOutputChainId,
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
      });

      const { result } = renderHook(() => useMusdConversionFlowData());
      const paymentToken = result.current.getPreferredPaymentToken();

      expect(paymentToken).toBe(null);
    });

    it('returns null when token has no chainId', () => {
      const tokenWithoutChainId = {
        ...mockUsdcMainnet,
        chainId: undefined,
      } as unknown as AssetType;

      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [tokenWithoutChainId],
        getMusdOutputChainId: mockGetMusdOutputChainId,
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
      });

      const { result } = renderHook(() => useMusdConversionFlowData());
      const paymentToken = result.current.getPreferredPaymentToken();

      expect(paymentToken).toBe(null);
    });

    it('returns null when token has no address', () => {
      const tokenWithoutAddress = {
        ...mockUsdcMainnet,
        address: undefined,
      } as unknown as AssetType;

      mockUseMusdConversionTokens.mockReturnValue({
        tokens: [tokenWithoutAddress],
        getMusdOutputChainId: mockGetMusdOutputChainId,
        filterAllowedTokens: jest.fn(),
        isConversionToken: jest.fn(),
        isMusdSupportedOnChain: jest.fn(),
      });

      const { result } = renderHook(() => useMusdConversionFlowData());
      const paymentToken = result.current.getPreferredPaymentToken();

      expect(paymentToken).toBe(null);
    });
  });

  describe('getChainIdForBuyFlow', () => {
    it('returns selected chain ID when single chain selected', () => {
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [{ chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true }],
      } as ReturnType<typeof useCurrentNetworkInfo>);
      mockUseNetworksByCustomNamespace.mockReturnValue({
        areAllNetworksSelected: false,
        filteredNetworks: [],
      } as ReturnType<typeof useNetworksByCustomNamespace>);

      const { result } = renderHook(() => useMusdConversionFlowData());
      const chainId = result.current.getChainIdForBuyFlow();

      expect(chainId).toBe(CHAIN_IDS.LINEA_MAINNET);
    });

    it('returns default chain ID when all networks selected', () => {
      mockUseNetworksByCustomNamespace.mockReturnValue({
        areAllNetworksSelected: true,
        filteredNetworks: [],
      } as ReturnType<typeof useNetworksByCustomNamespace>);

      const { result } = renderHook(() => useMusdConversionFlowData());
      const chainId = result.current.getChainIdForBuyFlow();

      expect(chainId).toBe(MUSD_CONVERSION_DEFAULT_CHAIN_ID);
    });

    it('returns default chain ID when multiple chains selected', () => {
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [
          { chainId: CHAIN_IDS.MAINNET, enabled: true },
          { chainId: CHAIN_IDS.LINEA_MAINNET, enabled: true },
        ],
      } as ReturnType<typeof useCurrentNetworkInfo>);
      mockUseNetworksByCustomNamespace.mockReturnValue({
        areAllNetworksSelected: false,
        filteredNetworks: [],
      } as ReturnType<typeof useNetworksByCustomNamespace>);

      const { result } = renderHook(() => useMusdConversionFlowData());
      const chainId = result.current.getChainIdForBuyFlow();

      expect(chainId).toBe(MUSD_CONVERSION_DEFAULT_CHAIN_ID);
    });
  });

  describe('getMusdOutputChainId', () => {
    it('delegates to useMusdConversionTokens helper', () => {
      const { result } = renderHook(() => useMusdConversionFlowData());
      result.current.getMusdOutputChainId(CHAIN_IDS.MAINNET);

      expect(mockGetMusdOutputChainId).toHaveBeenCalledWith(CHAIN_IDS.MAINNET);
    });
  });

  describe('integration with dependencies', () => {
    it('calls useNetworksByCustomNamespace with correct parameters', () => {
      renderHook(() => useMusdConversionFlowData());

      expect(mockUseNetworksByCustomNamespace).toHaveBeenCalledWith({
        networkType: 'popular',
        namespace: KnownCaipNamespace.Eip155,
      });
    });

    it('uses correct selector for empty wallet state', () => {
      renderHook(() => useMusdConversionFlowData());

      expect(mockUseSelector).toHaveBeenCalled();
    });

    it('composes existing hooks correctly', () => {
      renderHook(() => useMusdConversionFlowData());

      expect(mockUseMusdConversionTokens).toHaveBeenCalled();
      expect(mockUseMusdConversionEligibility).toHaveBeenCalled();
      expect(mockUseCurrentNetworkInfo).toHaveBeenCalled();
      expect(mockUseNetworksByCustomNamespace).toHaveBeenCalled();
    });
  });
});
