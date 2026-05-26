import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { mockTheme } from '../../../util/theme';

import Pressable from './Pressable';
import { composePressableStyle } from './Pressable.utils';

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

const RESTING = mockTheme.colors.background.section;
const PRESSED = mockTheme.colors.background.pressed;

const styles = StyleSheet.create({
  padded: { padding: 16, backgroundColor: RESTING },
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
});

describe('composePressableStyle', () => {
  const baseArgs = {
    callerStyle: undefined,
    disableFeedback: false,
    pressedColor: PRESSED,
  };

  it('returns the caller style untouched at rest', () => {
    const result = composePressableStyle({
      ...baseArgs,
      state: { pressed: false },
      callerStyle: styles.padded,
    });

    const flat = flatten(result);
    expect(flat.backgroundColor).toBe(RESTING);
    expect(flat.padding).toBe(16);
  });

  it('layers the pressed overlay on top of the caller style on press', () => {
    const result = composePressableStyle({
      ...baseArgs,
      state: { pressed: true },
      callerStyle: styles.padded,
    });

    const flat = flatten(result);
    // overlay is appended last → wins for backgroundColor
    expect(flat.backgroundColor).toBe(PRESSED);
    // unrelated caller styles are preserved
    expect(flat.padding).toBe(16);
  });

  it('does not apply the overlay when disableFeedback is true', () => {
    const result = composePressableStyle({
      ...baseArgs,
      state: { pressed: true },
      callerStyle: styles.padded,
      disableFeedback: true,
    });

    const flat = flatten(result);
    expect(flat.backgroundColor).toBe(RESTING);
  });

  it('resolves a function-form caller style with the pressed state', () => {
    const callerStyle = jest.fn(({ pressed }) => ({
      borderWidth: pressed ? 2 : 0,
    }));

    const result = composePressableStyle({
      ...baseArgs,
      state: { pressed: true },
      callerStyle,
    });

    expect(callerStyle).toHaveBeenCalledWith({ pressed: true });
    const flat = flatten(result);
    expect(flat.borderWidth).toBe(2);
    expect(flat.backgroundColor).toBe(PRESSED);
  });

  it('handles undefined caller style', () => {
    const restingResult = composePressableStyle({
      ...baseArgs,
      state: { pressed: false },
    });
    expect(restingResult).toBeUndefined();

    const pressedResult = composePressableStyle({
      ...baseArgs,
      state: { pressed: true },
    });
    expect(flatten(pressedResult).backgroundColor).toBe(PRESSED);
  });
});
