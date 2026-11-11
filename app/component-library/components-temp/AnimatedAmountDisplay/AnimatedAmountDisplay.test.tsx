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

  it('omits the container role and label when the row is not accessible', () => {
    const { getByTestId, queryByRole } = render(
      <AnimatedAmountDisplay
        accessible={false}
        testID="amount-display"
        value="10"
      />,
    );
    const container = getByTestId('amount-display');

    expect(container).not.toHaveProp('accessibilityRole');
    expect(container).not.toHaveProp('accessibilityLabel');
    expect(queryByRole('text', { name: '10' })).not.toBeOnTheScreen();
    expect(queryByRole('button')).not.toBeOnTheScreen();
  });

  it('exposes the amount node as text with the value label', () => {
    const { getByTestId } = render(
      <AnimatedAmountDisplay
        amountAccessible
        amountTestID="amount-body"
        testID="amount-display"
        value="10"
      />,
    );

    expect(getByTestId('amount-body')).toHaveProp('accessibilityRole', 'text');
    expect(getByTestId('amount-body')).toHaveProp('accessibilityLabel', '10');
  });

  it('applies container style and the button role when the row is pressable', () => {
    const onPress = jest.fn();
    const containerStyle = { maxWidth: '100%' as const };
    const { getByRole, getByTestId } = render(
      <AnimatedAmountDisplay
        containerStyle={containerStyle}
        onPress={onPress}
        testID="amount-display"
        value="10"
      />,
    );

    expect(getByRole('button', { name: '10' })).toBeOnTheScreen();
    expect(getByTestId('amount-display')).toHaveStyle(containerStyle);

    fireEvent.press(getByTestId('amount-display'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the default text role and combined label', () => {
    const { getByRole, queryByRole } = render(
      <AnimatedAmountDisplay prefix="$" suffix=" USD" value="10" />,
    );

    expect(getByRole('text', { name: '$10 USD' })).toBeOnTheScreen();
    expect(queryByRole('button')).not.toBeOnTheScreen();
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
