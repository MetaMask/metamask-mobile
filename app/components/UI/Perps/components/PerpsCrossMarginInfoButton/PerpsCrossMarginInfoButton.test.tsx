import React from 'react';
import { Modal } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsCrossMarginInfoButton from './PerpsCrossMarginInfoButton';
import { PerpsBottomSheetTooltipSelectorsIDs } from '../../Perps.testIds';

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: jest.fn() }),
}));

describe('PerpsCrossMarginInfoButton', () => {
  it('expands the small info icon to a 44pt tap target', () => {
    render(
      <PerpsCrossMarginInfoButton
        hasLiquidationPrice={false}
        testID="cross-info"
      />,
    );

    // 20pt icon plus 12pt of slop on every side.
    expect(screen.getByTestId('cross-info')).toHaveProp('hitSlop', 12);
  });

  it('closes the explanation on the native modal dismissal request', () => {
    render(
      <PerpsCrossMarginInfoButton
        hasLiquidationPrice={false}
        testID="cross-info"
      />,
    );
    fireEvent.press(screen.getByTestId('cross-info'));

    fireEvent(screen.UNSAFE_getByType(Modal), 'requestClose');

    expect(
      screen.queryByTestId(PerpsBottomSheetTooltipSelectorsIDs.CONTENT),
    ).not.toBeOnTheScreen();
  });

  it.each([
    [
      false,
      'This position has no liquidation price at your current account value. It can change with the P&L of your other positions.',
    ],
    [true, 'This price moves with the P&L of your other positions.'],
  ] as const)(
    'opens the explanation with hasLiquidationPrice=%s',
    (hasLiquidationPrice, explanation) => {
      render(
        <PerpsCrossMarginInfoButton
          hasLiquidationPrice={hasLiquidationPrice}
          testID="cross-info"
        />,
      );

      fireEvent.press(screen.getByTestId('cross-info'));

      expect(
        screen.getByTestId(PerpsBottomSheetTooltipSelectorsIDs.CONTENT),
      ).toHaveTextContent(explanation);
      expect(
        screen.getByTestId(PerpsBottomSheetTooltipSelectorsIDs.TITLE_TAG),
      ).toHaveTextContent('Cross');
    },
  );
});
