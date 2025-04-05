import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { BridgeSourceNetworkSelector } from '.';
import Routes from '../../../../../constants/navigation/Routes';
import { Hex } from '@metamask/utils';
import { setSelectedSourceChainIds } from '../../../../../core/redux/slices/bridge';
import {
  BridgeFeatureFlagsKey,
  formatChainIdToCaip,
} from '@metamask/bridge-controller';
import { BridgeSourceNetworkSelectorSelectorsIDs } from '../../../../../../e2e/selectors/Bridge/BridgeSourceNetworkSelector.selectors';

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
    setSelectedSourceChainIds: jest.fn(actual.setSelectedSourceChainIds),
  };
});

describe('BridgeSourceNetworkSelector', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as Hex;
  const mockChainId = '0x1' as Hex;
  const optimismChainId = '0xa' as Hex;
  const token1Address = '0x0000000000000000000000000000000000000001' as Hex;
  const token2Address = '0x0000000000000000000000000000000000000002' as Hex;
  const token3Address = '0x0000000000000000000000000000000000000003' as Hex;

  const initialState = {
    engine: {
      backgroundState: {
        BridgeController: {
          bridgeFeatureFlags: {
            [BridgeFeatureFlagsKey.MOBILE_CONFIG]: {
              chains: {
                [formatChainIdToCaip(mockChainId)]: {
                  isActiveSrc: true,
                  isActiveDest: true,
                },
                [formatChainIdToCaip(optimismChainId)]: {
                  isActiveSrc: true,
                  isActiveDest: true,
                },
              },
            },
          },
        },
        TokenBalancesController: {
          tokenBalances: {
            [mockAddress]: {
              [mockChainId]: {
                [token1Address]: '0x0de0b6b3a7640000' as Hex, // 1 TOKEN1
                [token2Address]: '0x1bc16d674ec80000' as Hex, // 2 TOKEN2
              },
              [optimismChainId]: {
                [token3Address]: '0x29a2241af62c0000' as Hex, // 3 TOKEN3
              },
            },
          },
        },
        TokensController: {
          allTokens: {
            [mockChainId]: {
              [mockAddress]: [
                {
                  address: token1Address,
                  symbol: 'TOKEN1',
                  decimals: 18,
                  image: 'https://token1.com/logo.png',
                  name: 'Token One',
                  aggregators: ['1inch'],
                },
                {
                  address: token2Address,
                  symbol: 'TOKEN2',
                  decimals: 18,
                  image: 'https://token2.com/logo.png',
                  name: 'Token Two',
                  aggregators: ['uniswap'],
                },
              ],
            },
            [optimismChainId]: {
              [mockAddress]: [
                {
                  address: token3Address,
                  symbol: 'TOKEN3',
                  decimals: 18,
                  image: 'https://token3.com/logo.png',
                  name: 'Token Three',
                  aggregators: ['optimism'],
                  chainId: optimismChainId,
                },
              ],
            },
          },
          tokens: [
            {
              address: token1Address,
              symbol: 'TOKEN1',
              decimals: 18,
              image: 'https://token1.com/logo.png',
              name: 'Token One',
              aggregators: ['1inch'],
              chainId: mockChainId,
            },
            {
              address: token2Address,
              symbol: 'TOKEN2',
              decimals: 18,
              image: 'https://token2.com/logo.png',
              name: 'Token Two',
              aggregators: ['uniswap'],
              chainId: mockChainId,
            },
            {
              address: token3Address,
              symbol: 'TOKEN3',
              decimals: 18,
              image: 'https://token3.com/logo.png',
              name: 'Token Three',
              aggregators: ['optimism'],
              chainId: optimismChainId,
            },
          ],
        },
        NetworkController: {
          selectedNetworkClientId: 'selectedNetworkClientId',
          networksMetadata: {
            mainnet: {
              EIPS: {
                1559: true,
              },
            },
            '0xa': {
              EIPS: {
                1559: true,
              },
            },
          },
          networkConfigurationsByChainId: {
            [mockChainId]: {
              chainId: mockChainId,
              rpcEndpoints: [
                {
                  networkClientId: 'selectedNetworkClientId',
                },
              ],
              defaultRpcEndpointIndex: 0,
              nativeCurrency: 'ETH',
              ticker: 'ETH',
              nickname: 'Ethereum Mainnet',
              name: 'Ethereum Mainnet',
            },
            [optimismChainId]: {
              chainId: optimismChainId,
              rpcEndpoints: [
                {
                  networkClientId: 'optimismNetworkClientId',
                },
              ],
              defaultRpcEndpointIndex: 0,
              nativeCurrency: 'ETH',
              ticker: 'ETH',
              nickname: 'Optimism',
              name: 'Optimism',
            },
          },
          providerConfig: {
            chainId: mockChainId,
            ticker: 'ETH',
            type: 'infura',
          },
        },
        AccountTrackerController: {
          accounts: {
            [mockAddress]: {
              balance: '0x29a2241af62c0000' as Hex, // 3 ETH
            },
          },
          accountsByChainId: {
            [mockChainId]: {
              [mockAddress]: {
                balance: '0x29a2241af62c0000' as Hex, // 3 ETH
              },
            },
            [optimismChainId]: {
              [mockAddress]: {
                balance: '0x1158e460913d00000' as Hex, // 20 ETH on Optimism
              },
            },
          },
        },
        MultichainNetworkController: {
          isEvmSelected: true,
          selectedMultichainNetworkChainId: undefined,
          multichainNetworkConfigurationsByChainId: {},
        },
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'account1',
            accounts: {
              account1: {
                id: 'account1',
                address: mockAddress,
                name: 'Account 1',
              },
            },
          },
        },
        CurrencyRateController: {
          currentCurrency: 'USD',
          currencyRates: {
            ETH: {
              conversionRate: 2000, // 1 ETH = $2000
            },
          },
          conversionRate: 2000,
        },
        TokenRatesController: {
          marketData: {
            [mockChainId]: {
              [token1Address]: {
                tokenAddress: token1Address,
                currency: 'ETH',
                price: 10, // 1 TOKEN1 = 10 ETH
              },
              [token2Address]: {
                tokenAddress: token2Address,
                currency: 'ETH',
                price: 5, // 1 TOKEN2 = 5 ETH
              },
            },
            [optimismChainId]: {
              [token3Address]: {
                tokenAddress: token3Address,
                currency: 'ETH',
                price: 8, // 1 TOKEN3 = 8 ETH on Optimism
              },
            },
          },
        },
        PreferencesController: {
          tokenSortConfig: {
            key: 'tokenFiatAmount',
            order: 'dsc' as const,
          },
        },
        TokenListController: {
          tokenList: {
            [token3Address]: {
              name: 'Token Three',
              symbol: 'TOKEN3',
              decimals: 18,
              address: token3Address,
              iconUrl: 'https://token3.com/logo.png',
              occurrences: 1,
              aggregators: [],
            },
          },
          tokensChainsCache: {
            [mockChainId]: {
              timestamp: Date.now(),
              data: {
                [token3Address]: {
                  name: 'Token Three',
                  symbol: 'TOKEN3',
                  decimals: 18,
                  address: token3Address,
                  iconUrl: 'https://token3.com/logo.png',
                  occurrences: 1,
                  aggregators: [],
                },
              },
            },
            [optimismChainId]: {
              timestamp: Date.now(),
              data: {
                [token3Address]: {
                  name: 'Token Three',
                  symbol: 'TOKEN3',
                  decimals: 18,
                  address: token3Address,
                  iconUrl: 'https://token3.com/logo.png',
                  occurrences: 1,
                  aggregators: ['optimism'],
                },
              },
            },
          },
        },
      },
    },
    bridge: {
      sourceAmount: undefined,
      destAmount: undefined,
      destChainId: undefined,
      sourceToken: undefined,
      destToken: undefined,
      selectedSourceChainIds: [mockChainId, optimismChainId],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial state and displays networks', async () => {
    const { getByText, toJSON } = renderScreen(
      BridgeSourceNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    // Header should be visible
    expect(getByText('Select network')).toBeTruthy();

    // Networks should be visible with fiat values
    await waitFor(() => {
      expect(getByText('Ethereum Mainnet')).toBeTruthy();
      expect(getByText('Optimism')).toBeTruthy();

      // Check for fiat values
      // Optimism: 20 ETH * $2000 + 3 TOKEN3 * 8 ETH * $2000 = $40,000 + $48,000 = $88,000
      expect(getByText('$88000')).toBeTruthy();

      // Ethereum: 3 ETH * $2000 + 1 TOKEN1 * 10 ETH * $2000 + 2 TOKEN2 * 5 ETH * $2000 = $6,000 + $20,000 + $20,000 = $46,000
      expect(getByText('$46000')).toBeTruthy();
    });

    // "Select all networks" button should be visible
    expect(getByText('Deselect all')).toBeTruthy();

    expect(toJSON()).toMatchSnapshot();
  });

  it('handles network selection toggle correctly', async () => {
    const { getAllByTestId } = renderScreen(
      BridgeSourceNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    // Initially both networks should be selected
    const ethereum = getAllByTestId(`checkbox-${mockChainId}`);
    const ethereumCheckbox = getAllByTestId(`checkbox-${mockChainId}`)[0];
    const optimism = getAllByTestId(`checkbox-${optimismChainId}`);

    // Check that both checkboxes are initially checked
    expect(ethereum.length).toBe(2);
    expect(optimism.length).toBe(2);

    // Uncheck Ethereum network
    fireEvent.press(ethereumCheckbox);

    // Now Ethereum should be unchecked
    const ethereumAfter = getAllByTestId(`checkbox-${mockChainId}`);
    expect(ethereumAfter.length).toBe(1);

    // Optimism should still be checked
    const optimismAfter = getAllByTestId(`checkbox-${optimismChainId}`);
    expect(optimismAfter.length).toBe(2);
  });

  it('handles "select all" and "deselect all" toggle correctly', async () => {
    const { getAllByTestId, getByText, queryByText } = renderScreen(
      BridgeSourceNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    // Initially should show "Deselect all networks" since all networks are selected
    expect(getByText('Deselect all')).toBeTruthy();

    // Click "Deselect all networks"
    const allNetworksToggle = getByText('Deselect all');
    fireEvent.press(allNetworksToggle);

    // Now both networks should be unchecked
    const ethereum = getAllByTestId(`checkbox-${mockChainId}`);
    const optimism = getAllByTestId(`checkbox-${optimismChainId}`);

    expect(ethereum.length).toBe(1);
    expect(optimism.length).toBe(1);

    // Button should now say "Select all networks"
    expect(getByText('Select all')).toBeTruthy();
    expect(queryByText('Deselect all')).toBeNull();

    // Click "Select all networks"
    fireEvent.press(allNetworksToggle);

    // Now both networks should be checked again
    const ethereumAfter = getAllByTestId(`checkbox-${mockChainId}`);
    const optimismAfter = getAllByTestId(`checkbox-${optimismChainId}`);

    expect(ethereumAfter.length).toBe(2);
    expect(optimismAfter.length).toBe(2);

    expect(ethereumAfter.length).toBe(2);
    expect(optimismAfter.length).toBe(2);

    // Button should now say "Deselect all networks" again
    expect(getByText('Deselect all')).toBeTruthy();
    expect(queryByText('Select all')).toBeNull();
  });

  it('applies selected networks when clicking Apply button', async () => {
    const { getAllByTestId, getByText } = renderScreen(
      BridgeSourceNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    // Uncheck Ethereum network
    const ethereumCheckbox = getAllByTestId(`checkbox-${mockChainId}`)[0];
    fireEvent.press(ethereumCheckbox);

    // Click Apply button
    const applyButton = getByText('Apply');
    fireEvent.press(applyButton);

    // Should call setSelectedSourceChainIds with just Optimism chainId
    expect(setSelectedSourceChainIds).toHaveBeenCalledWith([optimismChainId]);

    // Should navigate back
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles close button correctly', () => {
    const { getByTestId } = renderScreen(
      BridgeSourceNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    const closeButton = getByTestId('bridge-network-selector-close-button');
    fireEvent.press(closeButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('disables Apply button when no networks are selected', async () => {
    const { getByText, getByTestId } = renderScreen(
      BridgeSourceNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    // Deselect all networks
    const selectAllButton = getByText('Deselect all');
    fireEvent.press(selectAllButton);

    // Apply button should be disabled
    const applyButton = getByTestId(
      BridgeSourceNetworkSelectorSelectorsIDs.APPLY_BUTTON,
    );
    expect(applyButton.props.disabled).toBe(true);
  });

  it('networks should be sorted by fiat value in descending order', async () => {
    const { getAllByTestId } = renderScreen(
      BridgeSourceNetworkSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_NETWORK_SELECTOR,
      },
      { state: initialState },
    );

    // Get all network items
    const networkItems = getAllByTestId(/chain-/);

    // Optimism should be first (higher value - $88,000)
    expect(networkItems[0].props.testID).toBe(`chain-${optimismChainId}`);

    // Ethereum should be second (lower value - $46,000)
    expect(networkItems[1].props.testID).toBe(`chain-${mockChainId}`);
  });
});
