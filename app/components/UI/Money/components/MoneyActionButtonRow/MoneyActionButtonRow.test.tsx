import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyActionButtonRow from './MoneyActionButtonRow';
import { MoneyActionButtonRowTestIds } from './MoneyActionButtonRow.testIds';
import { strings } from '../../../../../../locales/i18n';

const noop = jest.fn();

const defaultProps = {
  add: { onPress: noop },
  transfer: { onPress: noop },
  card: { onPress: noop },
};

describe('MoneyActionButtonRow', () => {
  it('renders all three action buttons', () => {
    const { getByText } = render(<MoneyActionButtonRow {...defaultProps} />);

    expect(getByText(strings('money.action.add'))).toBeOnTheScreen();
    expect(getByText(strings('money.action.transfer'))).toBeOnTheScreen();
    expect(getByText(strings('money.action.card'))).toBeOnTheScreen();
  });

  it('calls add.onPress when Add button is pressed', () => {
    const mockAdd = jest.fn();
    const { getByTestId } = render(
      <MoneyActionButtonRow {...defaultProps} add={{ onPress: mockAdd }} />,
    );

    fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.ADD_BUTTON));

    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it('calls transfer.onPress when Transfer button is pressed', () => {
    const mockTransfer = jest.fn();
    const { getByTestId } = render(
      <MoneyActionButtonRow
        {...defaultProps}
        transfer={{ onPress: mockTransfer }}
      />,
    );

    fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.TRANSFER_BUTTON));

    expect(mockTransfer).toHaveBeenCalledTimes(1);
  });

  it('calls card.onPress when Card button is pressed', () => {
    const mockCard = jest.fn();
    const { getByTestId } = render(
      <MoneyActionButtonRow {...defaultProps} card={{ onPress: mockCard }} />,
    );

    fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.CARD_BUTTON));

    expect(mockCard).toHaveBeenCalledTimes(1);
  });

  it('does not call add.onPress when Add button is disabled', () => {
    const mockAdd = jest.fn();
    const { getByTestId } = render(
      <MoneyActionButtonRow
        {...defaultProps}
        add={{ onPress: mockAdd, disabled: true }}
      />,
    );

    fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.ADD_BUTTON));

    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('does not call transfer.onPress when Transfer button is disabled', () => {
    const mockTransfer = jest.fn();
    const { getByTestId } = render(
      <MoneyActionButtonRow
        {...defaultProps}
        transfer={{ onPress: mockTransfer, disabled: true }}
      />,
    );

    fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.TRANSFER_BUTTON));

    expect(mockTransfer).not.toHaveBeenCalled();
  });

  it('does not call card.onPress when Card button is disabled', () => {
    const mockCard = jest.fn();
    const { getByTestId } = render(
      <MoneyActionButtonRow
        {...defaultProps}
        card={{ onPress: mockCard, disabled: true }}
      />,
    );

    fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.CARD_BUTTON));

    expect(mockCard).not.toHaveBeenCalled();
  });
});
