import React from 'react';

import initialBackgroundState from '../../../../../util/test/initial-background-state.json';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import EditGasFeeLegacyUpdate from '.';

const mockInitialState = (txnType = 'none') => ({
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      GasFeeController: {
        gasEstimateType: txnType,
      },
    },
  },
});

const selectedGasObjectForFeeMarket = {
  legacyGasLimit: undefined,
  suggestedMaxFeePerGas: '10',
};

const selectedGasObjectForLegacy = {
  legacyGasLimit: undefined,
  suggestedGasPrice: '3',
};

const sharedProps = {
  view: 'Transaction',
  analyticsParams: undefined,
  onSave: () => undefined,
  error: undefined,
  onCancel: () => undefined,
  onUpdatingValuesStart: () => undefined,
  onUpdatingValuesEnd: () => undefined,
  animateOnChange: undefined,
  isAnimating: true,
  hasDappSuggestedGas: false,
  warning: 'test',
  onlyGas: true,
};

const editGasFeeLegacyForFeeMarket = {
  ...sharedProps,
  selectedGasObject: selectedGasObjectForFeeMarket,
};

const editGasFeeLegacyForLegacy = {
  ...sharedProps,
  selectedGasObject: selectedGasObjectForLegacy,
};

describe('EditGasFeeLegacyUpdate', () => {
  it('should match snapshot', async () => {
    const initialState = mockInitialState();
    const container = renderWithProvider(
      <EditGasFeeLegacyUpdate {...editGasFeeLegacyForFeeMarket} />,
      { state: initialState },
    );
    expect(container).toMatchSnapshot();
  });

  it('should calculate the correct gas transaction fee for 1559 transaction', async () => {
    const initialState = mockInitialState('fee-market');
    const { findByText } = renderWithProvider(
      <EditGasFeeLegacyUpdate {...editGasFeeLegacyForFeeMarket} />,
      { state: initialState },
    );

    expect(await findByText('~ 0.00021 ETH')).toBeDefined();
  });

  it('should calculate the correct gas transaction fee for legacy transaction', async () => {
    const initialState = mockInitialState('legacy');
    const { findByText } = renderWithProvider(
      <EditGasFeeLegacyUpdate {...editGasFeeLegacyForLegacy} />,
      { state: initialState },
    );

    expect(await findByText('~ 0.00006 ETH')).toBeDefined();
  });
});
