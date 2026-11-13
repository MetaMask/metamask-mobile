import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoneyActionButtonRow from './MoneyActionButtonRow';
import { MoneyActionButtonRowTestIds } from './MoneyActionButtonRow.testIds';
import { strings } from '../../../../../../locales/i18n';
import { GLASS_SURFACE_SHEEN_TEST_ID } from '../../../../../component-library/components-temp/BoxGlass';

// The glass tests need the OS to draw glass, which Jest can't.
jest.mock('../../../../../component-library/hooks/useLiquidGlass', () => {
  const actual = jest.requireActual(
    '../../../../../component-library/hooks/useLiquidGlass',
  );
  return {
    ...actual,
    useLiquidGlass: () => ({
      ...actual.useLiquidGlass(),
      isGlassEnabled: true,
    }),
  };
});

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

  it('does not render the Details button when no details config is given', () => {
    const { queryByTestId, queryByText } = render(
      <MoneyActionButtonRow {...defaultProps} />,
    );

    expect(
      queryByTestId(MoneyActionButtonRowTestIds.DETAILS_BUTTON),
    ).toBeNull();
    expect(queryByText(strings('money.action.details'))).toBeNull();
  });

  it('renders the Details button when a details config is given', () => {
    const { getByTestId, getByText } = render(
      <MoneyActionButtonRow {...defaultProps} details={{ onPress: noop }} />,
    );

    expect(
      getByTestId(MoneyActionButtonRowTestIds.DETAILS_BUTTON),
    ).toBeOnTheScreen();
    expect(getByText(strings('money.action.details'))).toBeOnTheScreen();
  });

  it('calls details.onPress when Details button is pressed', () => {
    const mockDetails = jest.fn();
    const { getByTestId } = render(
      <MoneyActionButtonRow
        {...defaultProps}
        details={{ onPress: mockDetails }}
      />,
    );

    fireEvent.press(getByTestId(MoneyActionButtonRowTestIds.DETAILS_BUTTON));

    expect(mockDetails).toHaveBeenCalledTimes(1);
  });

  describe('glass', () => {
    it('keeps opaque tiles by default', () => {
      const { queryAllByTestId } = render(
        <MoneyActionButtonRow {...defaultProps} />,
      );

      expect(queryAllByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).toHaveLength(0);
    });

    it('draws every tile on glass when isGlass is set', () => {
      const { getAllByTestId } = render(
        <MoneyActionButtonRow {...defaultProps} isGlass />,
      );

      expect(getAllByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).toHaveLength(3);
    });

    it('draws the details tile on glass too', () => {
      const { getAllByTestId } = render(
        <MoneyActionButtonRow
          {...defaultProps}
          details={{ onPress: noop }}
          isGlass
        />,
      );

      expect(getAllByTestId(GLASS_SURFACE_SHEEN_TEST_ID)).toHaveLength(4);
    });
  });
});
