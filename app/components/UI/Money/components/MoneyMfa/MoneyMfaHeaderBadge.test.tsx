import React from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { fireEvent, render } from '@testing-library/react-native';
import MoneyMfaHeaderBadge from './MoneyMfaHeaderBadge';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    useReducedMotion: jest.fn(() => false),
  };
});

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

  it('opens the 2-step verification sheet when reduced motion is on', () => {
    jest.mocked(useReducedMotion).mockReturnValueOnce(true);
    const onPress = jest.fn();
    const { getByTestId } = render(
      <MoneyMfaHeaderBadge onPress={onPress} isHighlighted />,
    );

    fireEvent.press(getByTestId(MoneyMfaTestIds.HEADER_BADGE));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
