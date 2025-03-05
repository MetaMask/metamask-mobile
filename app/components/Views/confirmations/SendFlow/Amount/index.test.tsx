import React from 'react';
import Amount from '.';
// eslint-disable-next-line @typescript-eslint/no-shadow
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TransactionTypes from '../../../../../core/TransactionTypes';

import { AmountViewSelectorsIDs } from '../../../../../../e2e/selectors/SendFlow/AmountView.selectors';

import { backgroundState } from '../../../../../util/test/initial-root-state';
import { setMaxValueMode } from '../../../../../actions/transaction';

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

jest.mock('../../../../../core/Engine', () => ({
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

jest.mock('../../../../../util/transaction-controller', () => ({
  __esModule: true,
  estimateGas: jest.fn(() =>
    Promise.resolve({
      gas: mockTransactionTypes.CUSTOM_GAS.DEFAULT_GAS_LIMIT,
    }),
  ),
}));

jest.mock('../../../../../actions/transaction', () => ({
  ...jest.requireActual('../../../../../actions/transaction'),
  setMaxValueMode: jest.fn().mockReturnValue({
    type: 'SET_MAX_VALUE_MODE',
  }),
}));

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
        accounts: { [CURRENT_ACCOUNT]: { balance: '0' } },
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
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('should render correctly', () => {
    const { toJSON } = renderComponent(initialState);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should display correct balance', () => {
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
            accounts: {
              [CURRENT_ACCOUNT]: {
                balance: 'DE0B6B3A7640000',
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

  it('should set max value mode when toggled on', () => {
    const { getByText } = renderComponent(initialState);

    const useMaxButton = getByText(/Use max/);
    fireEvent.press(useMaxButton);

    expect(setMaxValueMode).toHaveBeenCalled();
  });

  it('should proceed if balance is sufficient while on Native primary currency is ETH', async () => {
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
            accounts: {
              [CURRENT_ACCOUNT]: {
                balance: '4563918244F40000',
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

  it('should proceed if balance is sufficient while on Native primary currency is not ETH', async () => {
    //  {"address": "0x0000000000000000000000000000000000000000", "aggregators": [], "balance": "0.2059", "balanceFiat": "$5.74", "chainId": "0xa86a", "decimals": 18, "image": "", "isETH": false, "isNative": true, "isStaked": false, "logo": "", "name": "AVAX", "stakedBalance": "0x0", "symbol": "AVAX", "ticker": "AVAX", "tokenFiatAmount": 5.746669}}

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
            accounts: {
              [CURRENT_ACCOUNT]: {
                balance: '4563918244F40000',
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

  it('should show an error message if balance is insufficient', async () => {
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
            accounts: {
              [CURRENT_ACCOUNT]: {
                balance: '0x0',
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

  it('should convert ETH to USD', () => {
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

  it('should convert ERC-20 token value to USD', () => {
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

  it('should convert USD to ETH', () => {
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

  it('should convert USD to ERC-20 token value', () => {
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
        primaryCurrency: 'Fiat'
      }
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

  it('should show a warning when conversion rate is not available', () => {
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

  it('should not show a warning when conversion rate is available', async () => {
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

  it('should not show a warning when transfering collectibles', () => {
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
});
