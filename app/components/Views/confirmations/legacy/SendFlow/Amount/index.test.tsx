import React from 'react';
import Amount from '.';
// eslint-disable-next-line @typescript-eslint/no-shadow
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import TransactionTypes from '../../../../../../core/TransactionTypes';
import { addTransaction } from '../../../../../../util/transaction-controller';
import { selectConfirmationRedesignFlags } from '../../../../../../selectors/featureFlagController/confirmations';
import { AmountViewSelectorsIDs } from '../../../../../../../e2e/selectors/SendFlow/AmountView.selectors';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { setMaxValueMode } from '../../../../../../actions/transaction';
import Routes from '../../../../../../constants/navigation/Routes';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

const mockTransactionTypes = TransactionTypes;

const MOCK_NFTS = [
  {
    address: '0x72b1FDb6443338A158DeC2FbF411B71123456789',
    description: 'Description of NFT 1',
    favorite: false,
    image: 'https://image.com/113',
    isCurrentlyOwned: true,
    name: 'My Nft #113',
    standard: 'ERC721',
    tokenId: '113',
    tokenURI:
      'https://opensea.io/assets/0x72b1FDb6443338A158DeC2FbF411B71123456789/113',
  },
  {
    address: '0x72b1FDb6443338A158DeC2FbF411B71123456789',
    description: 'Description of NFT 1',
    favorite: false,
    image: 'https://image.com/114',
    isCurrentlyOwned: true,
    name: 'My Nft #114',
    standard: 'ERC721',
    tokenId: '114',
    tokenURI:
      'https://opensea.io/assets/0x72b1FDb6443338A158DeC2FbF411B71123456789/114',
  },
];

jest.mock('../../../../../../util/address');

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    GasFeeController: {
      fetchGasFeeEstimates: jest.fn(() =>
        Promise.resolve({
          gasEstimateType: 'fee-market',
          gasFeeEstimates: {
            baseFeeTrend: 'up',
            estimatedBaseFee: '53.465906896',
            high: {
              maxWaitTimeEstimate: 60000,
              minWaitTimeEstimate: 15000,
              suggestedMaxFeePerGas: '71.505678965',
              suggestedMaxPriorityFeePerGas: '2',
            },
            historicalBaseFeeRange: ['34.414135263', '97.938829873'],
            historicalPriorityFeeRange: ['0.1', '100'],
            latestPriorityFeeRange: ['1.5', '19.288193104'],
            low: {
              maxWaitTimeEstimate: 30000,
              minWaitTimeEstimate: 15000,
              suggestedMaxFeePerGas: '54.875906896',
              suggestedMaxPriorityFeePerGas: '1.41',
            },
            medium: {
              maxWaitTimeEstimate: 45000,
              minWaitTimeEstimate: 15000,
              suggestedMaxFeePerGas: '68.33238362',
              suggestedMaxPriorityFeePerGas: '1.5',
            },
            networkCongestion: 0.4515,
            priorityFeeTrend: 'down',
          },
        }),
      ),
    },
    TransactionController: {
      estimateGas: jest.fn(() =>
        Promise.resolve({
          gas: mockTransactionTypes.CUSTOM_GAS.DEFAULT_GAS_LIMIT,
        }),
      ),
    },
  },
}));

jest.mock('../../../../../../util/transaction-controller', () => ({
  __esModule: true,
  estimateGas: jest.fn(() =>
    Promise.resolve({
      gas: mockTransactionTypes.CUSTOM_GAS.DEFAULT_GAS_LIMIT,
    }),
  ),
  addTransaction: jest.fn(),
}));

jest.mock('../../../../../../actions/transaction', () => ({
  ...jest.requireActual('../../../../../../actions/transaction'),
  setMaxValueMode: jest.fn().mockReturnValue({
    type: 'SET_MAX_VALUE_MODE',
  }),
}));

jest.mock(
  '../../../../../../selectors/featureFlagController/confirmations',
  () => ({
    selectConfirmationRedesignFlags: jest.fn(),
  }),
);

// Mock the networks utility function
jest.mock('../../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../../util/networks'),
  isRemoveGlobalNetworkSelectorEnabled: jest.fn().mockReturnValue(false),
}));

// Get reference to the mocked function
import { isRemoveGlobalNetworkSelectorEnabled } from '../../../../../../util/networks';
const mockIsRemoveGlobalNetworkSelectorEnabled =
  isRemoveGlobalNetworkSelectorEnabled as jest.MockedFunction<
    typeof isRemoveGlobalNetworkSelectorEnabled
  >;

const mockNavigate = jest.fn();

const CURRENT_ACCOUNT = '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3';
const RECEIVER_ACCOUNT = '0x2a';

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        selectedNetworkClientId: 'sepolia',
        networksMetadata: {
          mainnet: {
            status: 'available',
            EIPS: {
              '1559': true,
            },
          },
        },
        networkConfigurationsByChainId: {
          '0xaa36a7': {
            blockExplorerUrls: ['https://etherscan.com'],
            chainId: '0xaa36a7',
            defaultRpcEndpointIndex: 0,
            name: 'Sepolia',
            nativeCurrency: 'ETH',
            rpcEndpoints: [
              {
                networkClientId: 'sepolia',
                type: 'Custom',
                url: 'http://localhost/v3/',
              },
            ],
          },
        },
      },
      AccountTrackerController: {
        accountsByChainId: {
          '0xaa36a7': {
            [CURRENT_ACCOUNT]: {
              balance: '0',
            },
          },
        },
      },
      AccountsController: {
        internalAccounts: {
          selectedAccount: CURRENT_ACCOUNT,
          accounts: {
            [CURRENT_ACCOUNT]: {
              address: CURRENT_ACCOUNT,
            },
          },
        },
      },
      NftController: {
        allNfts: {
          [CURRENT_ACCOUNT]: {
            '0x1': [...MOCK_NFTS],
          },
        },
        allNftContracts: {
          [CURRENT_ACCOUNT]: {
            '0x1': [...MOCK_NFTS],
          },
        },
      },
      TokensController: {
        allTokens: {
          '0x1': {
            [CURRENT_ACCOUNT]: [
              {
                address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
                symbol: 'LINK',
                decimals: 18,
              },
            ],
          },
        },
      },
    },
  },
  settings: {
    showFiatOnTestnets: true,
    primaryCurrency: 'ETH',
  },
  networkOnboarded: {
    networkOnboardedState: {},
    sendFlowChainId: null,
  },
  transaction: {
    selectedAsset: {},
    transaction: {},
    transactionTo: '',
  },
};

const Stack = createStackNavigator();

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderComponent = (state: any = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="Amount" options={{}}>
        {(props) => (
          <Amount
            {...props}
            navigation={{
              navigate: mockNavigate,
              setOptions: jest.fn(),
              setParams: jest.fn(),
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

describe('Amount', () => {
  const mockSelectConfirmationRedesignFlags = jest.mocked(
    selectConfirmationRedesignFlags,
  );

  beforeEach(() => {
    mockNavigate.mockClear();
    mockSelectConfirmationRedesignFlags.mockReturnValue({
      transfer: false,
    } as ReturnType<typeof selectConfirmationRedesignFlags>);
  });

  it('renders correctly', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays correct balance', () => {
    const { getByText, toJSON } = renderComponent({
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokenRatesController: {
            marketData: {
              '0xaa36a7': {
                '0x514910771AF9Ca656af840dff83E8264EcF986CA': { price: 0.005 },
              },
            },
          },
          CurrencyRateController: {
            currentCurrency: 'usd',
            currencyRates: {
              ETH: {
                conversionRate: 1,
              },
            },
          },
          AccountTrackerController: {
            accountsByChainId: {
              '0xaa36a7': {
                [CURRENT_ACCOUNT]: {
                  balance: 'DE0B6B3A7640000',
                },
              },
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [CURRENT_ACCOUNT]: [],
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: CURRENT_ACCOUNT,
              accounts: {
                [CURRENT_ACCOUNT]: {
                  address: CURRENT_ACCOUNT,
                },
              },
            },
          },
        },
      },
      transaction: {
        assetType: 'ETH',
        selectedAsset: {
          address: '',
          isETH: true,
          logo: '../images/eth-logo.png',
          name: 'Ether',
          symbol: 'ETH',
        },
        transaction: {
          from: CURRENT_ACCOUNT,
        },
        transactionFromName: 'Account 1',
        transactionTo: RECEIVER_ACCOUNT,
        transactionToName: 'Account 2',
      },
    });

    const balanceText = getByText(/Balance:/);
    expect(balanceText.props.children).toBe('Balance: 1 ETH');
    expect(toJSON()).toMatchSnapshot();
  });

  it('sets max value mode when toggled on', () => {
    const { getByText } = renderComponent(initialState);

    const useMaxButton = getByText(/Use max/);
    fireEvent.press(useMaxButton);

    expect(setMaxValueMode).toHaveBeenCalled();
  });

  it('sets correct fiat amount for max native token', async () => {
    const { getByText, getByTestId } = renderComponent({
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          AccountTrackerController: {
            accountsByChainId: {
              '0xaa36a7': {
                [CURRENT_ACCOUNT]: {
                  balance: '4563918244F40000', // 5 ETH in hex
                },
              },
            },
          },
          CurrencyRateController: {
            currentCurrency: 'usd',
            currencyRates: {
              ETH: {
                conversionRate: 1000, // 1 ETH = $1000
              },
            },
          },
        },
      },
      settings: {
        ...initialState.settings,
        primaryCurrency: 'Fiat',
      },
      transaction: {
        assetType: 'ETH',
        selectedAsset: {
          address: '',
          isETH: true,
          logo: '../images/eth-logo.png',
          name: 'Ether',
          symbol: 'ETH',
        },
        transaction: {
          from: CURRENT_ACCOUNT,
        },
      },
    });

    // Wait for the gas estimation to complete
    const nextButton = getByTestId(AmountViewSelectorsIDs.NEXT_BUTTON);
    await waitFor(() => expect(nextButton.props.disabled).toBe(false));

    const useMaxButton = getByText(/Use max/);
    await act(async () => {
      fireEvent.press(useMaxButton);
    });

    // The conversion should happen and update the input
    const amountInput = getByTestId(
      AmountViewSelectorsIDs.TRANSACTION_AMOUNT_INPUT,
    );
    expect(amountInput.props.value).toBeDefined();
    expect(typeof amountInput.props.value).toBe('string');
    expect(amountInput.props.value).toBe('5000'); // $5000 from 5 ETH at $1000/ETH
  });

  it('proceeds if balance is sufficient while on Native primary currency is ETH', async () => {
    const { getByText, getByTestId, toJSON } = renderComponent({
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          CurrencyRateController: {
            currentCurrency: 'usd',
            currencyRates: {
              ETH: {
                conversionRate: 1,
              },
            },
          },
          AccountTrackerController: {
            accountsByChainId: {
              '0xaa36a7': {
                [CURRENT_ACCOUNT]: {
                  balance: '4563918244F40000',
                },
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: CURRENT_ACCOUNT,
              accounts: {
                [CURRENT_ACCOUNT]: {
                  address: CURRENT_ACCOUNT,
                },
              },
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [CURRENT_ACCOUNT]: [],
              },
            },
          },
        },
      },
      transaction: {
        assetType: 'ETH',
        selectedAsset: {
          address: '',
          isETH: true,
          logo: '../images/eth-logo.png',
          name: 'Ether',
          symbol: 'ETH',
        },
        transaction: {
          from: CURRENT_ACCOUNT,
        },
        transactionFromName: 'Account 1',
        transactionTo: RECEIVER_ACCOUNT,
        transactionToName: 'Account 2',
      },
    });

    const balanceText = getByText(/Balance:/);
    expect(balanceText.props.children).toBe('Balance: 5 ETH');

    const nextButton = getByTestId(AmountViewSelectorsIDs.NEXT_BUTTON);
    await waitFor(() => expect(nextButton.props.disabled).toStrictEqual(false));

    const textInput = getByTestId(
      AmountViewSelectorsIDs.TRANSACTION_AMOUNT_INPUT,
    );
    fireEvent.changeText(textInput, '1');

    const amountConversionValue = getByTestId(
      AmountViewSelectorsIDs.TRANSACTION_AMOUNT_CONVERSION_VALUE,
    );
    expect(amountConversionValue.props.children).toBe('$1.00');

    await act(() => fireEvent.press(nextButton));

    expect(mockNavigate).toHaveBeenCalledTimes(1);

    expect(toJSON()).toMatchSnapshot();
  });

  it('proceeds if balance is sufficient while on Native primary currency is not ETH', async () => {
    const { getByText, getByTestId, toJSON } = renderComponent({
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          NetworkController: {
            selectedNetworkClientId: 'asd',
            networksMetadata: {
              mainnet: {
                status: 'available',
                EIPS: {
                  '1559': true,
                },
              },
            },
            networkConfigurationsByChainId: {
              '0xa86a': {
                blockExplorerUrls: ['https://snowtrace.io'],
                chainId: '0xa86a',
                defaultRpcEndpointIndex: 0,
                name: 'Avalanche',
                nativeCurrency: 'AVAX',
                rpcEndpoints: [
                  {
                    networkClientId: 'asd',
                    type: 'Custom',
                    url: 'http://localhost/v3/',
                  },
                ],
              },
            },
          },
          CurrencyRateController: {
            currentCurrency: 'usd',
            currencyRates: {
              AVAX: {
                conversionRate: 1,
              },
            },
          },
          AccountTrackerController: {
            accountsByChainId: {
              '0xa86a': {
                [CURRENT_ACCOUNT]: {
                  balance: '4563918244F40000',
                },
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: CURRENT_ACCOUNT,
              accounts: {
                [CURRENT_ACCOUNT]: {
                  address: CURRENT_ACCOUNT,
                },
              },
            },
          },
          TokensController: {
            allTokens: {
              '0xa86a': {
                [CURRENT_ACCOUNT]: [],
              },
            },
          },
        },
      },
      transaction: {
        assetType: 'AVAX',
        selectedAsset: {
          address: '',
          isETH: false,
          isNative: true,
          logo: '../images/avalanche.png',
          name: 'Avalanche',
          symbol: 'AVAX',
        },
        transaction: {
          from: CURRENT_ACCOUNT,
        },
        transactionFromName: 'Account 1',
        transactionTo: RECEIVER_ACCOUNT,
        transactionToName: 'Account 2',
      },
    });

    const balanceText = getByText(/Balance:/);
    expect(balanceText.props.children).toBe('Balance: 5 AVAX');

    const nextButton = getByTestId(AmountViewSelectorsIDs.NEXT_BUTTON);
    await waitFor(() => expect(nextButton.props.disabled).toStrictEqual(false));

    const textInput = getByTestId(
      AmountViewSelectorsIDs.TRANSACTION_AMOUNT_INPUT,
    );
    fireEvent.changeText(textInput, '1');

    const amountConversionValue = getByTestId(
      AmountViewSelectorsIDs.TRANSACTION_AMOUNT_CONVERSION_VALUE,
    );
    expect(amountConversionValue.props.children).toBe('$1.00');

    await act(() => fireEvent.press(nextButton));

    expect(mockNavigate).toHaveBeenCalledTimes(1);

    expect(toJSON()).toMatchSnapshot();
  });

  it('shows an error message if balance is insufficient', async () => {
    const { getByText, getByTestId, queryByText, toJSON } = renderComponent({
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          CurrencyRateController: {
            currentCurrency: 'usd',
            currencyRates: {
              ETH: {
                conversionRate: 1,
              },
            },
          },
          AccountTrackerController: {
            accountsByChainId: {
              '0xaa36a7': {
                [CURRENT_ACCOUNT]: {
                  balance: '0x0',
                },
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: CURRENT_ACCOUNT,
              accounts: {
                [CURRENT_ACCOUNT]: {
                  address: CURRENT_ACCOUNT,
                },
              },
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [CURRENT_ACCOUNT]: [],
              },
            },
          },
        },
      },
      transaction: {
        assetType: 'ETH',
        selectedAsset: {
          address: '',
          isETH: true,
          logo: '../images/eth-logo.png',
          name: 'Ether',
          symbol: 'ETH',
        },
        transaction: {
          from: CURRENT_ACCOUNT,
        },
        transactionFromName: 'Account 1',
        transactionTo: RECEIVER_ACCOUNT,
        transactionToName: 'Account 2',
      },
    });

    const balanceText = getByText(/Balance:/);
    expect(balanceText.props.children).toBe('Balance: 0 ETH');

    const nextButton = getByTestId(AmountViewSelectorsIDs.NEXT_BUTTON);
    await waitFor(() => expect(nextButton.props.disabled).toStrictEqual(false));

    const textInput = getByTestId(
      AmountViewSelectorsIDs.TRANSACTION_AMOUNT_INPUT,
    );
    fireEvent.changeText(textInput, '1');

    const amountConversionValue = getByTestId(
      AmountViewSelectorsIDs.TRANSACTION_AMOUNT_CONVERSION_VALUE,
    );
    expect(amountConversionValue.props.children).toBe('$1.00');

    await act(() => fireEvent.press(nextButton));

    expect(queryByText('Insufficient funds')).not.toBeNull();

    expect(mockNavigate).toHaveBeenCalledTimes(0);

    expect(toJSON()).toMatchSnapshot();
  });

  it('converts ETH to USD', () => {
    const { getByTestId, toJSON } = renderComponent({
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          CurrencyRateController: {
            currentCurrency: 'usd',
            currencyRates: {
              ETH: {
                conversionRate: 3000,
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: CURRENT_ACCOUNT,
              accounts: {
                [CURRENT_ACCOUNT]: {
                  address: CURRENT_ACCOUNT,
                },
              },
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [CURRENT_ACCOUNT]: [
                  {
                    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
                    symbol: 'LINK',
                    decimals: 18,
                  },
                ],
              },
            },
          },
        },
      },
      transaction: {
        assetType: 'ETH',
        selectedAsset: {
          address: '',
          isETH: true,
          logo: '../images/eth-logo.png',
          name: 'Ether',
          symbol: 'ETH',
        },
        transaction: {
          from: CURRENT_ACCOUNT,
        },
        transactionFromName: 'Account 1',
        transactionTo: RECEIVER_ACCOUNT,
        transactionToName: 'Account 2',
      },
    });

    const textInput = getByTestId(
      AmountViewSelectorsIDs.TRANSACTION_AMOUNT_INPUT,
    );

    fireEvent.changeText(textInput, '1');

    const amountConversionValue = getByTestId(
      AmountViewSelectorsIDs.TRANSACTION_AMOUNT_CONVERSION_VALUE,
    );
    expect(amountConversionValue.props.children).toBe('$3000.00');
    expect(toJSON()).toMatchSnapshot();
  });

  it('converts ERC-20 token value to USD', () => {
    const { getByTestId, toJSON } = renderComponent({
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokenRatesController: {
            marketData: {
              '0xaa36a7': {
                '0x514910771AF9Ca656af840dff83E8264EcF986CA': { price: 0.005 },
              },
            },
          },
          CurrencyRateController: {
            currentCurrency: 'usd',
            currencyRates: {
              ETH: {
                conversionRate: 3000,
                usdConversionRate: 3000,
              },
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [CURRENT_ACCOUNT]: [
                  {
                    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
                    symbol: 'LINK',
                    decimals: 18,
                  },
                ],
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: CURRENT_ACCOUNT,
              accounts: {
                [CURRENT_ACCOUNT]: {
                  address: CURRENT_ACCOUNT,
                },
              },
            },
          },
        },
      },
      transaction: {
        assetType: 'ERC20',
        selectedAsset: {
          address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
          decimals: 18,
          isERC721: false,
          symbol: 'LINK',
        },
        transaction: {
          from: CURRENT_ACCOUNT,
        },
        transactionFromName: 'Account 1',
        transactionTo: RECEIVER_ACCOUNT,
        transactionToName: 'Account 2',
      },
    });

    const textInput = getByTestId(
      AmountViewSelectorsIDs.TRANSACTION_AMOUNT_INPUT,
    );

    fireEvent.changeText(textInput, '1');

    const amountConversionValue = getByTestId(
      AmountViewSelectorsIDs.TRANSACTION_AMOUNT_CONVERSION_VALUE,
    );
    expect(amountConversionValue.props.children).toBe('$15.00');
    expect(toJSON()).toMatchSnapshot();
  });

  it('converts USD to ETH', () => {
    const { getByTestId, toJSON } = renderComponent({
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          CurrencyRateController: {
            ...initialState.engine.backgroundState.CurrencyRateController,
            currentCurrency: 'usd',
            currencyRates: {
              ETH: {
                conversionRate: 3000,
                usdConversionRate: 3000,
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: CURRENT_ACCOUNT,
              accounts: {
                [CURRENT_ACCOUNT]: {
                  address: CURRENT_ACCOUNT,
                },
              },
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [CURRENT_ACCOUNT]: [],
              },
            },
          },
        },
      },
      settings: {
        ...initialState.settings,
        primaryCurrency: 'Fiat',
      },
      transaction: {
        assetType: 'ETH',
        selectedAsset: {
          address: '',
          isETH: true,
          logo: '../images/eth-logo.png',
          name: 'Ether',
          symbol: 'ETH',
        },
        transaction: {
          from: CURRENT_ACCOUNT,
        },
        transactionFromName: 'Account 1',
        transactionTo: RECEIVER_ACCOUNT,
        transactionToName: 'Account 2',
      },
    });

    const textInput = getByTestId(
      AmountViewSelectorsIDs.TRANSACTION_AMOUNT_INPUT,
    );

    fireEvent.changeText(textInput, '10');

    const amountConversionValue = getByTestId(
      AmountViewSelectorsIDs.TRANSACTION_AMOUNT_CONVERSION_VALUE,
    );
    expect(amountConversionValue.props.children).toBe('0.00333 ETH');
    expect(toJSON()).toMatchSnapshot();
  });

  it('converts USD to ERC-20 token value', () => {
    const { getByTestId, toJSON } = renderComponent({
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokenRatesController: {
            marketData: {
              '0xaa36a7': {
                '0x514910771AF9Ca656af840dff83E8264EcF986CA': { price: 0.005 },
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: CURRENT_ACCOUNT,
              accounts: {
                [CURRENT_ACCOUNT]: {
                  address: CURRENT_ACCOUNT,
                },
              },
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [CURRENT_ACCOUNT]: [
                  {
                    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
                    symbol: 'LINK',
                    decimals: 18,
                  },
                ],
              },
            },
          },
          CurrencyRateController: {
            currentCurrency: 'usd',
            currencyRates: {
              ETH: {
                conversionRate: 3000,
                usdConversionRate: 3000,
              },
            },
          },
        },
      },
      transaction: {
        assetType: 'ERC20',
        selectedAsset: {
          address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
          decimals: 18,
          isERC721: false,
          symbol: 'LINK',
        },
        transaction: {
          from: CURRENT_ACCOUNT,
        },
        transactionFromName: 'Account 1',
        transactionTo: RECEIVER_ACCOUNT,
        transactionToName: 'Account 2',
      },
      settings: {
        ...initialState.settings,
        primaryCurrency: 'Fiat',
      },
    });

    const textInput = getByTestId(
      AmountViewSelectorsIDs.TRANSACTION_AMOUNT_INPUT,
    );

    fireEvent.changeText(textInput, '10');

    const amountConversionValue = getByTestId(
      AmountViewSelectorsIDs.TRANSACTION_AMOUNT_CONVERSION_VALUE,
    );
    expect(amountConversionValue.props.children).toBe('0.66667 LINK');
    expect(toJSON()).toMatchSnapshot();
  });

  it('shows a warning when conversion rate is not available', () => {
    const { getByTestId, toJSON } = renderComponent({
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokenRatesController: {
            marketData: {},
          },
          AccountsController: {
            internalAccounts: {
              accounts: {
                [CURRENT_ACCOUNT]: {
                  address: CURRENT_ACCOUNT,
                },
              },
              selectedAccount: CURRENT_ACCOUNT,
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [CURRENT_ACCOUNT]: [
                  {
                    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
                    symbol: 'LINK',
                    decimals: 18,
                  },
                ],
              },
            },
          },
          CurrencyRateController: {},
        },
      },
      settings: {
        ...initialState.settings,
        primaryCurrency: 'Fiat',
      },
      transaction: {
        assetType: 'ERC20',
        selectedAsset: {
          address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
          decimals: 18,
          isERC721: false,
          symbol: 'LINK',
        },
        transaction: {
          from: CURRENT_ACCOUNT,
        },
        transactionFromName: 'Account 1',
        transactionTo: RECEIVER_ACCOUNT,
        transactionToName: 'Account 2',
      },
    });

    const fiatConversionWarningText = getByTestId(
      AmountViewSelectorsIDs.FIAT_CONVERSION_WARNING_TEXT,
    );
    expect(fiatConversionWarningText.props.children).toBe(
      'Fiat conversions are not available at this moment',
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('does not show a warning when conversion rate is available', async () => {
    const { getByTestId, toJSON } = renderComponent({
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokenRatesController: {
            marketData: {
              '0xaa36a7': {
                '0x514910771AF9Ca656af840dff83E8264EcF986CA': { price: 0.005 },
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              ...initialState.engine.backgroundState.AccountsController
                .internalAccounts,
              accounts: {
                ...initialState.engine.backgroundState.AccountsController
                  .internalAccounts.accounts,
                [CURRENT_ACCOUNT]: {
                  address: CURRENT_ACCOUNT,
                },
              },
              selectedAccount: CURRENT_ACCOUNT,
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [CURRENT_ACCOUNT]: [
                  {
                    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
                    symbol: 'LINK',
                    decimals: 18,
                  },
                ],
              },
            },
          },
          CurrencyRateController: {},
        },
      },
      settings: {
        ...initialState.settings,
        primaryCurrency: 'Fiat',
      },
      transaction: {
        assetType: 'ERC20',
        selectedAsset: {
          address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
          decimals: 18,
          isERC721: false,
          symbol: 'LINK',
        },
        transaction: {
          from: CURRENT_ACCOUNT,
        },
        transactionFromName: 'Account 1',
        transactionTo: RECEIVER_ACCOUNT,
        transactionToName: 'Account 2',
      },
    });

    try {
      await getByTestId(AmountViewSelectorsIDs.FIAT_CONVERSION_WARNING_TEXT);
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const expectedErrorMessage = `Unable to find an element with testID: ${AmountViewSelectorsIDs.FIAT_CONVERSION_WARNING_TEXT}`;
      const hasErrorMessage = error.message.includes(expectedErrorMessage);
      expect(hasErrorMessage).toBeTruthy();
    }
    expect(toJSON()).toMatchSnapshot();
  });

  it('does not show a warning when transfering collectibles', () => {
    const { getByTestId, toJSON } = renderComponent({
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokensController: {
            tokens: [],
            allTokens: {
              '0x1': {
                '0xAddress1': [],
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: '0xAddress1',
              accounts: {
                '0xAddress1': {
                  address: '0xAddress1',
                },
              },
            },
          },
          TokenRatesController: {
            marketData: {
              '0xaa36a7': {
                '0x514910771AF9Ca656af840dff83E8264EcF986CA': { price: 0.005 },
              },
            },
          },
          CurrencyRateController: {},
        },
      },
      settings: {
        primaryCurrency: 'Fiat',
      },
      transaction: {
        selectedAsset: {
          address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
          standard: 'ERC721',
          tokenId: '1850',
        },
        transaction: {
          from: CURRENT_ACCOUNT,
        },
        transactionFromName: 'Account 1',
        transactionTo: RECEIVER_ACCOUNT,
        transactionToName: 'Account 2',
      },
    });

    try {
      getByTestId(AmountViewSelectorsIDs.FIAT_CONVERSION_WARNING_TEXT);
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const expectedErrorMessage = `Unable to find an element with testID: ${AmountViewSelectorsIDs.FIAT_CONVERSION_WARNING_TEXT}`;
      const hasErrorMessage = error.message.includes(expectedErrorMessage);
      expect(hasErrorMessage).toBeTruthy();
    }
    expect(toJSON()).toMatchSnapshot();
  });

  it('adds transaction and redirects to redesigned transfer confirmation if flag is enabled', async () => {
    mockSelectConfirmationRedesignFlags.mockReturnValue({
      transfer: true,
    } as ReturnType<typeof selectConfirmationRedesignFlags>);

    const { getByTestId } = renderComponent({
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          CurrencyRateController: {
            currentCurrency: 'usd',
            currencyRates: {
              ETH: {
                conversionRate: 1,
              },
            },
          },
          AccountTrackerController: {
            accountsByChainId: {
              '0xaa36a7': {
                [CURRENT_ACCOUNT]: {
                  balance: '4563918244F40000',
                },
              },
            },
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: CURRENT_ACCOUNT,
              accounts: {
                [CURRENT_ACCOUNT]: {
                  address: CURRENT_ACCOUNT,
                },
              },
            },
          },
          TokensController: {
            allTokens: {
              '0x1': {
                [CURRENT_ACCOUNT]: [],
              },
            },
          },
        },
      },
      transaction: {
        assetType: 'ETH',
        selectedAsset: {
          address: '',
          isETH: true,
          logo: '../images/eth-logo.png',
          name: 'Ether',
          symbol: 'ETH',
        },
        transaction: {
          from: CURRENT_ACCOUNT,
          to: RECEIVER_ACCOUNT,
          value: '0xde0b6b3a7640000',
          data: '0x',
        },
        transactionFromName: 'Account 1',
        transactionTo: RECEIVER_ACCOUNT,
        transactionToName: 'Account 2',
      },
    });

    const nextButton = getByTestId(AmountViewSelectorsIDs.NEXT_BUTTON);
    await waitFor(() => expect(nextButton.props.disabled).toStrictEqual(false));

    const textInput = getByTestId(
      AmountViewSelectorsIDs.TRANSACTION_AMOUNT_INPUT,
    );
    fireEvent.changeText(textInput, '1');

    await act(() => fireEvent.press(nextButton));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('SendFlowView', {
      screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    });
    expect(addTransaction).toHaveBeenCalledTimes(1);
    expect(addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        from: CURRENT_ACCOUNT,
        to: RECEIVER_ACCOUNT,
        value: '0xde0b6b3a7640000',
        data: '0x',
      }),
      {
        origin: 'metamask',
        networkClientId: 'sepolia',
      },
    );
  });

  // Tests for isRemoveGlobalNetworkSelectorEnabled feature
  describe('isRemoveGlobalNetworkSelectorEnabled', () => {
    afterEach(() => {
      mockIsRemoveGlobalNetworkSelectorEnabled.mockReset();
    });

    describe('contextual network selector enabled', () => {
      beforeEach(() => {
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      });

      it('uses contextual chain data for tokens when flag is enabled', () => {
        const contextualChainId = '0xa86a';
        const contextualTokens = [
          {
            address: '0x123',
            symbol: 'AVAX',
            decimals: 18,
            name: 'Avalanche',
          },
        ];

        const stateWithContextualData = {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              TokensController: {
                allTokens: {
                  [contextualChainId]: {
                    [CURRENT_ACCOUNT.toLowerCase()]: contextualTokens,
                  },
                },
              },
              NetworkController: {
                ...initialState.engine.backgroundState.NetworkController,
                networkConfigurationsByChainId: {
                  [contextualChainId]: {
                    blockExplorerUrls: ['https://snowtrace.io'],
                    chainId: contextualChainId,
                    name: 'Avalanche',
                    nativeCurrency: 'AVAX',
                    defaultRpcEndpointIndex: 0,
                    rpcEndpoints: [
                      {
                        networkClientId: 'avalanche-mainnet',
                        type: 'Custom',
                        url: 'https://api.avax.network/ext/bc/C/rpc',
                      },
                    ],
                  },
                },
              },
            },
          },
          networkOnboarded: {
            ...initialState.networkOnboarded,
            sendFlowChainId: contextualChainId,
          },
        };

        renderComponent(stateWithContextualData);

        // Should show contextual network picker
        expect(mockIsRemoveGlobalNetworkSelectorEnabled).toHaveBeenCalled();
      });

      it('uses contextual account balances when flag is enabled', () => {
        const contextualChainId = '0xa86a';
        const contextualBalance = '0x1BC16D674EC80000'; // 2 ETH

        const stateWithContextualBalance = {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              AccountTrackerController: {
                ...initialState.engine.backgroundState.AccountTrackerController,
                accountsByChainId: {
                  '0xaa36a7': {
                    [CURRENT_ACCOUNT]: {
                      balance: '0x0',
                    },
                  },
                  [contextualChainId]: {
                    [CURRENT_ACCOUNT]: {
                      balance: contextualBalance,
                    },
                  },
                },
              },
              NetworkController: {
                ...initialState.engine.backgroundState.NetworkController,
                networkConfigurationsByChainId: {
                  '0xaa36a7': {
                    blockExplorerUrls: ['https://etherscan.com'],
                    chainId: '0xaa36a7',
                    defaultRpcEndpointIndex: 0,
                    name: 'Sepolia',
                    nativeCurrency: 'ETH',
                    rpcEndpoints: [
                      {
                        networkClientId: 'sepolia',
                        type: 'Custom',
                        url: 'http://localhost/v3/',
                      },
                    ],
                  },
                  [contextualChainId]: {
                    blockExplorerUrls: ['https://snowtrace.io'],
                    chainId: contextualChainId,
                    name: 'Avalanche',
                    nativeCurrency: 'AVAX',
                    defaultRpcEndpointIndex: 0,
                    rpcEndpoints: [
                      {
                        networkClientId: 'avalanche-mainnet',
                        type: 'Custom',
                        url: 'https://api.avax.network/ext/bc/C/rpc',
                      },
                    ],
                  },
                },
              },
            },
          },
          networkOnboarded: {
            ...initialState.networkOnboarded,
            sendFlowChainId: contextualChainId,
          },
          transaction: {
            ...initialState.transaction,
            selectedAsset: {
              address: '',
              isETH: false,
              isNative: true,
              symbol: 'AVAX',
            },
            transaction: {
              from: CURRENT_ACCOUNT,
              to: RECEIVER_ACCOUNT,
              value: '0x0',
              data: '0x',
            },
            transactionTo: RECEIVER_ACCOUNT,
          },
        };

        const { getByText } = renderComponent(stateWithContextualBalance);

        const balanceText = getByText(/Balance:/);
        expect(balanceText.props.children).toBe('Balance: 2 AVAX');
      });

      it('uses contextual token balances when flag is enabled', () => {
        const contextualChainId = '0xaa36a7'; // Use same format as global state
        const tokenAddress = '0x514910771AF9Ca656af840dff83E8264EcF986CA';
        const contextualTokenBalance = '0x1BC16D674EC80000'; // 2 LINK tokens

        const stateWithContextualTokenBalance = {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              AccountsController: {
                ...initialState.engine.backgroundState.AccountsController,
                internalAccounts: {
                  selectedAccount: CURRENT_ACCOUNT,
                  accounts: {
                    [CURRENT_ACCOUNT]: {
                      address: CURRENT_ACCOUNT,
                    },
                  },
                },
              },
              TokenBalancesController: {
                tokenBalances: {
                  [CURRENT_ACCOUNT.toLowerCase()]: {
                    [contextualChainId]: {
                      [tokenAddress]: contextualTokenBalance,
                    },
                  },
                },
              },
              TokensController: {
                allTokens: {
                  [contextualChainId]: {
                    [CURRENT_ACCOUNT.toLowerCase()]: [
                      {
                        address: tokenAddress,
                        symbol: 'LINK',
                        decimals: 18,
                      },
                    ],
                  },
                },
              },
            },
          },
          networkOnboarded: {
            ...initialState.networkOnboarded,
            sendFlowChainId: contextualChainId,
          },
          transaction: {
            ...initialState.transaction,
            selectedAsset: {
              address: tokenAddress,
              symbol: 'LINK',
              decimals: 18,
              isETH: false,
            },
            transaction: {
              from: CURRENT_ACCOUNT,
              to: RECEIVER_ACCOUNT,
              value: '0x0',
              data: '0x',
            },
            transactionTo: RECEIVER_ACCOUNT,
          },
        };

        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

        const { getByText } = renderComponent(stateWithContextualTokenBalance);

        const balanceText = getByText(/Balance:/);
        expect(balanceText.props.children).toBe(`Balance: 2 LINK`);
      });

      it('uses contextual exchange rates when flag is enabled', () => {
        const contextualChainId = '0xaa36a7';
        const tokenAddress = '0x514910771AF9Ca656af840dff83E8264EcF986CA';

        const stateWithContextualExchangeRate = {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              TokenRatesController: {
                marketData: {
                  [contextualChainId]: {
                    [tokenAddress]: { price: 10.5 },
                  },
                },
              },
              CurrencyRateController: {
                currentCurrency: 'usd',
                currencyRates: {
                  ETH: {
                    conversionRate: 1,
                  },
                },
              },
              AccountsController: {
                ...initialState.engine.backgroundState.AccountsController,
                internalAccounts: {
                  selectedAccount: CURRENT_ACCOUNT,
                  accounts: {
                    [CURRENT_ACCOUNT]: {
                      address: CURRENT_ACCOUNT,
                    },
                  },
                },
              },
            },
          },
          networkOnboarded: {
            ...initialState.networkOnboarded,
            sendFlowChainId: contextualChainId,
          },
          transaction: {
            ...initialState.transaction,
            selectedAsset: {
              address: tokenAddress,
              symbol: 'LINK',
              decimals: 18,
              isETH: false,
            },
            transaction: {
              from: CURRENT_ACCOUNT,
              to: RECEIVER_ACCOUNT,
              value: '0x0',
              data: '0x',
            },
            transactionTo: RECEIVER_ACCOUNT,
          },
        };

        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);

        const { getByTestId } = renderComponent(
          stateWithContextualExchangeRate,
        );

        // Set input value to trigger conversion calculation
        const amountInput = getByTestId(AmountViewSelectorsIDs.AMOUNT_INPUT);
        fireEvent.changeText(amountInput, '1');

        const amountConversionValue = getByTestId(
          AmountViewSelectorsIDs.TRANSACTION_AMOUNT_CONVERSION_VALUE,
        );
        expect(amountConversionValue.props.children).toBe('$10.50'); // 1 LINK * 10.5
      });

      it('shows ContextualNetworkPicker when flag is enabled', () => {
        const contextualChainId = '0xa86a';

        const stateWithContextualNetwork = {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              NetworkController: {
                ...initialState.engine.backgroundState.NetworkController,
                networkConfigurationsByChainId: {
                  [contextualChainId]: {
                    chainId: contextualChainId,
                    name: 'Avalanche',
                    nativeCurrency: 'AVAX',
                    defaultRpcEndpointIndex: 0,
                    rpcEndpoints: [
                      {
                        networkClientId: 'avalanche-mainnet',
                        type: 'Custom',
                        url: 'https://api.avax.network/ext/bc/C/rpc',
                      },
                    ],
                  },
                },
              },
            },
          },
          networkOnboarded: {
            ...initialState.networkOnboarded,
            sendFlowChainId: contextualChainId,
          },
          transaction: {
            ...initialState.transaction,
            transaction: {
              from: CURRENT_ACCOUNT,
              to: RECEIVER_ACCOUNT,
              value: '0x0',
              data: '0x',
            },
            transactionTo: RECEIVER_ACCOUNT,
          },
        };

        const { toJSON } = renderComponent(stateWithContextualNetwork);

        // Should render ContextualNetworkPicker component
        expect(mockIsRemoveGlobalNetworkSelectorEnabled).toHaveBeenCalled();
        expect(toJSON()).toMatchSnapshot();
      });

      it('uses contextual ticker for native asset display when flag is enabled', () => {
        const contextualChainId = '0xa86a';
        const contextualTicker = 'AVAX';

        const stateWithContextualTicker = {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              NetworkController: {
                networkConfigurationsByChainId: {
                  [contextualChainId]: {
                    chainId: contextualChainId,
                    name: 'Avalanche',
                    nativeCurrency: contextualTicker,
                    defaultRpcEndpointIndex: 0,
                    rpcEndpoints: [
                      {
                        networkClientId: 'avalanche-mainnet',
                        type: 'Custom',
                        url: 'https://api.avax.network/ext/bc/C/rpc',
                      },
                    ],
                  },
                },
              },
            },
          },
          networkOnboarded: {
            ...initialState.networkOnboarded,
            sendFlowChainId: contextualChainId,
          },
          transaction: {
            selectedAsset: {
              address: '',
              isETH: false,
              isNative: true,
              symbol: contextualTicker,
            },
            transaction: {
              from: CURRENT_ACCOUNT,
              to: RECEIVER_ACCOUNT,
              value: '0x0',
              data: '0x',
            },
            transactionTo: RECEIVER_ACCOUNT,
          },
        };

        const { getByText } = renderComponent(stateWithContextualTicker);

        const balanceText = getByText(/Balance:/);
        expect(balanceText.props.children).toBe(
          `Balance: 0 ${contextualTicker}`,
        );
      });

      it('validates amount against contextual balance when flag is enabled', async () => {
        const contextualChainId = '0xa86a';
        const lowBalance = '0x0'; // 0 ETH

        const stateWithLowContextualBalance = {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              AccountTrackerController: {
                accountsByChainId: {
                  [contextualChainId]: {
                    [CURRENT_ACCOUNT]: {
                      balance: lowBalance,
                    },
                  },
                },
              },
              NetworkController: {
                networkConfigurationsByChainId: {
                  [contextualChainId]: {
                    chainId: contextualChainId,
                    name: 'Avalanche',
                    nativeCurrency: 'AVAX',
                    defaultRpcEndpointIndex: 0,
                    rpcEndpoints: [
                      {
                        networkClientId: 'avalanche-mainnet',
                        type: 'Custom',
                        url: 'https://api.avax.network/ext/bc/C/rpc',
                      },
                    ],
                  },
                },
              },
            },
          },
          networkOnboarded: {
            ...initialState.networkOnboarded,
            sendFlowChainId: contextualChainId,
          },
          transaction: {
            selectedAsset: {
              address: '',
              isETH: true,
              symbol: 'ETH',
            },
            transaction: {
              from: CURRENT_ACCOUNT,
              to: RECEIVER_ACCOUNT,
              value: '0x0',
              data: '0x',
            },
            transactionTo: RECEIVER_ACCOUNT,
          },
        };

        const { getByTestId, queryByText } = renderComponent(
          stateWithLowContextualBalance,
        );

        const nextButton = getByTestId(AmountViewSelectorsIDs.NEXT_BUTTON);
        await waitFor(() => expect(nextButton.props.disabled).toBe(false));

        const textInput = getByTestId(
          AmountViewSelectorsIDs.TRANSACTION_AMOUNT_INPUT,
        );
        fireEvent.changeText(textInput, '1');

        await act(() => fireEvent.press(nextButton));

        expect(queryByText('Insufficient funds')).not.toBeNull();
      });

      it('uses contextual network for transaction submission when flag is enabled', async () => {
        mockSelectConfirmationRedesignFlags.mockReturnValue({
          transfer: true,
        } as ReturnType<typeof selectConfirmationRedesignFlags>);

        const contextualChainId = '0xa86a';
        const contextualNetworkClientId = 'avalanche-mainnet';

        const stateWithContextualNetwork = {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              AccountTrackerController: {
                accountsByChainId: {
                  [contextualChainId]: {
                    [CURRENT_ACCOUNT]: {
                      balance: '0x1BC16D674EC80000', // 2 ETH
                    },
                  },
                },
              },
              NetworkController: {
                networkConfigurationsByChainId: {
                  [contextualChainId]: {
                    chainId: contextualChainId,
                    name: 'Avalanche',
                    defaultRpcEndpointIndex: 0,
                    rpcEndpoints: [
                      {
                        networkClientId: contextualNetworkClientId,
                        type: 'Custom',
                        url: 'https://api.avax.network/ext/bc/C/rpc',
                      },
                    ],
                  },
                },
              },
            },
          },
          networkOnboarded: {
            ...initialState.networkOnboarded,
            sendFlowChainId: contextualChainId,
          },
          transaction: {
            selectedAsset: {
              address: '',
              isETH: true,
              symbol: 'AVAX',
            },
            transaction: {
              from: CURRENT_ACCOUNT,
              to: RECEIVER_ACCOUNT,
              value: '0xde0b6b3a7640000',
              data: '0x',
            },
            transactionTo: RECEIVER_ACCOUNT,
          },
        };

        const { getByTestId } = renderComponent(stateWithContextualNetwork);

        const nextButton = getByTestId(AmountViewSelectorsIDs.NEXT_BUTTON);
        await waitFor(() => expect(nextButton.props.disabled).toBe(false));

        const textInput = getByTestId(
          AmountViewSelectorsIDs.TRANSACTION_AMOUNT_INPUT,
        );
        fireEvent.changeText(textInput, '1');

        await act(() => fireEvent.press(nextButton));

        expect(addTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            from: CURRENT_ACCOUNT,
            to: RECEIVER_ACCOUNT,
          }),
          {
            origin: 'metamask',
            networkClientId: contextualNetworkClientId,
          },
        );
      });
    });

    describe('contextual network selector disabled (legacy behavior)', () => {
      beforeEach(() => {
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(false);
      });

      it('uses global chain data for tokens when flag is disabled', () => {
        const globalTokens = [
          {
            address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
            symbol: 'LINK',
            decimals: 18,
          },
        ];

        const stateWithGlobalData = {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              TokensController: {
                allTokens: {
                  '0xaa36a7': {
                    [CURRENT_ACCOUNT.toLowerCase()]: globalTokens,
                  },
                },
              },
            },
          },
          transaction: {
            ...initialState.transaction,
            transaction: {
              from: CURRENT_ACCOUNT,
              to: RECEIVER_ACCOUNT,
              value: '0x0',
              data: '0x',
            },
            transactionTo: RECEIVER_ACCOUNT,
          },
        };

        const { queryByTestId } = renderComponent(stateWithGlobalData);

        // Should not show contextual network picker
        expect(mockIsRemoveGlobalNetworkSelectorEnabled).toHaveBeenCalled();
        // ContextualNetworkPicker should not be rendered
        expect(queryByTestId('contextual-network-picker')).toBeNull();
      });

      it('uses global account balances when flag is disabled', () => {
        const globalBalance = '0x1BC16D674EC80000'; // 2 ETH

        const stateWithGlobalBalance = {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              AccountTrackerController: {
                accountsByChainId: {
                  '0xaa36a7': {
                    [CURRENT_ACCOUNT]: {
                      balance: globalBalance,
                    },
                  },
                },
              },
            },
          },
          transaction: {
            selectedAsset: {
              address: '',
              isETH: true,
              symbol: 'ETH',
            },
            transaction: {
              from: CURRENT_ACCOUNT,
              to: RECEIVER_ACCOUNT,
              value: '0x0',
              data: '0x',
            },
            transactionTo: RECEIVER_ACCOUNT,
          },
        };

        const { getByText } = renderComponent(stateWithGlobalBalance);

        const balanceText = getByText(/Balance:/);
        expect(balanceText.props.children).toBe('Balance: 2 ETH');
      });

      it('uses global exchange rates when flag is disabled', () => {
        const tokenAddress = '0x514910771AF9Ca656af840dff83E8264EcF986CA';

        const stateWithGlobalRates = {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              TokenRatesController: {
                marketData: {
                  '0xaa36a7': {
                    [tokenAddress]: { price: 15.0 }, // Global rate
                  },
                },
              },
              CurrencyRateController: {
                currentCurrency: 'usd',
                currencyRates: {
                  ETH: {
                    conversionRate: 2000,
                  },
                },
              },
            },
          },
          transaction: {
            selectedAsset: {
              address: tokenAddress,
              symbol: 'LINK',
              decimals: 18,
            },
            transaction: {
              from: CURRENT_ACCOUNT,
              to: RECEIVER_ACCOUNT,
              value: '0x0',
              data: '0x',
            },
            transactionTo: RECEIVER_ACCOUNT,
          },
        };

        const { getByTestId } = renderComponent(stateWithGlobalRates);

        const textInput = getByTestId(
          AmountViewSelectorsIDs.TRANSACTION_AMOUNT_INPUT,
        );
        fireEvent.changeText(textInput, '1');

        const amountConversionValue = getByTestId(
          AmountViewSelectorsIDs.TRANSACTION_AMOUNT_CONVERSION_VALUE,
        );
        expect(amountConversionValue.props.children).toBe('$30000.00'); // 1 LINK * 15.0 * 2000
      });

      it('uses global network client ID for transaction submission when flag is disabled', async () => {
        mockSelectConfirmationRedesignFlags.mockReturnValue({
          transfer: true,
        } as ReturnType<typeof selectConfirmationRedesignFlags>);

        const globalNetworkClientId = 'sepolia';

        const stateWithGlobalNetwork = {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              AccountTrackerController: {
                accountsByChainId: {
                  '0xaa36a7': {
                    [CURRENT_ACCOUNT]: {
                      balance: '0x1BC16D674EC80000', // 2 ETH
                    },
                  },
                },
              },
            },
          },
          transaction: {
            selectedAsset: {
              address: '',
              isETH: true,
              symbol: 'ETH',
            },
            transaction: {
              from: CURRENT_ACCOUNT,
              to: RECEIVER_ACCOUNT,
              value: '0xde0b6b3a7640000',
              data: '0x',
            },
            transactionTo: RECEIVER_ACCOUNT,
          },
        };

        const { getByTestId } = renderComponent(stateWithGlobalNetwork);

        const nextButton = getByTestId(AmountViewSelectorsIDs.NEXT_BUTTON);
        await waitFor(() => expect(nextButton.props.disabled).toBe(false));

        const textInput = getByTestId(
          AmountViewSelectorsIDs.TRANSACTION_AMOUNT_INPUT,
        );
        fireEvent.changeText(textInput, '1');

        await act(() => fireEvent.press(nextButton));

        expect(addTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            from: CURRENT_ACCOUNT,
            to: RECEIVER_ACCOUNT,
          }),
          {
            origin: 'metamask',
            networkClientId: globalNetworkClientId,
          },
        );
      });
    });

    describe('max value calculation with contextual data', () => {
      beforeEach(() => {
        mockIsRemoveGlobalNetworkSelectorEnabled.mockReturnValue(true);
      });

      it('calculates max value using contextual native balance when flag is enabled', async () => {
        const contextualChainId = '0xa86a';
        const contextualBalance = '0x4563918244F40000'; // 5 ETH

        const stateWithContextualBalance = {
          ...initialState,
          engine: {
            ...initialState.engine,
            backgroundState: {
              ...initialState.engine.backgroundState,
              AccountTrackerController: {
                accountsByChainId: {
                  [contextualChainId]: {
                    [CURRENT_ACCOUNT]: {
                      balance: contextualBalance,
                    },
                  },
                },
              },
              CurrencyRateController: {
                currentCurrency: 'usd',
                currencyRates: {
                  AVAX: {
                    conversionRate: 50,
                  },
                },
              },
              NetworkController: {
                networkConfigurationsByChainId: {
                  [contextualChainId]: {
                    chainId: contextualChainId,
                    name: 'Avalanche',
                    nativeCurrency: 'AVAX',
                    defaultRpcEndpointIndex: 0,
                    rpcEndpoints: [
                      {
                        networkClientId: 'avalanche-mainnet',
                        type: 'Custom',
                        url: 'https://api.avax.network/ext/bc/C/rpc',
                      },
                    ],
                  },
                },
              },
            },
          },
          networkOnboarded: {
            ...initialState.networkOnboarded,
            sendFlowChainId: contextualChainId,
          },
          settings: {
            primaryCurrency: 'Fiat',
          },
          transaction: {
            selectedAsset: {
              address: '',
              isETH: false,
              isNative: true,
              symbol: 'AVAX',
            },
            transaction: {
              from: CURRENT_ACCOUNT,
              to: RECEIVER_ACCOUNT,
              value: '0x0',
              data: '0x',
            },
            transactionTo: RECEIVER_ACCOUNT,
          },
        };

        const { getByText, getByTestId } = renderComponent(
          stateWithContextualBalance,
        );

        const nextButton = getByTestId(AmountViewSelectorsIDs.NEXT_BUTTON);
        await waitFor(() => expect(nextButton.props.disabled).toBe(false));

        const useMaxButton = getByText(/Use max/);
        await act(async () => {
          fireEvent.press(useMaxButton);
        });

        const amountInput = getByTestId(
          AmountViewSelectorsIDs.TRANSACTION_AMOUNT_INPUT,
        );

        // Should use contextual balance for max calculation
        expect(amountInput.props.value).toBeDefined();
        expect(typeof amountInput.props.value).toBe('string');
        // Value should be less than 250 (5 * 50) due to gas estimation
        expect(parseFloat(amountInput.props.value || '0')).toBeLessThanOrEqual(
          250,
        );
        expect(parseFloat(amountInput.props.value || '0')).toBeGreaterThan(0);
      });
    });
  });
});
