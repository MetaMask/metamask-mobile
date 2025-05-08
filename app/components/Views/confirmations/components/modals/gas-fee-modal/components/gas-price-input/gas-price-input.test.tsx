import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { noop } from 'lodash';

import { GasPriceInput } from './gas-price-input';

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

describe('GasPriceInput', () => {
  it('renders the gas price title and input', () => {
    const { getByText, getByTestId } = render(
      <GasPriceInput onChange={noop} />,
    );

    expect(getByText('Gas price (GWEI)')).toBeOnTheScreen();
    expect(getByTestId('gas-price-input')).toBeOnTheScreen();
    expect(getByTestId('gas-price-input')).toHaveProp('value', '0');
  });

  it('calls onChange when input value changes', () => {
    const mockOnChange = jest.fn();
    const { getByTestId } = render(<GasPriceInput onChange={mockOnChange} />);

    const input = getByTestId('gas-price-input');
    fireEvent.changeText(input, '30000');

    expect(mockOnChange).toHaveBeenCalledWith('0x1b48eb57e000');
  });
});
