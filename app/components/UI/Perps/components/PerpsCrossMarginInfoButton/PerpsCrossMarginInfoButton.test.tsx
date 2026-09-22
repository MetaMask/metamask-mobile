import React from 'react';
import { Modal } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsCrossMarginInfoButton from './PerpsCrossMarginInfoButton';
import { PerpsBottomSheetTooltipSelectorsIDs } from '../../Perps.testIds';

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: jest.fn() }),
}));

describe('PerpsCrossMarginInfoButton', () => {
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
      'At the current account value, this position has no liquidation price. This can change as the value of your other cross positions changes. A liquidation can affect your entire cross balance.',
    ],
    [
      true,
      'This price moves with the profit and loss of your other cross positions and changes to your cross balance. A liquidation can affect your entire cross balance.',
    ],
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
    },
  );
});
