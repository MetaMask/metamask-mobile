import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { noop } from 'lodash';

import { GasLimitInput } from './gas-limit-input';

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

describe('GasLimitInput', () => {
  it('renders the gas limit title and input', () => {
    const { getByText, getByTestId } = render(
      <GasLimitInput onChange={noop} />,
    );

    expect(getByText('Gas limit')).toBeOnTheScreen();
    expect(getByTestId('gas-limit-input')).toBeOnTheScreen();
    expect(getByTestId('gas-limit-input')).toHaveProp('value', '26190');
  });

  it('calls onChange when input value changes', () => {
    const mockOnChange = jest.fn();
    const { getByTestId } = render(<GasLimitInput onChange={mockOnChange} />);

    const input = getByTestId('gas-limit-input');
    fireEvent.changeText(input, '30000');

    expect(mockOnChange).toHaveBeenCalledWith('0x7530');
  });
});
