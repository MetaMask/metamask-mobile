import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import { noop } from 'lodash';

import { feeMarketEstimates } from '../../../../../mock-data/gas-fee-controller-mock';
import { useGasFeeEstimates } from '../../../../../hooks/gas/useGasFeeEstimates';
import { MaxBaseFeeInput } from './max-base-fee-input';

jest.mock('../../../../../hooks/gas/useGasFeeEstimates');
jest.mock(
  '../../../../../hooks/transactions/useTransactionMetadataRequest',
  () => {
    const { simpleSendTransaction } = jest.requireActual(
      '../../../../../mock-data/transaction-controller-mock',
    );
    return {
      useTransactionMetadataRequest: jest.fn(() => simpleSendTransaction),
    };
  },
);

describe('MaxBaseFeeInput', () => {
  const mockUseGasFeeEstimates = jest.mocked(useGasFeeEstimates);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: feeMarketEstimates as GasFeeEstimates,
    });
  });

  it('renders the max base fee title and input', () => {
    const { getByText, getByTestId } = render(
      <MaxBaseFeeInput onChange={noop} />,
    );

    expect(getByText('Max Base Fee (GWEI)')).toBeOnTheScreen();
    expect(getByTestId('max-base-fee-input')).toBeOnTheScreen();
    expect(getByTestId('max-base-fee-input')).toHaveProp('value', '0.0135');
  });

  it('renders the estimated base fee and historical base fee range', () => {
    const { getByText } = render(<MaxBaseFeeInput onChange={noop} />);

    expect(getByText('Current: 0.01 GWEI')).toBeOnTheScreen();
    expect(getByText('12 hr: 0.01 - 0.01 GWEI')).toBeOnTheScreen();
  });

  it('calls onChange when input value changes', () => {
    const mockOnChange = jest.fn();
    const { getByTestId } = render(<MaxBaseFeeInput onChange={mockOnChange} />);

    const input = getByTestId('max-base-fee-input');
    fireEvent.changeText(input, '0.03');

    expect(mockOnChange).toHaveBeenCalledWith('0x1c9c380');
  });

  it('does not render the info container if the fee info does not exist', () => {
    mockUseGasFeeEstimates.mockReturnValue({
      gasFeeEstimates: {
        ...feeMarketEstimates,
        estimatedBaseFee: null,
        historicalBaseFeeRange: null,
      } as unknown as GasFeeEstimates,
    });

    const { queryByTestId } = render(<MaxBaseFeeInput onChange={noop} />);

    expect(queryByTestId('info-container')).toBeNull();
  });
});
