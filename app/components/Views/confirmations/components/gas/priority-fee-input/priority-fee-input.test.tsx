import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import { noop } from 'lodash';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { transferTransactionStateMock } from '../../../__mocks__/transfer-transaction-mock';
import { feeMarketEstimates } from '../../../__mocks__/controllers/gas-fee-controller-mock';
import { useGasFeeEstimates } from '../../../hooks/gas/useGasFeeEstimates';
import { validatePriorityFee } from '../../../utils/validations/gas';
import { PriorityFeeInput } from './priority-fee-input';

jest.mock('../../../hooks/gas/useGasFeeEstimates');

jest.mock('../../../utils/validations/gas', () => ({
  validatePriorityFee: jest.fn(),
}));

jest.mock('../../../utils/validations/gas', () => ({
  validatePriorityFee: jest.fn(),
}));

describe('PriorityFeeInput', () => {
  const mockUseGasFeeEstimates = jest.mocked(useGasFeeEstimates);
  const MAX_PRIO_FEE_PER_GAS_MOCK = '0x1c9c380';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: feeMarketEstimates as GasFeeEstimates,
    });
  });

  it('renders the priority fee title and input', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <PriorityFeeInput
        maxFeePerGas={MAX_PRIO_FEE_PER_GAS_MOCK}
        onChange={noop}
        onErrorChange={noop}
      />,
      {
        state: transferTransactionStateMock,
      },
    );

    expect(getByText('Priority fee')).toBeOnTheScreen();
    expect(getByTestId('priority-fee-input')).toBeOnTheScreen();
    expect(getByTestId('priority-fee-input')).toHaveProp(
      'value',
      '0.000074565',
    );
  });

  it('renders the current priority fee and historical priority fee range', () => {
    const { getByText } = renderWithProvider(
      <PriorityFeeInput
        maxFeePerGas={MAX_PRIO_FEE_PER_GAS_MOCK}
        onChange={noop}
        onErrorChange={noop}
      />,
      {
        state: transferTransactionStateMock,
      },
    );

    expect(getByText('Current: 0.01 - 0.01 GWEI')).toBeOnTheScreen();
    expect(getByText('12 hr: 0.01 - 0.01 GWEI')).toBeOnTheScreen();
  });

  it('calls onChange when input value changes', () => {
    const mockOnChange = jest.fn();
    const { getByTestId } = renderWithProvider(
      <PriorityFeeInput
        maxFeePerGas={MAX_PRIO_FEE_PER_GAS_MOCK}
        onChange={mockOnChange}
        onErrorChange={noop}
      />,
      {
        state: transferTransactionStateMock,
      },
    );

    const input = getByTestId('priority-fee-input');
    fireEvent.changeText(input, '0.03');

    expect(mockOnChange).toHaveBeenCalledWith('0x1c9c380');
    expect(validatePriorityFee).toHaveBeenCalledWith('0.03', '0.03');
  });

  it('does not render the info container if the fee info does not exist', () => {
    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: {
        ...feeMarketEstimates,
        latestPriorityFeeRange: null,
        historicalPriorityFeeRange: null,
      } as unknown as GasFeeEstimates,
    });

    const { queryByTestId } = renderWithProvider(
      <PriorityFeeInput
        maxFeePerGas={MAX_PRIO_FEE_PER_GAS_MOCK}
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
