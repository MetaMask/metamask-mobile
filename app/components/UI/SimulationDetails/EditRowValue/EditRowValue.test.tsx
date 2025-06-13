import BigNumber from 'bignumber.js';
import React from 'react';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import { BalanceChange } from '../../../UI/SimulationDetails/types';
import EditRowValue from './EditRowValue';
import { fireEvent } from '@testing-library/react-native';

const MockEditTexts = {
  title: 'Edit approval limit',
  description:
    'Enter the amount that you feel comfortable being spent on your behalf.',
};

describe('EditRowValue', () => {
  it('renders button icon for editing', async () => {
    const { getByTestId } = renderWithProvider(
      <EditRowValue
        balanceChange={{ amount: new BigNumber('100') } as BalanceChange}
        onUpdate={() => undefined}
        editTexts={MockEditTexts}
      />,
      {},
    );
    expect(getByTestId('edit-amount-button-icon')).toBeDefined();
  });

  it('open editing modal when edit icon is pressed', async () => {
    const { getByTestId, getByText } = renderWithProvider(
      <EditRowValue
        balanceChange={{ amount: new BigNumber('100') } as BalanceChange}
        onUpdate={() => undefined}
        editTexts={MockEditTexts}
      />,
      {},
    );
    expect(getByTestId('edit-amount-button-icon')).toBeTruthy();
    fireEvent.press(getByTestId('edit-amount-button-icon'));
    expect(getByText('Edit approval limit')).toBeTruthy();
  });

  it('close editing modal when cancel button is pressed', async () => {
    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <EditRowValue
        balanceChange={{ amount: new BigNumber('100') } as BalanceChange}
        onUpdate={() => undefined}
        editTexts={MockEditTexts}
      />,
      {},
    );
    expect(getByTestId('edit-amount-button-icon')).toBeTruthy();
    fireEvent.press(getByTestId('edit-amount-button-icon'));
    expect(getByText('Edit approval limit')).toBeTruthy();
    fireEvent.press(getByText('Cancel'));
    expect(queryByText('Edit approval limit')).toBeNull();
  });

  it('close editing modal and call onUpdate prop when save button is pressed', async () => {
    const mockOnUpdate = jest.fn();
    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <EditRowValue
        balanceChange={{ amount: new BigNumber('100') } as BalanceChange}
        onUpdate={mockOnUpdate}
        editTexts={MockEditTexts}
      />,
      {},
    );
    expect(getByTestId('edit-amount-button-icon')).toBeTruthy();
    fireEvent.press(getByTestId('edit-amount-button-icon'));
    expect(getByText('Edit approval limit')).toBeTruthy();
    fireEvent.press(getByText('Save'));
    expect(queryByText('Edit approval limit')).toBeNull();
    expect(mockOnUpdate).toHaveBeenCalledTimes(1);
  });
});
