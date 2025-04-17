import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { SwapBridgeNavigationLocation, useSwapBridgeNavigation } from '.';
import { waitFor } from '@testing-library/react-native';
import { initialState } from '../../_mocks_/initialState';
import { BridgeToken, BridgeViewMode } from '../../types';
import { Hex } from '@metamask/utils';
import { SolScope } from '@metamask/keyring-api';
import { isBridgeUiEnabled } from '../../utils';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { selectChainId } from '../../../../../selectors/networkController';

// Mock dependencies
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({ navigate: mockNavigate })),
}));

jest.mock('../../utils', () => ({
  ...jest.requireActual('../../utils'),
  isBridgeUiEnabled: jest.fn(() => true),
}));

const mockGoToPortfolioBridge = jest.fn();
jest.mock('../useGoToPortfolioBridge', () => ({
  __esModule: true,
  default: jest.fn(() => mockGoToPortfolioBridge),
}));

jest.mock('../../../../../selectors/networkController', () => {
  const actual = jest.requireActual('../../../../../selectors/networkController');
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
        token: {
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
          token: mockToken,
        }),
      { state: initialState },
    );

    result.current.goToBridge();

    expect(mockNavigate).toHaveBeenCalledWith('Bridge', {
      screen: 'BridgeView',
      params: {
        token: mockToken,
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
        token: mockNativeAsset,
        sourcePage: mockSourcePage,
        bridgeViewMode: BridgeViewMode.Bridge,
      },
    });
  });

  it('calls goToPortfolioBridge when goToBridge is called and bridge UI is disabled', () => {
    (isBridgeUiEnabled as jest.Mock).mockReturnValueOnce(false);

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
          token: mockToken,
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

  describe('Solana', () => {
    it('navigates to Bridge when goToSwaps is called and token chainId is Solana', () => {
      (selectChainId as unknown as jest.Mock).mockReturnValue(
        SolScope.Mainnet,
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
          token: {
            address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
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
      (selectChainId as unknown as jest.Mock).mockReturnValue(
        SolScope.Mainnet,
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
          token: {
            address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
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
