import {
  initialState as initialStateBase,
  ethToken2Address,
} from '../../_mocks_/initialState';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { BridgeDestTokenSelector, getNetworkName } from '.';
import Routes from '../../../../../constants/navigation/Routes';
import {
  selectBridgeViewMode,
  setDestToken,
} from '../../../../../core/redux/slices/bridge';
import { cloneDeep } from 'lodash';
import { BridgeViewMode } from '../../types';
import Engine from '../../../../../core/Engine';
import { toHex } from '@metamask/controller-utils';
import { MultichainNetworkConfiguration } from '@metamask/multichain-network-controller';
import { Hex } from '@metamask/utils';
import {
  ARBITRUM_DISPLAY_NAME,
  AVALANCHE_DISPLAY_NAME,
  BASE_DISPLAY_NAME,
  BNB_DISPLAY_NAME,
  OPTIMISM_DISPLAY_NAME,
} from '../../../../../core/Engine/constants';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    dispatch: mockDispatch,
  }),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => {
  const actual = jest.requireActual('../../../../../core/redux/slices/bridge');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    setDestToken: jest.fn(actual.setDestToken),
    selectBridgeViewMode: jest.fn().mockReturnValue('Bridge'),
  };
});

jest.mock('../../../../Views/NetworkSelector/useSwitchNetworks', () => ({
  useSwitchNetworks: () => ({
    onSetRpcTarget: jest.fn(),
    onNetworkChange: jest.fn(),
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    SwapsController: {
      fetchTopAssetsWithCache: jest.fn().mockReturnValue([
        {
          address: '0x0000000000000000000000000000000000000001',
          symbol: 'TOKEN1',
        },
        {
          address: '0x0000000000000000000000000000000000000002',
          symbol: 'HELLO',
        },
      ]),
    },
    BridgeController: {
      trackUnifiedSwapBridgeEvent: jest.fn(),
    },
  },
}));

jest.mock('@metamask/bridge-controller', () => ({
  ...jest.requireActual('@metamask/bridge-controller'),
  fetchBridgeTokens: jest.fn().mockReturnValue({
    '0x0000000000000000000000000000000000000001': {
      address: '0x0000000000000000000000000000000000000001',
      symbol: 'TOKEN1',
      name: 'Token One',
      decimals: 18,
      chainId: '0x1',
      iconUrl: 'https://token1.com/logo.png',
    },
    '0x0000000000000000000000000000000000000002': {
      address: '0x0000000000000000000000000000000000000002',
      symbol: 'HELLO',
      name: 'Hello Token',
      decimals: 18,
      chainId: '0x1',
      iconUrl: 'https://token2.com/logo.png',
    },
  }),
}));

describe('getNetworkName', () => {
  it('returns network name from network configurations when available', () => {
    const chainId = toHex('1') as Hex;
    const networkConfigurations: Record<
      string,
      MultichainNetworkConfiguration
    > = {
      [chainId]: {
        name: 'Ethereum Mainnet',
        chainId,
        nativeCurrency: 'ETH',
        rpcEndpoints: [],
        isEvm: true,
        blockExplorerUrls: ['https://etherscan.io'],
        defaultBlockExplorerUrlIndex: 0,
      } as MultichainNetworkConfiguration,
    };

    const result = getNetworkName(chainId, networkConfigurations);
    expect(result).toBe('Ethereum Mainnet');
  });

  it('returns nickname from PopularList when network not in configurations', () => {
    const chainId = toHex('43114') as Hex; // Avalanche
    const networkConfigurations: Record<
      string,
      MultichainNetworkConfiguration
    > = {};

    const result = getNetworkName(chainId, networkConfigurations);
    expect(result).toBe(AVALANCHE_DISPLAY_NAME);
  });

  it('returns nickname from PopularList for Arbitrum', () => {
    const chainId = toHex('42161') as Hex;
    const networkConfigurations: Record<
      string,
      MultichainNetworkConfiguration
    > = {};

    const result = getNetworkName(chainId, networkConfigurations);
    expect(result).toBe(ARBITRUM_DISPLAY_NAME);
  });

  it('returns nickname from PopularList for BNB Smart Chain', () => {
    const chainId = toHex('56') as Hex;
    const networkConfigurations: Record<
      string,
      MultichainNetworkConfiguration
    > = {};

    const result = getNetworkName(chainId, networkConfigurations);
    expect(result).toBe(BNB_DISPLAY_NAME);
  });

  it('returns nickname from PopularList for Base', () => {
    const chainId = toHex('8453') as Hex;
    const networkConfigurations: Record<
      string,
      MultichainNetworkConfiguration
    > = {};

    const result = getNetworkName(chainId, networkConfigurations);
    expect(result).toBe(BASE_DISPLAY_NAME);
  });

  it('returns nickname from PopularList for OP', () => {
    const chainId = toHex('10') as Hex;
    const networkConfigurations: Record<
      string,
      MultichainNetworkConfiguration
    > = {};

    const result = getNetworkName(chainId, networkConfigurations);
    expect(result).toBe(OPTIMISM_DISPLAY_NAME);
  });

  it('returns "Unknown Network" when network not found anywhere', () => {
    const chainId = toHex('999999') as Hex; // Non-existent chain ID
    const networkConfigurations: Record<
      string,
      MultichainNetworkConfiguration
    > = {};

    const result = getNetworkName(chainId, networkConfigurations);
    expect(result).toBe('Unknown Network');
  });

  it('prioritizes network configurations over PopularList', () => {
    const chainId = toHex('43114') as Hex; // Avalanche
    const networkConfigurations: Record<
      string,
      MultichainNetworkConfiguration
    > = {
      [chainId]: {
        name: 'Custom Avalanche Name',
        chainId,
        nativeCurrency: 'AVAX',
        rpcEndpoints: [],
        isEvm: true,
        blockExplorerUrls: ['https://snowtrace.io'],
        defaultBlockExplorerUrlIndex: 0,
      } as MultichainNetworkConfiguration,
    };

    const result = getNetworkName(chainId, networkConfigurations);
    expect(result).toBe('Custom Avalanche Name');
  });

  it('handles undefined network configurations gracefully', () => {
    const chainId = toHex('1') as Hex;
    const networkConfigurations = undefined as unknown as Record<
      string,
      MultichainNetworkConfiguration
    >;

    const result = getNetworkName(chainId, networkConfigurations);
    expect(result).toBe('Unknown Network');
  });

  it('handles null network configurations gracefully', () => {
    const chainId = toHex('1') as Hex;
    const networkConfigurations = null as unknown as Record<
      string,
      MultichainNetworkConfiguration
    >;

    const result = getNetworkName(chainId, networkConfigurations);
    expect(result).toBe('Unknown Network');
  });

  it('handles empty string chainId', () => {
    const chainId = '' as Hex;
    const networkConfigurations: Record<
      string,
      MultichainNetworkConfiguration
    > = {};

    const result = getNetworkName(chainId, networkConfigurations);
    expect(result).toBe('Unknown Network');
  });

  it('handles network configuration without name property', () => {
    const chainId = toHex('1') as Hex;
    const networkConfigurations = {
      [chainId]: {
        chainId,
        nativeCurrency: 'ETH',
        rpcEndpoints: [],
        isEvm: true,
        blockExplorerUrls: ['https://etherscan.io'],
        defaultBlockExplorerUrlIndex: 0,
        // name property is missing
      } as unknown as MultichainNetworkConfiguration,
    };

    const result = getNetworkName(chainId, networkConfigurations);
    expect(result).toBe('Unknown Network');
  });
});

describe('BridgeDestTokenSelector', () => {
  // Fix ReferenceError: You are trying to access a property or method of the Jest environment after it has been torn down.
  jest.useFakeTimers();

  const initialState = cloneDeep(initialStateBase);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialState.bridge.selectedDestChainId = '0x1' as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('renders with initial state and displays tokens', async () => {
    const { getByText, toJSON } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    // Header should be visible
    expect(getByText('Select token')).toBeTruthy();

    // Tokens for destination chain should be visible
    await waitFor(() => {
      expect(getByText('HELLO')).toBeTruthy();
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('handles token selection correctly', async () => {
    // Arrange
    const { getByText } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    // Act - wait for token to appear and press it
    await waitFor(() => {
      const token1Element = getByText('HELLO');
      fireEvent.press(token1Element);
    });

    // Advance timers to trigger debounced function (wrapped in act to handle state updates)
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Assert - check that actions were called
    expect(setDestToken).toHaveBeenCalledWith(
      expect.objectContaining({
        address: ethToken2Address,
        balance: '2.0',
        chainId: '0x1',
        decimals: 18,
        image: 'https://token2.com/logo.png',
        name: 'Hello Token',
        symbol: 'HELLO',
      }),
    );
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles info button click correctly, navigates to Asset screen', async () => {
    const { getAllByTestId, getByText } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    await waitFor(() => {
      expect(getByText('HELLO')).toBeTruthy();
      expect(getByText('TOKEN1')).toBeTruthy();
    });

    // Get the info button using its test ID
    const infoButton = getAllByTestId('token-info-button')[0];

    // Ensure we found the info button
    expect(infoButton).toBeTruthy();

    // Press the info button
    fireEvent.press(infoButton);

    // Verify navigation to Asset screen with the correct token params via dispatch
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'NAVIGATE',
        payload: expect.objectContaining({
          name: 'Asset',
          key: expect.stringMatching(/^Asset-.*-\d+$/), // Should match pattern "Asset-{address}-{chainId}-{timestamp}"
          params: expect.objectContaining({
            address: ethToken2Address,
            balance: '2.0',
            balanceFiat: '$200000',
            chainId: '0x1',
            decimals: 18,
            image: 'https://token2.com/logo.png',
            name: 'Hello Token',
            symbol: 'HELLO',
            tokenFiatAmount: 200000,
          }),
        }),
      }),
    );
  });

  it('handles close button correctly', () => {
    const { getByTestId } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    const closeButton = getByTestId('bridge-token-selector-close-button');
    fireEvent.press(closeButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles token search functionality correctly', async () => {
    const { getByTestId, getByText, queryByText } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    // Initially all tokens should be visible
    await waitFor(() => {
      expect(getByText('HELLO')).toBeTruthy();
    });

    // Search for TOKEN1
    const searchInput = getByTestId('bridge-token-search-input');
    fireEvent.changeText(searchInput, 'HELLO');

    // Should only show HELLO, not ETH
    await waitFor(() => {
      expect(getByText('HELLO')).toBeTruthy();
      expect(queryByText('ETH')).toBeNull();
    });

    // Search should be case-insensitive
    fireEvent.changeText(searchInput, 'hello');
    await waitFor(() => {
      expect(getByText('HELLO')).toBeTruthy();
      expect(queryByText('ETH')).toBeNull();
    });
  });

  it('displays empty state when no tokens match search', async () => {
    jest.useFakeTimers();
    const { getByTestId, getByText } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    const searchInput = getByTestId('bridge-token-search-input');
    fireEvent.changeText(searchInput, 'NONEXISTENT');

    await waitFor(() => {
      expect(getByText('No tokens match', { exact: false })).toBeTruthy();
    });
  });

  it('hides destination network bar when mode is Swap', async () => {
    (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
      BridgeViewMode.Swap,
    );
    const { queryByText } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    const seeAllButton = queryByText('See all');
    expect(seeAllButton).toBeNull();

    // Restore the original mock
    (selectBridgeViewMode as unknown as jest.Mock).mockReturnValue(
      BridgeViewMode.Bridge,
    );
  });

  it('shows destination network bar when mode is Bridge', async () => {
    const { getByText } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    const seeAllButton = getByText('See all');
    expect(seeAllButton).toBeTruthy();
  });

  it('navigates to destination network selector when See all is pressed', async () => {
    const { getByText } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    const seeAllButton = getByText('See all');
    fireEvent.press(seeAllButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR,
    });
  });

  describe('Unified SwapBridge Event Tracking', () => {
    it('tracks UnifiedSwapBridgeEvent when info button is clicked', async () => {
      const { getAllByTestId, getByText } = renderScreen(
        BridgeDestTokenSelector,
        {
          name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
        },
        { state: initialState },
      );

      // Wait for tokens to be visible
      await waitFor(() => {
        expect(getByText('HELLO')).toBeTruthy();
        expect(getByText('TOKEN1')).toBeTruthy();
      });

      // Get the info button for the first token (HELLO)
      const infoButton = getAllByTestId('token-info-button')[0];
      fireEvent.press(infoButton);

      // Verify the tracking event was called with correct parameters
      expect(
        Engine.context.BridgeController.trackUnifiedSwapBridgeEvent,
      ).toHaveBeenCalledWith(
        'Unified SwapBridge Asset Detail Tooltip Clicked',
        {
          token_name: 'Hello Token',
          token_symbol: 'HELLO',
          token_contract: ethToken2Address,
          chain_name: 'Ethereum Mainnet',
          chain_id: '0x1',
        },
      );
    });
  });
});
