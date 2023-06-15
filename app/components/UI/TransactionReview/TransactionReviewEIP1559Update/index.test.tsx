import React from 'react';

import renderWithProvider, {
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import TransactionReviewEIP1559 from './';

const initialState = {
  settings: {},
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: {
          '0x0': {
            balance: 200,
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
        contractExchangeRates: {
          '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95': 1,
        },
      },
      TokenBalancesController: {
        contractBalances: {
          '0x326836cc6cd09B5aa59B81A7F72F25FcC0136b95': '0x5',
        },
      },
      CurrencyRateController: {
        conversionRate: 10,
        currentCurrency: 'usd',
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
