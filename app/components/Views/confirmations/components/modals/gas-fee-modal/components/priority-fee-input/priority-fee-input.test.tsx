import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import { noop } from 'lodash';

import renderWithProvider from '../../../../../../../../util/test/renderWithProvider';
import { transferTransactionStateMock } from '../../../../../mock-data/transfer-transaction-mock';
import { feeMarketEstimates } from '../../../../../mock-data/gas-fee-controller-mock';
import { useGasFeeEstimates } from '../../../../../hooks/gas/useGasFeeEstimates';
import { PriorityFeeInput } from './priority-fee-input';

jest.mock('../../../../../hooks/gas/useGasFeeEstimates');
jest.mock('../../../../../../../../core/Engine', () => ({
  context: {
    TokenListController: {
      fetchTokenList: jest.fn(),
    },
  },
}));

describe('PriorityFeeInput', () => {
  const mockUseGasFeeEstimates = jest.mocked(useGasFeeEstimates);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: feeMarketEstimates as GasFeeEstimates,
    });
  });

  it('renders the priority fee title and input', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <PriorityFeeInput onChange={noop} />,
      {
        state: transferTransactionStateMock,
      },
    );

    expect(getByText('Priority Fee (GWEI)')).toBeOnTheScreen();
    expect(getByTestId('priority-fee-input')).toBeOnTheScreen();
    expect(getByTestId('priority-fee-input')).toHaveProp(
      'value',
      '0.000074565',
    );
  });

  it('renders the current priority fee and historical priority fee range', () => {
    const { getByText } = renderWithProvider(
      <PriorityFeeInput onChange={noop} />,
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
      <PriorityFeeInput onChange={mockOnChange} />,
      {
        state: transferTransactionStateMock,
      },
    );

    const input = getByTestId('priority-fee-input');
    fireEvent.changeText(input, '0.03');

    expect(mockOnChange).toHaveBeenCalledWith('0x1c9c380');
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
      <PriorityFeeInput onChange={noop} />,
      {
        state: transferTransactionStateMock,
      },
    );

    expect(queryByTestId('info-container')).toBeNull();
  });
});
