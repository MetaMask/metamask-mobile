import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { noop } from 'lodash';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { transferTransactionStateMock } from '../../../__mocks__/transfer-transaction-mock';
import { GasInput } from './gas-input';

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

  it('accepts the EIP-2780 transaction base cost', () => {
    const mockOnChange = jest.fn();
    const { getByTestId, queryByTestId } = renderWithProvider(
      <GasInput onChange={mockOnChange} onErrorChange={noop} />,
      {
        state: transferTransactionStateMock,
      },
    );

    fireEvent.changeText(getByTestId('gas-input'), '12000');

    expect(mockOnChange).toHaveBeenCalledWith('0x2ee0');
    expect(queryByTestId('gas-error')).not.toBeOnTheScreen();
  });

  it('displays an error below the EIP-2780 transaction base cost', () => {
    const { getByTestId } = renderWithProvider(
      <GasInput onChange={noop} onErrorChange={noop} />,
      {
        state: transferTransactionStateMock,
      },
    );

    fireEvent.changeText(getByTestId('gas-input'), '11999');

    expect(getByTestId('gas-error')).toHaveTextContent(
      'Gas limit must be at least 12000',
    );
  });

  it('defers chain-specific upper limits to the selected node', () => {
    const mockOnChange = jest.fn();
    const { getByTestId, queryByTestId } = renderWithProvider(
      <GasInput onChange={mockOnChange} onErrorChange={noop} />,
      {
        state: transferTransactionStateMock,
      },
    );

    fireEvent.changeText(getByTestId('gas-input'), '16777217');

    expect(mockOnChange).toHaveBeenCalledWith('0x1000001');
    expect(queryByTestId('gas-error')).not.toBeOnTheScreen();
  });
});
