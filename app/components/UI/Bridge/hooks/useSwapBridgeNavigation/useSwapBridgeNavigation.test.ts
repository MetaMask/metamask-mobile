import { initialState } from '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { SwapBridgeNavigationLocation, useSwapBridgeNavigation } from '.';
import { BridgeToken, BridgeViewMode } from '../../types';
import { Hex } from '@metamask/utils';
import { EthScope, SolScope, BtcScope } from '@metamask/keyring-api';
import { selectChainId } from '../../../../../selectors/networkController';
import { ethers } from 'ethers';
import {
  ActionButtonType,
  ActionLocation,
  ActionPosition,
} from '../../../../../util/analytics/actionButtonTracking';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

// Mock dependencies
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
}));

// Mock useMetrics hook
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));

jest.mock('../../../../hooks/useMetrics', () => {
  const actualMetrics = jest.requireActual('../../../../hooks/useMetrics');
  return {
    ...actualMetrics,
    useMetrics: jest.fn(() => ({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    })),
  };
});

const mockGetIsBridgeEnabledSource = jest.fn(() => true);
const mockSetIsDestTokenManuallySet = jest.fn();
const mockSetDestToken = jest.fn();
jest.mock('../../../../../core/redux/slices/bridge', () => {
  const actual = jest.requireActual('../../../../../core/redux/slices/bridge');
  return {
    ...actual,
    selectIsBridgeEnabledSourceFactory: jest.fn(
      () => mockGetIsBridgeEnabledSource,
    ),
    setIsDestTokenManuallySet: (...args: unknown[]) => {
      mockSetIsDestTokenManuallySet(...args);
      return actual.setIsDestTokenManuallySet(...args);
    },
    setDestToken: (...args: unknown[]) => {
      mockSetDestToken(...args);
      return actual.setDestToken(...args);
    },
  };
});

const mockGoToPortfolioBridge = jest.fn();
jest.mock('../useGoToPortfolioBridge', () => ({
  __esModule: true,
  default: jest.fn(() => mockGoToPortfolioBridge),
}));

jest.mock('../../../../../selectors/networkController', () => {
  const actual = jest.requireActual(
    '../../../../../selectors/networkController',
  );
  return {
    ...actual,
    selectChainId: jest.fn(actual.selectChainId),
  };
});

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NetworkController: {
        getNetworkConfigurationByChainId: jest.fn().mockReturnValue({
          rpcEndpoints: [
            {
              networkClientId: 'optimismNetworkClientId',
            },
          ],
          defaultRpcEndpointIndex: 0,
        }),
      },
      MultichainNetworkController: {
        setActiveNetwork: jest.fn(),
      },
    },
  },
}));

// Mock useCurrentNetworkInfo hook
const mockUseCurrentNetworkInfo = jest.fn();
jest.mock('../../../../hooks/useCurrentNetworkInfo', () => ({
  useCurrentNetworkInfo: () => mockUseCurrentNetworkInfo(),
}));

// Mock bridge controller functions
import {
  getNativeAssetForChainId,
  isSolanaChainId,
} from '@metamask/bridge-controller';

jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  getNativeAssetForChainId: jest.fn(),
  isSolanaChainId: jest.fn(),
}));

// Mock token utilities
import {
  getDefaultDestToken,
  getNativeSourceToken,
} from '../../utils/tokenUtils';

jest.mock('../../utils/tokenUtils', () => ({
  getDefaultDestToken: jest.fn(),
  getNativeSourceToken: jest.fn(),
}));

describe('useSwapBridgeNavigation', () => {
  const mockChainId = '0x1' as Hex;
  const mockLocation = SwapBridgeNavigationLocation.MainView;
  const mockSourcePage = 'test-source-page';
  const mockNativeAsset = {
    address: '0x0000000000000000000000000000000000000000',
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    chainId: mockChainId,
    image: '',
  };

  const mockSourceToken: BridgeToken = {
    address: '0x0000000000000000000000000000000000000001',
    symbol: 'SRC',
    name: 'Source Token',
    decimals: 18,
    chainId: mockChainId,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup event builder chain
    mockBuild.mockReturnValue({ category: 'test' });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });

    // Setup default mocks for Ethereum
    mockUseCurrentNetworkInfo.mockReturnValue({
      enabledNetworks: [{ chainId: '1', enabled: true }],
      getNetworkInfo: jest.fn().mockReturnValue({
        caipChainId: EthScope.Mainnet,
        networkName: 'Ethereum Mainnet',
      }),
      isDisabled: false,
      hasEnabledNetworks: true,
    });

    (isSolanaChainId as jest.Mock).mockReturnValue(false);
    (getNativeAssetForChainId as jest.Mock).mockReturnValue({
      address: '0x0000000000000000000000000000000000000000',
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    });

    // Reset selectChainId mock to default
    (selectChainId as unknown as jest.Mock).mockReturnValue(mockChainId);

    // Reset bridge enabled mock to default (enabled)
    mockGetIsBridgeEnabledSource.mockReturnValue(true);

    // Reset setIsDestTokenManuallySet mock
    mockSetIsDestTokenManuallySet.mockClear();
    mockSetDestToken.mockClear();

    // Setup default mocks for token utilities
    (getDefaultDestToken as jest.Mock).mockReturnValue({
      address: '0x6B175474E89094C44Da98b954EesdfDcD0E0e6F',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
      chainId: mockChainId,
    });
    (getNativeSourceToken as jest.Mock).mockReturnValue({
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ether',
      decimals: 18,
      chainId: mockChainId,
      image: '',
    });
  });

  it('uses native token when no token is provided', () => {
    const { result } = renderHookWithProvider(
      () =>
        useSwapBridgeNavigation({
          location: mockLocation,
          sourcePage: mockSourcePage,
        }),
      { state: initialState },
    );

    result.current.goToSwaps();

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: {
          address: mockNativeAsset.address,
          name: 'Ether',
          symbol: mockNativeAsset.symbol,
          image: '',
          decimals: mockNativeAsset.decimals,
          chainId: mockChainId,
        },
        sourcePage: mockSourcePage,
        bridgeViewMode: BridgeViewMode.Unified,
      },
    });
  });

  it('uses provided token when available', () => {
    const mockToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000001',
      symbol: 'TOKEN',
      name: 'Test Token',
      decimals: 18,
      chainId: mockChainId,
    };

    const { result } = renderHookWithProvider(
      () =>
        useSwapBridgeNavigation({
          location: mockLocation,
          sourcePage: mockSourcePage,
          sourceToken: mockToken,
        }),
      { state: initialState },
    );

    result.current.goToSwaps();

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: mockToken,
        sourcePage: mockSourcePage,
        bridgeViewMode: BridgeViewMode.Unified,
      },
    });
  });

  it('uses tokenOverride when passed to goToSwaps', () => {
    const configuredToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000001',
      symbol: 'TOKEN',
      name: 'Test Token',
      decimals: 18,
      chainId: mockChainId,
    };

    const overrideToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000002',
      symbol: 'OVERRIDE',
      name: 'Override Token',
      decimals: 18,
      chainId: '0x89' as Hex,
    };

    const { result } = renderHookWithProvider(
      () =>
        useSwapBridgeNavigation({
          location: mockLocation,
          sourcePage: mockSourcePage,
          sourceToken: configuredToken,
        }),
      { state: initialState },
    );

    result.current.goToSwaps(overrideToken);

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: overrideToken,
        sourcePage: mockSourcePage,
        bridgeViewMode: BridgeViewMode.Unified,
      },
    });
  });

  it('falls back to ETH on mainnet when bridge is not enabled for source chain', () => {
    mockGetIsBridgeEnabledSource.mockReturnValue(false);

    // Mock that getNativeAssetForChainId returns ETH for mainnet fallback
    (getNativeAssetForChainId as jest.Mock).mockReturnValue({
      address: '0x0000000000000000000000000000000000000000',
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    });

    const unsupportedToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000001',
      symbol: 'UNSUPPORTED',
      name: 'Unsupported Token',
      decimals: 18,
      chainId: '0x999' as Hex,
    };

    const { result } = renderHookWithProvider(
      () =>
        useSwapBridgeNavigation({
          location: mockLocation,
          sourcePage: mockSourcePage,
          sourceToken: unsupportedToken,
        }),
      { state: initialState },
    );

    result.current.goToSwaps();

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: {
          address: '0x0000000000000000000000000000000000000000',
          name: 'Ether',
          symbol: 'ETH',
          image: '',
          decimals: 18,
          chainId: '0x1',
        },
        sourcePage: mockSourcePage,
        bridgeViewMode: BridgeViewMode.Unified,
      },
    });
  });

  it('navigates to Bridge when goToSwaps is called and bridge UI is enabled', () => {
    const { result } = renderHookWithProvider(
      () =>
        useSwapBridgeNavigation({
          location: mockLocation,
          sourcePage: mockSourcePage,
        }),
      { state: initialState },
    );

    result.current.goToSwaps();

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: mockNativeAsset,
        sourcePage: mockSourcePage,
        bridgeViewMode: BridgeViewMode.Unified,
      },
    });
  });

  it('resets isDestTokenManuallySet flag when navigating to swaps', () => {
    const { result } = renderHookWithProvider(
      () =>
        useSwapBridgeNavigation({
          location: mockLocation,
          sourcePage: mockSourcePage,
        }),
      { state: initialState },
    );

    result.current.goToSwaps();

    expect(mockSetIsDestTokenManuallySet).toHaveBeenCalledWith(false);
  });

  it('uses home page filter network when no token is provided', () => {
    // Mock home page filter network as Polygon
    mockUseCurrentNetworkInfo.mockReturnValue({
      enabledNetworks: [{ chainId: '137', enabled: true }],
      getNetworkInfo: jest.fn().mockReturnValue({
        caipChainId: 'eip155:137',
        networkName: 'Polygon Mainnet',
      }),
      isDisabled: false,
      hasEnabledNetworks: true,
    });

    (getNativeAssetForChainId as jest.Mock).mockReturnValue({
      address: '0x0000000000000000000000000000000000000000',
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18,
    });

    const { result } = renderHookWithProvider(
      () =>
        useSwapBridgeNavigation({
          location: mockLocation,
          sourcePage: mockSourcePage,
        }),
      { state: initialState },
    );

    result.current.goToSwaps();

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: {
          address: '0x0000000000000000000000000000000000000000',
          name: 'Polygon',
          symbol: 'MATIC',
          image: '',
          decimals: 18,
          chainId: '0x89', // Should be converted to hex format
        },
        sourcePage: mockSourcePage,
        bridgeViewMode: BridgeViewMode.Unified,
      },
    });
  });

  it('falls back to Ethereum mainnet when multiple networks enabled', () => {
    // Mock multiple networks enabled
    mockUseCurrentNetworkInfo.mockReturnValue({
      enabledNetworks: [
        { chainId: '1', enabled: true },
        { chainId: '137', enabled: true },
      ],
      getNetworkInfo: jest.fn().mockReturnValue({
        caipChainId: 'eip155:1',
        networkName: 'Ethereum Mainnet',
      }),
      isDisabled: false,
      hasEnabledNetworks: true,
    });

    const { result } = renderHookWithProvider(
      () =>
        useSwapBridgeNavigation({
          location: mockLocation,
          sourcePage: mockSourcePage,
        }),
      { state: initialState },
    );

    result.current.goToSwaps();

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: {
          address: '0x0000000000000000000000000000000000000000',
          name: 'Ether',
          symbol: 'ETH',
          image: '',
          decimals: 18,
          chainId: '0x1', // Should use mainnet fallback
        },
        sourcePage: mockSourcePage,
        bridgeViewMode: BridgeViewMode.Unified,
      },
    });
  });

  describe('Unified', () => {
    it('navigates to Bridge when goToSwaps is called and unified swaps is enabled', () => {
      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: mockLocation,
            sourcePage: mockSourcePage,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
        screen: 'BridgeView',
        params: {
          sourceToken: mockNativeAsset,
          sourcePage: mockSourcePage,
          bridgeViewMode: BridgeViewMode.Unified,
        },
      });
    });
  });

  describe('destToken handling', () => {
    it('dispatches provided destToken when different from sourceToken', () => {
      const destToken: BridgeToken = {
        address: '0x0000000000000000000000000000000000000002',
        symbol: 'DEST',
        name: 'Destination Token',
        decimals: 18,
        chainId: mockChainId,
      };

      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: mockLocation,
            sourcePage: mockSourcePage,
            sourceToken: mockSourceToken,
            destToken,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockSetDestToken).toHaveBeenCalledWith(destToken);
    });

    it('uses destTokenOverride when passed to goToSwaps', () => {
      const configuredDestToken: BridgeToken = {
        address: '0x0000000000000000000000000000000000000002',
        symbol: 'CONFIGURED',
        name: 'Configured Dest Token',
        decimals: 18,
        chainId: mockChainId,
      };

      const overrideDestToken: BridgeToken = {
        address: '0x0000000000000000000000000000000000000003',
        symbol: 'OVERRIDE',
        name: 'Override Dest Token',
        decimals: 18,
        chainId: mockChainId,
      };

      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: mockLocation,
            sourcePage: mockSourcePage,
            sourceToken: mockSourceToken,
            destToken: configuredDestToken,
          }),
        { state: initialState },
      );

      result.current.goToSwaps(undefined, overrideDestToken);

      expect(mockSetDestToken).toHaveBeenCalledWith(overrideDestToken);
    });

    it('falls back to default when destToken same as sourceToken', () => {
      const sameAsSourceToken: BridgeToken = {
        ...mockSourceToken,
      };

      const defaultToken = {
        address: '0x6B175474E89094C44Da98b954EesdfDcD0E0e6F',
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        decimals: 18,
        chainId: mockChainId,
      };

      (getDefaultDestToken as jest.Mock).mockReturnValue(defaultToken);

      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: mockLocation,
            sourcePage: mockSourcePage,
            sourceToken: mockSourceToken,
            destToken: sameAsSourceToken,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockSetDestToken).toHaveBeenCalledWith(defaultToken);
    });

    it('uses both sourceTokenOverride and destTokenOverride when passed to goToSwaps', () => {
      const sourceOverride: BridgeToken = {
        address: '0x0000000000000000000000000000000000000004',
        symbol: 'SRC_OVERRIDE',
        name: 'Source Override Token',
        decimals: 18,
        chainId: mockChainId,
      };

      const destOverride: BridgeToken = {
        address: '0x0000000000000000000000000000000000000005',
        symbol: 'DEST_OVERRIDE',
        name: 'Dest Override Token',
        decimals: 18,
        chainId: mockChainId,
      };

      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: mockLocation,
            sourcePage: mockSourcePage,
            sourceToken: mockSourceToken,
          }),
        { state: initialState },
      );

      result.current.goToSwaps(sourceOverride, destOverride);

      expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
        screen: 'BridgeView',
        params: {
          sourceToken: sourceOverride,
          sourcePage: mockSourcePage,
          bridgeViewMode: BridgeViewMode.Unified,
        },
      });
      expect(mockSetDestToken).toHaveBeenCalledWith(destOverride);
    });

    it('falls back to native token when default dest same as source', () => {
      const nativeToken = {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        chainId: mockChainId,
        image: '',
      };

      // Make default token same as source token
      (getDefaultDestToken as jest.Mock).mockReturnValue({
        ...mockSourceToken,
      });
      (getNativeSourceToken as jest.Mock).mockReturnValue(nativeToken);

      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: mockLocation,
            sourcePage: mockSourcePage,
            sourceToken: mockSourceToken,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockSetDestToken).toHaveBeenCalledWith(nativeToken);
    });

    it('falls back to native token when getDefaultDestToken returns null', () => {
      const nativeToken = {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        chainId: mockChainId,
        image: '',
      };

      (getDefaultDestToken as jest.Mock).mockReturnValue(null);
      (getNativeSourceToken as jest.Mock).mockReturnValue(nativeToken);

      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: mockLocation,
            sourcePage: mockSourcePage,
            sourceToken: mockSourceToken,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockSetDestToken).toHaveBeenCalledWith(nativeToken);
    });

    it('does not dispatch destToken when native token same as source', () => {
      // Source token is the native token
      const nativeSourceToken: BridgeToken = {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        chainId: mockChainId,
      };

      // Default and native both match source
      (getDefaultDestToken as jest.Mock).mockReturnValue(nativeSourceToken);
      (getNativeSourceToken as jest.Mock).mockReturnValue(nativeSourceToken);

      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: mockLocation,
            sourcePage: mockSourcePage,
            sourceToken: nativeSourceToken,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      // setDestToken should not be called since all options match source
      expect(mockSetDestToken).not.toHaveBeenCalled();
    });
  });

  describe('Non-EVM chains', () => {
    it('uses assetId for Solana native token address', () => {
      const solanaAssetId =
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501';

      // Mock home page filter network as Solana
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [{ chainId: SolScope.Mainnet, enabled: true }],
        getNetworkInfo: jest.fn().mockReturnValue({
          caipChainId: SolScope.Mainnet,
          networkName: 'Solana Mainnet',
        }),
        isDisabled: false,
        hasEnabledNetworks: true,
      });

      (isSolanaChainId as jest.Mock).mockReturnValue(true);
      (getNativeAssetForChainId as jest.Mock).mockReturnValue({
        address: ethers.constants.AddressZero,
        assetId: solanaAssetId,
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
      });

      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: mockLocation,
            sourcePage: mockSourcePage,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
        screen: 'BridgeView',
        params: {
          sourceToken: {
            address: solanaAssetId, // Should use assetId for balance lookup
            name: 'Solana',
            symbol: 'SOL',
            image: '',
            decimals: 9,
            chainId: SolScope.Mainnet,
          },
          sourcePage: mockSourcePage,
          bridgeViewMode: BridgeViewMode.Unified,
        },
      });
    });

    it('keeps Solana chain ID in CAIP format for Bridge', () => {
      // Mock home page filter network as Solana
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [{ chainId: SolScope.Mainnet, enabled: true }],
        getNetworkInfo: jest.fn().mockReturnValue({
          caipChainId: SolScope.Mainnet,
          networkName: 'Solana Mainnet',
        }),
        isDisabled: false,
        hasEnabledNetworks: true,
      });

      (isSolanaChainId as jest.Mock).mockReturnValue(true);
      (getNativeAssetForChainId as jest.Mock).mockReturnValue({
        address: ethers.constants.AddressZero,
        assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
      });

      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: mockLocation,
            sourcePage: mockSourcePage,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
        screen: 'BridgeView',
        params: {
          sourceToken: {
            address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
            name: 'Solana',
            symbol: 'SOL',
            image: '',
            decimals: 9,
            chainId: SolScope.Mainnet, // Should keep CAIP format for Solana
          },
          sourcePage: mockSourcePage,
          bridgeViewMode: BridgeViewMode.Unified,
        },
      });
    });

    it('uses assetId for Bitcoin native token address', () => {
      const bitcoinAssetId = 'bip122:000000000019d6689c085ae165831e93/slip44:0';

      // Mock home page filter network as Bitcoin
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [{ chainId: BtcScope.Mainnet, enabled: true }],
        getNetworkInfo: jest.fn().mockReturnValue({
          caipChainId: BtcScope.Mainnet,
          networkName: 'Bitcoin Mainnet',
        }),
        isDisabled: false,
        hasEnabledNetworks: true,
      });

      (isSolanaChainId as jest.Mock).mockReturnValue(false);
      (getNativeAssetForChainId as jest.Mock).mockReturnValue({
        address: ethers.constants.AddressZero,
        assetId: bitcoinAssetId,
        name: 'Bitcoin',
        symbol: 'BTC',
        decimals: 8,
      });

      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: mockLocation,
            sourcePage: mockSourcePage,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
        screen: 'BridgeView',
        params: {
          sourceToken: {
            address: bitcoinAssetId, // Should use assetId for balance lookup
            name: 'Bitcoin',
            symbol: 'BTC',
            image: '',
            decimals: 8,
            chainId: BtcScope.Mainnet,
          },
          sourcePage: mockSourcePage,
          bridgeViewMode: BridgeViewMode.Unified,
        },
      });
    });

    it('navigates to Bridge when goToSwaps is called and token chainId is Solana', () => {
      (selectChainId as unknown as jest.Mock).mockReturnValueOnce(
        SolScope.Mainnet,
      );

      // Mock home page filter network as Solana
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [{ chainId: SolScope.Mainnet, enabled: true }],
        getNetworkInfo: jest.fn().mockReturnValue({
          caipChainId: SolScope.Mainnet,
          networkName: 'Solana Mainnet',
        }),
        isDisabled: false,
        hasEnabledNetworks: true,
      });

      (isSolanaChainId as jest.Mock).mockReturnValue(true);
      (getNativeAssetForChainId as jest.Mock).mockReturnValue({
        address: ethers.constants.AddressZero,
        assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
      });

      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: mockLocation,
            sourcePage: mockSourcePage,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
        screen: 'BridgeView',
        params: {
          sourceToken: {
            address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
            name: 'Solana',
            symbol: 'SOL',
            image: '',
            decimals: 9,
            chainId: SolScope.Mainnet,
          },
          sourcePage: mockSourcePage,
          bridgeViewMode: BridgeViewMode.Unified,
        },
      });
    });

    it('uses EVM address for EVM chains', () => {
      const evmAddress = '0x0000000000000000000000000000000000000000';

      // Mock home page filter network as Ethereum
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [{ chainId: '1', enabled: true }],
        getNetworkInfo: jest.fn().mockReturnValue({
          caipChainId: EthScope.Mainnet,
          networkName: 'Ethereum Mainnet',
        }),
        isDisabled: false,
        hasEnabledNetworks: true,
      });

      (isSolanaChainId as jest.Mock).mockReturnValue(false);
      (getNativeAssetForChainId as jest.Mock).mockReturnValue({
        address: evmAddress,
        assetId: 'eip155:1/slip44:60',
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      });

      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: mockLocation,
            sourcePage: mockSourcePage,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
        screen: 'BridgeView',
        params: {
          sourceToken: {
            address: evmAddress, // Should use address for EVM chains
            name: 'Ether',
            symbol: 'ETH',
            image: '',
            decimals: 18,
            chainId: mockChainId,
          },
          sourcePage: mockSourcePage,
          bridgeViewMode: BridgeViewMode.Unified,
        },
      });
    });

    it('navigates to Bridge when goToSwaps is called and selected chainId is Solana', () => {
      (selectChainId as unknown as jest.Mock).mockReturnValueOnce(
        SolScope.Mainnet,
      );

      // Mock home page filter network as Solana
      mockUseCurrentNetworkInfo.mockReturnValue({
        enabledNetworks: [{ chainId: SolScope.Mainnet, enabled: true }],
        getNetworkInfo: jest.fn().mockReturnValue({
          caipChainId: SolScope.Mainnet,
          networkName: 'Solana Mainnet',
        }),
        isDisabled: false,
        hasEnabledNetworks: true,
      });

      (isSolanaChainId as jest.Mock).mockReturnValue(true);
      (getNativeAssetForChainId as jest.Mock).mockReturnValue({
        address: ethers.constants.AddressZero,
        assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        name: 'Solana',
        symbol: 'SOL',
        decimals: 9,
      });

      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: mockLocation,
            sourcePage: mockSourcePage,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
        screen: 'BridgeView',
        params: {
          sourceToken: {
            address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
            name: 'Solana',
            symbol: 'SOL',
            image: '',
            decimals: 9,
            chainId: SolScope.Mainnet,
          },
          sourcePage: mockSourcePage,
          bridgeViewMode: BridgeViewMode.Unified,
        },
      });
    });

    it('dispatches destToken with CAIP chain ID format', () => {
      const solanaDestToken: BridgeToken = {
        symbol: 'SOL',
        name: 'Solana',
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        decimals: 9,
        image:
          'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44/501.png',
        chainId: SolScope.Mainnet,
      };

      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: mockLocation,
            sourcePage: mockSourcePage,
            sourceToken: mockSourceToken,
            destToken: solanaDestToken,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockSetDestToken).toHaveBeenCalledWith(solanaDestToken);
    });
  });

  describe('Analytics Tracking', () => {
    it('tracks action button click with correct properties when location is TabBar', () => {
      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: SwapBridgeNavigationLocation.MainView,
            sourcePage: mockSourcePage,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.ACTION_BUTTON_CLICKED,
      );

      // When location is TabBar, action_position is omitted and location is navbar
      expect(mockAddProperties).toHaveBeenCalledWith({
        action_name: ActionButtonType.SWAP,
        button_label: 'Swap',
        location: ActionLocation.NAVBAR,
      });
      expect(mockBuild).toHaveBeenCalled();

      expect(mockTrackEvent).toHaveBeenCalledWith({ category: 'test' });
    });

    it('tracks action button click with correct properties when location is TokenDetails', () => {
      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: SwapBridgeNavigationLocation.TokenView,
            sourcePage: mockSourcePage,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockAddProperties).toHaveBeenCalledWith({
        action_name: ActionButtonType.SWAP,
        action_position: ActionPosition.SECOND_POSITION,
        button_label: 'Swap',
        location: ActionLocation.ASSET_DETAILS,
      });
    });

    it('tracks action button click when location is Swaps', () => {
      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: SwapBridgeNavigationLocation.Swaps,
            sourcePage: mockSourcePage,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockAddProperties).toHaveBeenCalledWith({
        action_name: ActionButtonType.SWAP,
        action_position: ActionPosition.SECOND_POSITION,
        button_label: 'Swap',
        location: ActionLocation.ASSET_DETAILS,
      });
    });

    it('tracks action button click when location is Rewards', () => {
      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: SwapBridgeNavigationLocation.Rewards,
            sourcePage: mockSourcePage,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockAddProperties).toHaveBeenCalledWith({
        action_name: ActionButtonType.SWAP,
        action_position: ActionPosition.SECOND_POSITION,
        button_label: 'Swap',
        location: ActionLocation.ASSET_DETAILS,
      });
    });

    it('tracks action button click event is fired exactly once per navigation', () => {
      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: SwapBridgeNavigationLocation.MainView,
            sourcePage: mockSourcePage,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      // The hook tracks two events: ACTION_BUTTON_CLICKED and SWAP_BUTTON_CLICKED
      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(2);
      expect(mockAddProperties).toHaveBeenCalledTimes(2);
      expect(mockBuild).toHaveBeenCalledTimes(2);
      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    });

    it('tracks action button click with provided source token', () => {
      const mockToken: BridgeToken = {
        address: '0x0000000000000000000000000000000000000001',
        symbol: 'TOKEN',
        name: 'Test Token',
        decimals: 18,
        chainId: mockChainId,
      };

      const { result } = renderHookWithProvider(
        () =>
          useSwapBridgeNavigation({
            location: SwapBridgeNavigationLocation.TokenView,
            sourcePage: mockSourcePage,
            sourceToken: mockToken,
          }),
        { state: initialState },
      );

      result.current.goToSwaps();

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockAddProperties).toHaveBeenCalledWith({
        action_name: ActionButtonType.SWAP,
        action_position: ActionPosition.SECOND_POSITION,
        button_label: 'Swap',
        location: ActionLocation.ASSET_DETAILS,
      });
    });
  });
});
