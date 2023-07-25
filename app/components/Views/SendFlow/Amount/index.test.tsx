import React from 'react';
import Amount from './';
// eslint-disable-next-line @typescript-eslint/no-shadow
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Engine from '../../../../core/Engine';
import TransactionTypes from '../../../../core/TransactionTypes';
import {
  FIAT_CONVERSION_WARNING_TEXT,
  NEXT_BUTTON,
  TRANSACTION_AMOUNT_CONVERSION_VALUE,
  TRANSACTION_AMOUNT_INPUT,
} from '../../../../../wdio/screen-objects/testIDs/Screens/AmountScreen.testIds.js';

const mockEngine = Engine;
const mockTransactionTypes = TransactionTypes;

jest.mock('../../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
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

const mockNavigate = jest.fn();

const CURRENT_ACCOUNT = '0x1a';
const RECEIVER_ACCOUNT = '0x2a';

const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        network: '1',
        providerConfig: {
          ticker: 'ETH',
          type: 'mainnet',
          chainId: '1',
        },
      },
      AccountTrackerController: {
        accounts: { [CURRENT_ACCOUNT]: { balance: '0' } },
      },
      PreferencesController: {
        selectedAddress: CURRENT_ACCOUNT,
        identities: {
          [CURRENT_ACCOUNT]: {
            address: CURRENT_ACCOUNT,
            name: 'Account 1',
          },
        },
      },
      TokensController: {
        tokens: [],
      },
      NftController: {
        allNfts: { [CURRENT_ACCOUNT]: { '1': [] } },
        allNftContracts: { [CURRENT_ACCOUNT]: { '1': [] } },
      },
      TokenRatesController: {
        contractExchangeRates: {},
      },
      CurrencyRateController: {},
      TokenBalancesController: {
        contractBalances: {},
      },
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

const Stack = createStackNavigator();

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
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          CurrencyRateController: {
            conversionRate: 1,
            currentCurrency: 'usd',
            nativeCurrency: 'ETH',
          },
          AccountTrackerController: {
            accounts: {
              [CURRENT_ACCOUNT]: {
                balance: 'DE0B6B3A7640000',
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

  it('should proceed if balance is sufficient while on Native primary currency', async () => {
    const { getByText, getByTestId, toJSON } = renderComponent({
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          CurrencyRateController: {
            conversionRate: 1,
            currentCurrency: 'usd',
            nativeCurrency: 'ETH',
          },
          AccountTrackerController: {
            accounts: {
              [CURRENT_ACCOUNT]: {
                balance: '4563918244F40000',
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

    const nextButton = getByTestId(NEXT_BUTTON);
    await waitFor(() => expect(nextButton.props.disabled).toStrictEqual(false));

    const textInput = getByTestId(TRANSACTION_AMOUNT_INPUT);
    fireEvent.changeText(textInput, '1');

    const amountConversionValue = getByTestId(
      TRANSACTION_AMOUNT_CONVERSION_VALUE,
    );
    expect(amountConversionValue.props.children).toBe('$1.00');

    await act(() => fireEvent.press(nextButton));

    expect(mockNavigate).toHaveBeenCalledTimes(1);

    expect(toJSON()).toMatchSnapshot();
  });

  it('should show an error message if balance is insufficient', async () => {
    const { getByText, getByTestId, queryByText, toJSON } = renderComponent({
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          CurrencyRateController: {
            conversionRate: 1,
            currentCurrency: 'usd',
            nativeCurrency: 'ETH',
          },
          AccountTrackerController: {
            accounts: {
              [CURRENT_ACCOUNT]: {
                balance: '0x0',
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

    const nextButton = getByTestId(NEXT_BUTTON);
    await waitFor(() => expect(nextButton.props.disabled).toStrictEqual(false));

    const textInput = getByTestId(TRANSACTION_AMOUNT_INPUT);
    fireEvent.changeText(textInput, '1');

    const amountConversionValue = getByTestId(
      TRANSACTION_AMOUNT_CONVERSION_VALUE,
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
            conversionRate: 3000,
            currentCurrency: 'usd',
            nativeCurrency: 'ETH',
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

    const textInput = getByTestId(TRANSACTION_AMOUNT_INPUT);

    fireEvent.changeText(textInput, '1');

    const amountConversionValue = getByTestId(
      TRANSACTION_AMOUNT_CONVERSION_VALUE,
    );
    expect(amountConversionValue.props.children).toBe('$3000.00');
    expect(toJSON()).toMatchSnapshot();
  });

  it('should convert ERC-20 token value to USD', () => {
    const { getByTestId, toJSON } = renderComponent({
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokenRatesController: {
            contractExchangeRates: {
              '0x514910771AF9Ca656af840dff83E8264EcF986CA': 0.005,
            },
          },
          CurrencyRateController: {
            conversionRate: 3000,
            currentCurrency: 'usd',
            nativeCurrency: 'ETH',
            usdConversionRate: 3000,
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

    const textInput = getByTestId(TRANSACTION_AMOUNT_INPUT);

    fireEvent.changeText(textInput, '1');

    const amountConversionValue = getByTestId(
      TRANSACTION_AMOUNT_CONVERSION_VALUE,
    );
    expect(amountConversionValue.props.children).toBe('$15.00');
    expect(toJSON()).toMatchSnapshot();
  });

  it('should convert USD to ETH', () => {
    const { getByTestId, toJSON } = renderComponent({
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          CurrencyRateController: {
            ...initialState.engine.backgroundState.CurrencyRateController,
            conversionRate: 3000,
            currentCurrency: 'usd',
            nativeCurrency: 'ETH',
            usdConversionRate: 3000,
          },
        },
      },
      settings: {
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

    const textInput = getByTestId(TRANSACTION_AMOUNT_INPUT);

    fireEvent.changeText(textInput, '10');

    const amountConversionValue = getByTestId(
      TRANSACTION_AMOUNT_CONVERSION_VALUE,
    );
    expect(amountConversionValue.props.children).toBe('0.00333 ETH');
    expect(toJSON()).toMatchSnapshot();
  });

  it('should convert USD to ERC-20 token value', () => {
    const { getByTestId, toJSON } = renderComponent({
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokenRatesController: {
            contractExchangeRates: {
              '0x514910771AF9Ca656af840dff83E8264EcF986CA': 0.005,
            },
          },
          CurrencyRateController: {
            conversionRate: 3000,
            currentCurrency: 'usd',
            nativeCurrency: 'ETH',
            usdConversionRate: 3000,
          },
        },
      },
      settings: {
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

    const textInput = getByTestId(TRANSACTION_AMOUNT_INPUT);

    fireEvent.changeText(textInput, '10');

    const amountConversionValue = getByTestId(
      TRANSACTION_AMOUNT_CONVERSION_VALUE,
    );
    expect(amountConversionValue.props.children).toBe('0.66667 LINK');
    expect(toJSON()).toMatchSnapshot();
  });

  it('should show a warning when conversion rate is not available', () => {
    const { getByTestId, toJSON } = renderComponent({
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokenRatesController: {
            contractExchangeRates: {},
          },
          CurrencyRateController: {},
        },
      },
      settings: {
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

    const fiatConversionWarningText = getByTestId(FIAT_CONVERSION_WARNING_TEXT);
    expect(fiatConversionWarningText.props.children).toBe(
      'Fiat conversions are not available at this moment',
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should not show a warning when conversion rate is available', async () => {
    const { getByTestId, toJSON } = renderComponent({
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokenRatesController: {
            contractExchangeRates: {
              '0x514910771AF9Ca656af840dff83E8264EcF986CA': 0.005,
            },
          },
          CurrencyRateController: {},
        },
      },
      settings: {
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
      await getByTestId(FIAT_CONVERSION_WARNING_TEXT);
    } catch (error: any) {
      const expectedErrorMessage = `Unable to find an element with testID: ${FIAT_CONVERSION_WARNING_TEXT}`;
      const hasErrorMessage = error.message.includes(expectedErrorMessage);
      expect(hasErrorMessage).toBeTruthy();
    }
    expect(toJSON()).toMatchSnapshot();
  });

  it('should not show a warning when transfering collectibles', () => {
    const { getByTestId, toJSON } = renderComponent({
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokenRatesController: {
            contractExchangeRates: {},
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
      getByTestId(FIAT_CONVERSION_WARNING_TEXT);
    } catch (error: any) {
      const expectedErrorMessage = `Unable to find an element with testID: ${FIAT_CONVERSION_WARNING_TEXT}`;
      const hasErrorMessage = error.message.includes(expectedErrorMessage);
      expect(hasErrorMessage).toBeTruthy();
    }
    expect(toJSON()).toMatchSnapshot();
  });
});
