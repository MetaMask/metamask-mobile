import React from 'react';
import { StyleSheet, Text, type View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { mockTheme } from '../../../util/theme';

import Pressable, { PRESSED_OPACITY, pressedStyleFor } from './Pressable';
import { PressableVariant } from './Pressable.types';

const RESTING = mockTheme.colors.background.section;
const PRESSED_BG = mockTheme.colors.background.pressed;

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

    const resting = getByTestId('p').props.style;
    const flat = Array.isArray(resting)
      ? Object.assign({}, ...resting.filter(Boolean))
      : resting;
    expect(flat.backgroundColor).toBe(RESTING);
    expect(flat.padding).toBe(16);
  });

  it('forwards a ref to the underlying view', () => {
    const ref = React.createRef<View>();
    render(
      <Pressable ref={ref} onPress={jest.fn()}>
        <Text>x</Text>
      </Pressable>,
    );

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.measure).toBe('function');
  });

  describe('pressedStyleFor', () => {
    it('default variant returns subtree opacity dim', () => {
      expect(pressedStyleFor(PressableVariant.Default, PRESSED_BG)).toEqual({
        opacity: PRESSED_OPACITY,
      });
    });

    it('highlight variant returns background.pressed overlay', () => {
      expect(pressedStyleFor(PressableVariant.Highlight, PRESSED_BG)).toEqual({
        backgroundColor: PRESSED_BG,
      });
    });

    it('does not include both opacity and backgroundColor for either variant', () => {
      const def = pressedStyleFor(PressableVariant.Default, PRESSED_BG);
      const hi = pressedStyleFor(PressableVariant.Highlight, PRESSED_BG);
      expect('backgroundColor' in def).toBe(false);
      expect('opacity' in hi).toBe(false);
    });

    it('none variant returns an empty overlay (no opacity, no background)', () => {
      const overlay = pressedStyleFor(PressableVariant.None, PRESSED_BG);
      expect(overlay).toEqual({});
    });
  });
});
