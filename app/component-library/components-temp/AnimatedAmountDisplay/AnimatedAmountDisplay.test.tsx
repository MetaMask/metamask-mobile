import React from 'react';
import { View } from 'react-native';
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

    const { getByRole, getByTestId, getAllByTestId } = render(
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
    expect(getByRole('button', { name: '$10' })).toBeOnTheScreen();

    fireEvent.press(getByTestId('amount-display'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders a static fit-to-width amount without mounting a numeric animation', () => {
    const { getByTestId } = render(
      <AnimatedAmountDisplay
        amountTestID="amount-body"
        color={TextColor.ErrorDefault}
        fitToWidth
        testID="amount-display"
        value="123456789.123456"
      />,
    );

    expect(getByTestId('amount-body')).toHaveTextContent('123456789.123456');
    expect(getByTestId('amount-body')).toHaveProp('adjustsFontSizeToFit', true);
  });

  it('exposes a combined label for a non-pressable amount', () => {
    const { getByRole } = render(
      <AnimatedAmountDisplay prefix="$" suffix=" USD" value="10" />,
    );

    expect(getByRole('text', { name: '$10 USD' })).toBeOnTheScreen();
  });

  it('uses the supplied label when affixes are elements', () => {
    const { getByRole } = render(
      <AnimatedAmountDisplay
        accessibilityLabel="10 US dollars"
        prefix={<View />}
        value="10"
      />,
    );

    expect(getByRole('text', { name: '10 US dollars' })).toBeOnTheScreen();
  });

  it('renders loading content without the amount or cursor', () => {
    const { getByTestId, queryByTestId } = render(
      <AnimatedAmountDisplay
        amountTestID="amount-body"
        cursor={{ testID: 'amount-cursor' }}
        loading
        loadingContent={<View testID="amount-loading" />}
        value="10"
      />,
    );

    expect(getByTestId('amount-loading')).toBeOnTheScreen();
    expect(queryByTestId('amount-body')).toBeNull();
    expect(queryByTestId('amount-cursor')).toBeNull();
  });

  it('renders a static cursor when reduced motion is enabled', () => {
    mockUseReducedMotion.mockReturnValue(true);
    const { getByTestId } = render(
      <AnimatedAmountDisplay cursor={{ testID: 'amount-cursor' }} value="10" />,
    );

    expect(getByTestId('amount-cursor')).toHaveStyle({ opacity: 1 });
  });
});
