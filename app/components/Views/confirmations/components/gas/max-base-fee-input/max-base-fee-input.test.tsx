import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import { noop } from 'lodash';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { transferTransactionStateMock } from '../../../__mocks__/transfer-transaction-mock';
import { feeMarketEstimates } from '../../../__mocks__/controllers/gas-fee-controller-mock';
import { useGasFeeEstimates } from '../../../hooks/gas/useGasFeeEstimates';
import { validateMaxBaseFee } from '../../../utils/validations/gas';
import { MaxBaseFeeInput } from './max-base-fee-input';

jest.mock('../../../hooks/gas/useGasFeeEstimates');

jest.mock('../../../utils/validations/gas', () => ({
  validateMaxBaseFee: jest.fn(),
}));

describe('MaxBaseFeeInput', () => {
  const mockUseGasFeeEstimates = jest.mocked(useGasFeeEstimates);
  const MAX_PRIO_FEE_PER_GAS_MOCK = '0x1c9c380';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: feeMarketEstimates as GasFeeEstimates,
    });
  });

  it('renders the max base fee title and input', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <MaxBaseFeeInput
        maxPriorityFeePerGas={MAX_PRIO_FEE_PER_GAS_MOCK}
        onChange={noop}
        onErrorChange={noop}
      />,
      {
        state: transferTransactionStateMock,
      },
    );

    expect(getByText('Max Base Fee')).toBeOnTheScreen();
    expect(getByTestId('max-base-fee-input')).toBeOnTheScreen();
    expect(getByTestId('max-base-fee-input')).toHaveProp('value', '0.0135');
  });

  it('renders the estimated base fee and historical base fee range', () => {
    const { getByText } = renderWithProvider(
      <MaxBaseFeeInput
        maxPriorityFeePerGas={MAX_PRIO_FEE_PER_GAS_MOCK}
        onChange={noop}
        onErrorChange={noop}
      />,
      {
        state: transferTransactionStateMock,
      },
    );

    expect(getByText('Current: 0.01 GWEI')).toBeOnTheScreen();
    expect(getByText('12 hr: 0.01 - 0.01 GWEI')).toBeOnTheScreen();
  });

  it('calls onChange when input value changes', () => {
    const mockOnChange = jest.fn();
    const { getByTestId } = renderWithProvider(
      <MaxBaseFeeInput
        maxPriorityFeePerGas={MAX_PRIO_FEE_PER_GAS_MOCK}
        onChange={mockOnChange}
        onErrorChange={noop}
      />,
      {
        state: transferTransactionStateMock,
      },
    );

    const input = getByTestId('max-base-fee-input');
    fireEvent.changeText(input, '0.03');

    expect(mockOnChange).toHaveBeenCalledWith('0x1c9c380');
    expect(validateMaxBaseFee).toHaveBeenCalledWith('0.03', '0.03');
  });

  it('does not render the info container if the fee info does not exist', () => {
    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: {
        ...feeMarketEstimates,
        estimatedBaseFee: null,
        historicalBaseFeeRange: null,
      } as unknown as GasFeeEstimates,
    });

    const { queryByTestId } = renderWithProvider(
      <MaxBaseFeeInput
        maxPriorityFeePerGas={MAX_PRIO_FEE_PER_GAS_MOCK}
        onChange={noop}
        onErrorChange={noop}
      />,
      {
        state: transferTransactionStateMock,
      },
    );

    expect(queryByTestId('info-container')).toBeNull();
  });
});
