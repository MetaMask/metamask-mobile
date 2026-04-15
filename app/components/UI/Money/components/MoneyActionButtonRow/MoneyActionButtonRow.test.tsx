import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyActionButtonRow from './MoneyActionButtonRow';
import { MoneyActionButtonRowTestIds } from './MoneyActionButtonRow.testIds';
import { strings } from '../../../../../../locales/i18n';

const noop = jest.fn();

describe('MoneyActionButtonRow', () => {
  it('renders all three action buttons', () => {
    const { getByText } = render(
      <MoneyActionButtonRow
        onAddPress={noop}
        onTransferPress={noop}
        onCardPress={noop}
      />,
    );

    expect(getByText(strings('money.action.add'))).toBeOnTheScreen();
    expect(getByText(strings('money.action.transfer'))).toBeOnTheScreen();
    expect(getByText(strings('money.action.card'))).toBeOnTheScreen();
  });

  it('calls onAddPress when Add button is pressed', () => {
    const mockAdd = jest.fn();
    const { getByTestId } = render(
      <MoneyActionButtonRow
        onAddPress={mockAdd}
        onTransferPress={noop}
        onCardPress={noop}
      />,
    );

    fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.ADD_BUTTON));

    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it('calls onTransferPress when Transfer button is pressed', () => {
    const mockTransfer = jest.fn();
    const { getByTestId } = render(
      <MoneyActionButtonRow
        onAddPress={noop}
        onTransferPress={mockTransfer}
        onCardPress={noop}
      />,
    );

    fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.TRANSFER_BUTTON));

    expect(mockTransfer).toHaveBeenCalledTimes(1);
  });

  it('calls onCardPress when Card button is pressed', () => {
    const mockCard = jest.fn();
    const { getByTestId } = render(
      <MoneyActionButtonRow
        onAddPress={noop}
        onTransferPress={noop}
        onCardPress={mockCard}
      />,
    );

    fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.CARD_BUTTON));

    expect(mockCard).toHaveBeenCalledTimes(1);
  });
});
