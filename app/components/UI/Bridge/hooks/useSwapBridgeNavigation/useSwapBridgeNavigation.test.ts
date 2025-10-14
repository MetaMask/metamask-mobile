import { initialState } from '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { SwapBridgeNavigationLocation, useSwapBridgeNavigation } from '.';
import { waitFor } from '@testing-library/react-native';
import { BridgeToken, BridgeViewMode } from '../../types';
import { Hex } from '@metamask/utils';
import { EthScope, SolScope } from '@metamask/keyring-api';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { selectChainId } from '../../../../../selectors/networkController';
import {
  selectIsBridgeEnabledSource,
  selectIsUnifiedSwapsEnabled,
} from '../../../../../core/redux/slices/bridge';
import { ethers } from 'ethers';

// Mock dependencies
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/bridge'),
  selectIsBridgeEnabledSource: jest.fn(() => true),
  selectIsUnifiedSwapsEnabled: jest.fn(() => false),
}));

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

describe('useSwapBridgeNavigation', () => {
  const mockChainId = '0x1' as Hex;
  const mockLocation = SwapBridgeNavigationLocation.TabBar;
  const mockSourcePage = 'test-source-page';
  const mockNativeAsset = {
    address: '0x0000000000000000000000000000000000000000',
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
    chainId: mockChainId,
    image: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();

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

    result.current.goToBridge();

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
        bridgeViewMode: BridgeViewMode.Bridge,
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

    result.current.goToBridge();

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: mockToken,
        sourcePage: mockSourcePage,
        bridgeViewMode: BridgeViewMode.Bridge,
      },
    });
  });

  it('navigates to Bridge when goToBridge is called and bridge UI is enabled', () => {
    const { result } = renderHookWithProvider(
      () =>
        useSwapBridgeNavigation({
          location: mockLocation,
          sourcePage: mockSourcePage,
        }),
      { state: initialState },
    );

    result.current.goToBridge();

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        sourceToken: mockNativeAsset,
        sourcePage: mockSourcePage,
        bridgeViewMode: BridgeViewMode.Bridge,
      },
    });
  });

  it('calls goToPortfolioBridge when goToBridge is called and isBridgeEnabledSource is false', () => {
    (selectIsBridgeEnabledSource as unknown as jest.Mock).mockReturnValueOnce(
      false,
    );

    const { result } = renderHookWithProvider(
      () =>
        useSwapBridgeNavigation({
          location: mockLocation,
          sourcePage: mockSourcePage,
        }),
      { state: initialState },
    );

    result.current.goToBridge();

    expect(mockGoToPortfolioBridge).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to Swaps when goToSwaps is called and token chainId matches selected chainId', async () => {
    const { result } = renderHookWithProvider(
      () =>
        useSwapBridgeNavigation({
          location: mockLocation,
          sourcePage: mockSourcePage,
        }),
      { state: initialState },
    );

    result.current.goToSwaps();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });

      expect(mockNavigate).toHaveBeenCalledWith('Swaps', {
        screen: 'SwapsAmountView',
        params: {
          sourceToken: mockNativeAsset.address,
          chainId: mockChainId,
          sourcePage: mockSourcePage,
        },
      });
    });

    expect(
      Engine.context.MultichainNetworkController.setActiveNetwork,
    ).not.toHaveBeenCalled();
  });

  it('switches network and navigates to Swaps when goToSwaps is called and token chainId differs from selected chainId', async () => {
    const differentChainId = '0xa' as Hex;
    const mockToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000001',
      symbol: 'TOKEN',
      name: 'Test Token',
      decimals: 18,
      chainId: differentChainId,
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

    await waitFor(() => {
      expect(
        Engine.context.NetworkController.getNetworkConfigurationByChainId,
      ).toHaveBeenCalledWith(differentChainId);
      expect(
        Engine.context.MultichainNetworkController.setActiveNetwork,
      ).toHaveBeenCalledWith('optimismNetworkClientId');

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });

      expect(mockNavigate).toHaveBeenCalledWith('Swaps', {
        screen: 'SwapsAmountView',
        params: {
          sourceToken: mockToken.address,
          chainId: mockToken.chainId,
          sourcePage: mockSourcePage,
        },
      });
    });
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

    result.current.goToBridge();

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
        bridgeViewMode: BridgeViewMode.Bridge,
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

    result.current.goToBridge();

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
        bridgeViewMode: BridgeViewMode.Bridge,
      },
    });
  });

  describe('Unified', () => {
    it('navigates to Bridge when goToSwaps is called and unified swaps is enabled', () => {
      (selectIsUnifiedSwapsEnabled as unknown as jest.Mock).mockReturnValueOnce(
        true,
      );

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

  describe('Solana', () => {
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

      result.current.goToBridge();

      expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
        screen: 'BridgeView',
        params: {
          sourceToken: {
            address: ethers.constants.AddressZero,
            name: 'Solana',
            symbol: 'SOL',
            image: '',
            decimals: 9,
            chainId: SolScope.Mainnet, // Should keep CAIP format for Solana
          },
          sourcePage: mockSourcePage,
          bridgeViewMode: BridgeViewMode.Bridge,
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
            address: ethers.constants.AddressZero,
            name: 'Solana',
            symbol: 'SOL',
            image: '',
            decimals: 9,
            chainId: SolScope.Mainnet,
          },
          sourcePage: mockSourcePage,
          bridgeViewMode: BridgeViewMode.Swap,
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
            address: ethers.constants.AddressZero,
            name: 'Solana',
            symbol: 'SOL',
            image: '',
            decimals: 9,
            chainId: SolScope.Mainnet,
          },
          sourcePage: mockSourcePage,
          bridgeViewMode: BridgeViewMode.Swap,
        },
      });
    });
  });
});
