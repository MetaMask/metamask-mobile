import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { noop } from 'lodash';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { transferTransactionStateMock } from '../../../__mocks__/transfer-transaction-mock';
import { validateGasPrice } from '../../../utils/validations/gas';
import { GasPriceInput } from './gas-price-input';

jest.mock('../../../utils/validations/gas', () => ({
  validateGasPrice: jest.fn(),
}));

describe('GasPriceInput', () => {
  it('renders the gas price title and input', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <GasPriceInput onChange={noop} onErrorChange={noop} />,
      {
        state: transferTransactionStateMock,
      },
    );

    expect(getByText('Gas price')).toBeOnTheScreen();
    expect(getByTestId('gas-price-input')).toBeOnTheScreen();
    expect(getByTestId('gas-price-input')).toHaveProp('value', '0');
  });

  it('calls onChange when input value changes', () => {
    const mockOnChange = jest.fn();
    const { getByTestId } = renderWithProvider(
      <GasPriceInput onChange={mockOnChange} onErrorChange={noop} />,
      {
        state: transferTransactionStateMock,
      },
    );

    const input = getByTestId('gas-price-input');
    fireEvent.changeText(input, '30000');

    expect(mockOnChange).toHaveBeenCalledWith('0x1b48eb57e000');
    expect(validateGasPrice).toHaveBeenCalledWith('30000');
  });
});
