import {
  initialState as initialStateBase,
  ethToken2Address,
} from '../../_mocks_/initialState';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { BridgeDestTokenSelector } from '.';
import Routes from '../../../../../constants/navigation/Routes';
import {
  selectBridgeViewMode,
  setDestToken,
} from '../../../../../core/redux/slices/bridge';
import { cloneDeep } from 'lodash';
import { BridgeViewMode } from '../../types';

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

describe('BridgeDestTokenSelector', () => {
  // Fix ReferenceError: You are trying to access a property or method of the Jest environment after it has been torn down.
  jest.useFakeTimers();

  const initialState = cloneDeep(initialStateBase);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialState.bridge.selectedDestChainId = '0x1' as any;

  beforeEach(() => {
    jest.clearAllMocks();
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
    const { getByText } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    await waitFor(() => {
      const token1Element = getByText('HELLO');
      fireEvent.press(token1Element);
    });

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
});
