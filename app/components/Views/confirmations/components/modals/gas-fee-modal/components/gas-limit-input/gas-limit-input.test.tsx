import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { noop } from 'lodash';

import renderWithProvider from '../../../../../../../../util/test/renderWithProvider';
import { transferTransactionStateMock } from '../../../../../mock-data/transfer-transaction-mock';
import { validateGas } from '../../../../../utils/gas-validations';
import { GasLimitInput } from './gas-limit-input';

jest.mock('../../../../../../../../core/Engine', () => ({
  context: {
    TokenListController: {
      fetchTokenList: jest.fn(),
    },
  },
}));

jest.mock('../../../../../utils/gas-validations', () => ({
  validateGas: jest.fn(),
}));

describe('GasLimitInput', () => {
  it('renders the gas limit title and input', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <GasLimitInput onChange={noop} onErrorChange={noop} />,
      {
        state: transferTransactionStateMock,
      },
    );

    expect(getByText('Gas Limit')).toBeOnTheScreen();
    expect(getByTestId('gas-limit-input')).toBeOnTheScreen();
    expect(getByTestId('gas-limit-input')).toHaveProp('value', '26190');
  });

  it('calls onChange when input value changes', () => {
    const mockOnChange = jest.fn();
    const { getByTestId } = renderWithProvider(
      <GasLimitInput onChange={mockOnChange} onErrorChange={noop} />,
      {
        state: transferTransactionStateMock,
      },
    );

    const input = getByTestId('gas-limit-input');
    fireEvent.changeText(input, '30000');

    expect(mockOnChange).toHaveBeenCalledWith('0x7530');
    expect(validateGas).toHaveBeenCalledWith('30000');
  });
});
