import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { mockTheme } from '../../../util/theme';

import Pressable from './Pressable';
import { getVariantColors } from './Pressable.utils';

interface AnyStyle {
  [key: string]: unknown;
}

const flatten = (style: unknown): AnyStyle => {
  if (Array.isArray(style)) {
    return style.reduce<AnyStyle>(
      (acc, item) => ({ ...acc, ...flatten(item) }),
      {},
    );
  }
  if (style && typeof style === 'object') {
    return style as AnyStyle;
  }
  return {};
};

const styles = StyleSheet.create({
  padded: { padding: 16 },
});

describe('Pressable', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Pressable onPress={jest.fn()}>
        <Text>tap me</Text>
      </Pressable>,
    );

    expect(getByText('tap me')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <Pressable testID="p" onPress={onPress}>
        <Text>x</Text>
      </Pressable>,
    );

    fireEvent.press(getByTestId('p'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('defaults accessibilityRole to "button"', () => {
    const { getByRole } = render(
      <Pressable onPress={jest.fn()}>
        <Text>x</Text>
      </Pressable>,
    );

    expect(getByRole('button')).toBeOnTheScreen();
  });

  it('allows overriding accessibilityRole', () => {
    const { queryByRole, getByRole } = render(
      <Pressable accessibilityRole="link" onPress={jest.fn()}>
        <Text>x</Text>
      </Pressable>,
    );

    expect(queryByRole('button')).toBeNull();
    expect(getByRole('link')).toBeOnTheScreen();
  });

  it('does not apply a background color for the "none" variant', () => {
    const { getByTestId } = render(
      <Pressable testID="p" variant="none" onPress={jest.fn()}>
        <Text>x</Text>
      </Pressable>,
    );

    const flattened = flatten(getByTestId('p').props.style);
    expect(flattened.backgroundColor).toBeUndefined();
  });

  it('applies the resting background for a surface variant', () => {
    const { getByTestId } = render(
      <Pressable testID="p" variant="section" onPress={jest.fn()}>
        <Text>x</Text>
      </Pressable>,
    );

    const flattened = flatten(getByTestId('p').props.style);
    expect(flattened.backgroundColor).toBe(mockTheme.colors.background.section);
  });

  it('merges caller-provided style on top of the variant style', () => {
    const { getByTestId } = render(
      <Pressable
        testID="p"
        variant="section"
        style={styles.padded}
        onPress={jest.fn()}
      >
        <Text>x</Text>
      </Pressable>,
    );

    const flattened = flatten(getByTestId('p').props.style);
    expect(flattened.backgroundColor).toBe(mockTheme.colors.background.section);
    expect(flattened.padding).toBe(16);
  });

  it('supports a function-style prop that receives { pressed }', () => {
    const styleFn = jest.fn(() => ({ borderWidth: 1 }));
    const { getByTestId } = render(
      <Pressable
        testID="p"
        variant="section"
        style={styleFn}
        onPress={jest.fn()}
      >
        <Text>x</Text>
      </Pressable>,
    );

    // RN invokes the style function with the pressed state; reading
    // props.style here triggers it.
    const styleResult = getByTestId('p').props.style;
    const resolved =
      typeof styleResult === 'function'
        ? styleResult({ pressed: false })
        : styleResult;
    flatten(resolved);

    expect(styleFn).toHaveBeenCalledWith(
      expect.objectContaining({ pressed: expect.any(Boolean) }),
    );
  });
});

describe('getVariantColors', () => {
  const { colors } = mockTheme;

  it.each([
    ['section', colors.background.section, colors.background.defaultPressed],
    [
      'subsection',
      colors.background.subsection,
      colors.background.defaultPressed,
    ],
    ['default', colors.background.default, colors.background.defaultPressed],
    ['muted', colors.background.muted, colors.background.mutedPressed],
    ['transparent', undefined, colors.background.defaultPressed],
    ['none', undefined, undefined],
  ] as const)('maps %s → (%s, %s)', (variant, resting, pressed) => {
    expect(getVariantColors(variant, colors)).toEqual({ resting, pressed });
  });
});
