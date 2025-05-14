import React from 'react';
import TransactionReviewEIP1559 from '.';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import renderWithProvider, {
  renderHookWithProvider,
} from '../../../../../../../util/test/renderWithProvider';

const initialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            '0x0': {
              balance: '200',
            },
          },
        },
      },
      GasFeeController: {
        gasFeeEstimates: {
          low: '0x0',
          medium: '0x0',
          high: '0x0',
        },
        gasEstimateType: 'low',
      },
      TokenRatesController: {
        marketData: {
          '0x1': {
            '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95': 1,
          },
        },
      },
      TokenBalancesController: {
        tokenBalances: {},
      },
      CurrencyRateController: {
        currentCurrency: 'usd',
        currencyRates: {
          ETH: {
            conversionRate: 10,
          },
        },
      },
    },
  },
};

const transactionReview = {
  primaryCurrency: 'USD',
  chainId: '1',
  onEdit: () => undefined,
  hideTotal: false,
  noMargin: false,
  origin: '',
  originWarning: '',
  onUpdatingValuesStart: () => undefined,
  onUpdatingValuesEnd: () => undefined,
  animateOnChange: false,
  isAnimating: false,
  gasEstimationReady: false,
  legacy: false,
  gasSelected: '',
  gasObject: {
    suggestedMaxFeePerGas: '',
    suggestedMaxPriorityFeePerGas: '',
  },
  gasObjectLegacy: {},
  updateTransactionState: undefined,
  onlyGas: false,
};

describe('TransactionReviewEIP1559', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(
      <TransactionReviewEIP1559 {...transactionReview} />,
      { state: initialState },
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('should call gasTransaction if gasEstimationReady is true', () => {
    const updateTransactionStateMock = jest.fn();

    renderHookWithProvider(
      () =>
        TransactionReviewEIP1559({
          ...transactionReview,
          gasEstimationReady: true,
          updateTransactionState: updateTransactionStateMock,
        }),
      {
        state: initialState,
      },
    );

    expect(updateTransactionStateMock).toHaveBeenCalled();
  });
});
