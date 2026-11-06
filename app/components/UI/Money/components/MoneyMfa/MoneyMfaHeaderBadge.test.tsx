import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import MoneyMfaHeaderBadge from './MoneyMfaHeaderBadge';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';

describe('MoneyMfaHeaderBadge', () => {
  it.each([false, true])(
    'opens the 2-step verification sheet when pressed (highlighted: %s)',
    (isHighlighted) => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <MoneyMfaHeaderBadge onPress={onPress} isHighlighted={isHighlighted} />,
      );

      fireEvent.press(getByTestId(MoneyMfaTestIds.HEADER_BADGE));

      expect(onPress).toHaveBeenCalledTimes(1);
    },
  );
});
