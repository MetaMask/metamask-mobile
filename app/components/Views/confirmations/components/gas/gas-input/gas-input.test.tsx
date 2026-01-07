import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { noop } from 'lodash';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { transferTransactionStateMock } from '../../../__mocks__/transfer-transaction-mock';
import { validateGas } from '../../../utils/validations/gas';
import { GasInput } from './gas-input';

jest.mock('../../../utils/validations/gas', () => ({
  validateGas: jest.fn(),
}));

describe('GasInput', () => {
  it('renders the gas title and input', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <GasInput onChange={noop} onErrorChange={noop} />,
      {
        state: transferTransactionStateMock,
      },
    );

    expect(getByText('Gas limit')).toBeOnTheScreen();
    expect(getByTestId('gas-input')).toBeOnTheScreen();
    expect(getByTestId('gas-input')).toHaveProp('value', '26190');
  });

  it('calls onChange when input value changes', () => {
    const mockOnChange = jest.fn();
    const { getByTestId } = renderWithProvider(
      <GasInput onChange={mockOnChange} onErrorChange={noop} />,
      {
        state: transferTransactionStateMock,
      },
    );

    const input = getByTestId('gas-input');
    fireEvent.changeText(input, '30000');

    expect(mockOnChange).toHaveBeenCalledWith('0x7530');
    expect(validateGas).toHaveBeenCalledWith('30000');
  });
});
