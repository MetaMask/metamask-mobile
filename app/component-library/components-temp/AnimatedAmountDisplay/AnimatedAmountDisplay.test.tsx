import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TextColor, TextVariant } from '@metamask/design-system-react-native';
import { useReducedMotion } from 'react-native-reanimated';

import AnimatedAmountDisplay from './AnimatedAmountDisplay';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: jest.fn(() => false),
}));

jest.mock('../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../util/theme');
  return {
    useTheme: jest.fn(() => mockTheme),
  };
});

const mockUseReducedMotion = jest.mocked(useReducedMotion);

describe('AnimatedAmountDisplay', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
  });

  it('renders affixes, amount, cursor, and a single press target', () => {
    const onPress = jest.fn();

    const { getByTestId, getAllByTestId } = render(
      <AnimatedAmountDisplay
        amountTestID="amount-body"
        animated={false}
        color={TextColor.TextDefault}
        cursor={{ animated: false, testID: 'amount-cursor' }}
        onPress={onPress}
        prefix="$"
        testID="amount-display"
        value="10"
        variant={TextVariant.DisplayMd}
      />,
    );

    expect(getByTestId('amount-display')).toHaveTextContent('$10');
    expect(getByTestId('amount-body')).toHaveTextContent('10');
    expect(getByTestId('amount-cursor')).toBeOnTheScreen();
    expect(getAllByTestId('amount-display')).toHaveLength(1);

    fireEvent.press(getByTestId('amount-display'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders a static fit-to-width amount without mounting a numeric animation', () => {
    const { getByTestId } = render(
      <AnimatedAmountDisplay
        amountTestID="amount-body"
        fitToWidth
        testID="amount-display"
        value="123456789.123456"
      />,
    );

    expect(getByTestId('amount-body')).toHaveTextContent('123456789.123456');
  });
});
