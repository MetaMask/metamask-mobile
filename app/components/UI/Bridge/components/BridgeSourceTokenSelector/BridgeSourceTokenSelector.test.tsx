import { initialState } from '../../_mocks_/initialState';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { BridgeSourceTokenSelector } from '.';
import Routes from '../../../../../constants/navigation/Routes';
import { setSourceToken } from '../../../../../core/redux/slices/bridge';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => {
  const actual = jest.requireActual('../../../../../core/redux/slices/bridge');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    setSourceToken: jest.fn(actual.setSourceToken),
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
    ...jest.requireActual('../../../../../core/Engine').context,
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

describe('BridgeSourceTokenSelector', () => {
  // Fix ReferenceError: You are trying to access a property or method of the Jest environment after it has been torn down.
  jest.useFakeTimers();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('renders with initial state and displays tokens', async () => {
    const { getByText, toJSON } = renderScreen(
      BridgeSourceTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    // Header should be visible
    expect(getByText('Select token')).toBeTruthy();

    // Native token (ETH) should be visible with correct balance
    await waitFor(() => {
      expect(getByText('3 ETH')).toBeTruthy();
      expect(getByText('$6000')).toBeTruthy();
    });

    // ERC20 tokens should be visible with correct balances
    await waitFor(() => {
      expect(getByText('1 TOKEN1')).toBeTruthy();
      expect(getByText('$20000')).toBeTruthy();

      expect(getByText('2 HELLO')).toBeTruthy();
      expect(getByText('$200000')).toBeTruthy();
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('handles token selection correctly', async () => {
    // Arrange
    const { getByText } = renderScreen(
      BridgeSourceTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    // Act - wait for token to appear and press it
    await waitFor(() => {
      const token1Element = getByText('1 TOKEN1');
      fireEvent.press(token1Element);
    });

    // Advance timers to trigger debounced function (wrapped in act to handle state updates)
    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    // Assert - check that actions were called
    expect(setSourceToken).toHaveBeenCalledWith({
      accountType: undefined,
      address: '0x0000000000000000000000000000000000000001',
      aggregators: ['1inch'],
      balance: '1.0',
      balanceFiat: '$20000',
      chainId: '0x1',
      decimals: 18,
      image:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0x0000000000000000000000000000000000000001.png',
      metadata: undefined,
      name: 'Token One',
      symbol: 'TOKEN1',
      tokenFiatAmount: 20000,
    });
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles close button correctly', () => {
    const { getByTestId } = renderScreen(
      BridgeSourceTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    const closeButton = getByTestId('bridge-token-selector-close-button');
    fireEvent.press(closeButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles token search functionality correctly', async () => {
    const { getByTestId, getByText, queryByText } = renderScreen(
      BridgeSourceTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    // Initially all tokens should be visible
    await waitFor(() => {
      expect(getByText('3 ETH')).toBeTruthy();
      expect(getByText('1 TOKEN1')).toBeTruthy();
      expect(getByText('2 HELLO')).toBeTruthy();
    });

    // Search for TOKEN1
    const searchInput = getByTestId('bridge-token-search-input');
    fireEvent.changeText(searchInput, 'HELLO');

    // Should only show HELLO, not TOKEN1
    await waitFor(() => {
      expect(getByText('2 HELLO')).toBeTruthy();
      expect(queryByText('1 TOKEN1')).toBeNull();
    });

    // Search should be case-insensitive
    fireEvent.changeText(searchInput, 'hello');
    await waitFor(() => {
      expect(getByText('2 HELLO')).toBeTruthy();
      expect(queryByText('1 TOKEN1')).toBeNull();
    });
  });

  it('displays empty state when no tokens match search', async () => {
    jest.useFakeTimers();
    const { getByTestId, getByText } = renderScreen(
      BridgeSourceTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    const searchInput = getByTestId('bridge-token-search-input');
    fireEvent.changeText(searchInput, 'NONEXISTENT');

    await waitFor(() => {
      expect(getByText('No tokens match', { exact: false })).toBeTruthy();
    });
  });
});
