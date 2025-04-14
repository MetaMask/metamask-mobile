import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useSwapBridgeNavigation } from '.';
import { waitFor } from '@testing-library/react-native';
import { initialState } from '../../_mocks_/initialState';
import { BridgeToken, BridgeViewMode } from '../../types';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { getNativeAssetForChainId } from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import { isBridgeUiEnabled } from '../../utils';
import useGoToPortfolioBridge from '../useGoToPortfolioBridge';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  isBridgeUiEnabled: jest.fn(),
}));

jest.mock('../useGoToPortfolioBridge', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      NetworkController: {
        getNetworkConfigurationByChainId: jest.fn(),
      },
      MultichainNetworkController: {
        setActiveNetwork: jest.fn(),
      },
    },
  },
}));

describe('useSwapBridgeNavigation', () => {
  const mockChainId = '0x1' as Hex;
  const mockLocation = 'test-location';
  const mockSourcePage = 'test-source-page';
  const mockNavigation = {
    navigate: jest.fn(),
  };
  const mockGoToPortfolioBridge = jest.fn();
  const mockNativeAsset = {
    address: '0x0000000000000000000000000000000000000000',
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock navigation
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);

    // Mock chainId selector
    (useSelector as jest.Mock).mockReturnValue(mockChainId);

    // Mock native asset
    (getNativeAssetForChainId as jest.Mock).mockReturnValue(mockNativeAsset);

    // Mock bridge UI enabled
    (isBridgeUiEnabled as jest.Mock).mockReturnValue(true);

    // Mock go to portfolio bridge
    (useGoToPortfolioBridge as jest.Mock).mockReturnValue(mockGoToPortfolioBridge);

    // Mock network controller
    (Engine.context.NetworkController.getNetworkConfigurationByChainId as jest.Mock).mockReturnValue({
      rpcEndpoints: [
        { networkClientId: 'test-network-client-id' },
      ],
      defaultRpcEndpointIndex: 0,
    });

    // Mock multichain network controller
    (Engine.context.MultichainNetworkController.setActiveNetwork as jest.Mock).mockResolvedValue(undefined);
  });

  it('should use native token when no token is provided', () => {
    renderHookWithProvider(
      () => useSwapBridgeNavigation({
        location: mockLocation,
        sourcePage: mockSourcePage,
      }),
      { state: initialState }
    );

    expect(getNativeAssetForChainId).toHaveBeenCalledWith(mockChainId);
  });

  it('should use provided token when available', () => {
    const mockToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000001',
      symbol: 'TOKEN',
      name: 'Test Token',
      decimals: 18,
      chainId: mockChainId,
    };

    renderHookWithProvider(
      () => useSwapBridgeNavigation({
        location: mockLocation,
        sourcePage: mockSourcePage,
        token: mockToken,
      }),
      { state: initialState }
    );

    expect(getNativeAssetForChainId).toHaveBeenCalledWith(mockChainId);
  });

  it('should navigate to Bridge when goToBridge is called and bridge UI is enabled', () => {
    const { result } = renderHookWithProvider(
      () => useSwapBridgeNavigation({
        location: mockLocation,
        sourcePage: mockSourcePage,
      }),
      { state: initialState }
    );

    result.current.goToBridge();

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        token: {
          address: mockNativeAsset.address,
          name: mockNativeAsset.name,
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

  it('should call goToPortfolioBridge when goToBridge is called and bridge UI is disabled', () => {
    (isBridgeUiEnabled as jest.Mock).mockReturnValue(false);

    const { result } = renderHookWithProvider(
      () => useSwapBridgeNavigation({
        location: mockLocation,
        sourcePage: mockSourcePage,
      }),
      { state: initialState }
    );

    result.current.goToBridge();

    expect(mockGoToPortfolioBridge).toHaveBeenCalled();
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });

  it('should navigate to Swaps when goToSwaps is called and token chainId matches selected chainId', async () => {
    const { result } = renderHookWithProvider(
      () => useSwapBridgeNavigation({
        location: mockLocation,
        sourcePage: mockSourcePage,
      }),
      { state: initialState }
    );

    result.current.goToSwaps();

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Swaps', {
        screen: 'SwapsAmountView',
        params: {
          sourceToken: mockNativeAsset.address,
          chainId: mockChainId,
          sourcePage: mockSourcePage,
        },
      });
    });

    expect(Engine.context.MultichainNetworkController.setActiveNetwork).not.toHaveBeenCalled();
  });

  it('should switch network and navigate to Swaps when goToSwaps is called and token chainId differs from selected chainId', async () => {
    const differentChainId = '0x2' as Hex;
    const mockToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000001',
      symbol: 'TOKEN',
      name: 'Test Token',
      decimals: 18,
      chainId: differentChainId,
    };

    const { result } = renderHookWithProvider(
      () => useSwapBridgeNavigation({
        location: mockLocation,
        sourcePage: mockSourcePage,
        token: mockToken,
      }),
      { state: initialState }
    );

    result.current.goToSwaps();

    await waitFor(() => {
      expect(Engine.context.NetworkController.getNetworkConfigurationByChainId).toHaveBeenCalledWith(differentChainId);
      expect(Engine.context.MultichainNetworkController.setActiveNetwork).toHaveBeenCalledWith('test-network-client-id');

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Swaps', {
        screen: 'SwapsAmountView',
        params: {
          sourceToken: mockToken.address,
          chainId: mockToken.chainId,
          sourcePage: mockSourcePage,
        },
      });
    });
  });

  it('should navigate to Bridge when goToSwaps is called and token chainId is SolScope.Mainnet', () => {
    const mockToken: BridgeToken = {
      address: '0x0000000000000000000000000000000000000001',
      symbol: 'SOL',
      name: 'Solana',
      decimals: 9,
      chainId: SolScope.Mainnet,
    };

    const { result } = renderHookWithProvider(
      () => useSwapBridgeNavigation({
        location: mockLocation,
        sourcePage: mockSourcePage,
        token: mockToken,
      }),
      { state: initialState }
    );

    result.current.goToSwaps();

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        token: mockToken,
        sourcePage: mockSourcePage,
        bridgeViewMode: BridgeViewMode.Swap,
      },
    });
  });

  it('should navigate to Bridge when goToSwaps is called and selected chainId is SolScope.Mainnet', () => {
    (useSelector as jest.Mock).mockReturnValue(SolScope.Mainnet);

    const { result } = renderHookWithProvider(
      () => useSwapBridgeNavigation({
        location: mockLocation,
        sourcePage: mockSourcePage,
      }),
      { state: initialState }
    );

    result.current.goToSwaps();

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        token: {
          address: mockNativeAsset.address,
          name: mockNativeAsset.name,
          symbol: mockNativeAsset.symbol,
          image: '',
          decimals: mockNativeAsset.decimals,
          chainId: SolScope.Mainnet,
        },
        sourcePage: mockSourcePage,
        bridgeViewMode: BridgeViewMode.Swap,
      },
    });
  });
});
