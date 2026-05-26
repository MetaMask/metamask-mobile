import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { mockTheme } from '../../../util/theme';

import Pressable from './Pressable';

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

  it('passes through accessibilityLabel', () => {
    const { getByLabelText } = render(
      <Pressable accessibilityLabel="Open settings" onPress={jest.fn()}>
        <Text>x</Text>
      </Pressable>,
    );

    expect(getByLabelText('Open settings')).toBeOnTheScreen();
  });

  it('renders the caller style at rest without modification', () => {
    const { getByTestId } = render(
      <Pressable testID="p" style={styles.padded} onPress={jest.fn()}>
        <Text>x</Text>
      </Pressable>,
    );

    const resting = flatten(getByTestId('p').props.style);
    expect(resting.backgroundColor).toBe(RESTING);
    expect(resting.padding).toBe(16);
  });

  it('resolves a function-form caller style on render', () => {
    const styleFn = jest.fn(() => ({ borderWidth: 1 }));
    render(
      <Pressable testID="p" style={styleFn} onPress={jest.fn()}>
        <Text>x</Text>
      </Pressable>,
    );

    expect(styleFn).toHaveBeenCalledWith(
      expect.objectContaining({ pressed: expect.any(Boolean) }),
    );
  });
});
