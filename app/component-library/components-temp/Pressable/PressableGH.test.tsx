import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('react-native-gesture-handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable } = require('react-native');
  return { Pressable };
});

import PressableGH from './PressableGH';

describe('PressableGH', () => {
  it('renders children', () => {
    const { getByText } = render(
      <PressableGH onPress={jest.fn()}>
        <Text>tap me</Text>
      </PressableGH>,
    );

    expect(getByText('tap me')).toBeOnTheScreen();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PressableGH testID="p" onPress={onPress}>
        <Text>x</Text>
      </PressableGH>,
    );

    fireEvent.press(getByTestId('p'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('defaults accessibilityRole to "button"', () => {
    const { getByRole } = render(
      <PressableGH onPress={jest.fn()}>
        <Text>x</Text>
      </PressableGH>,
    );

    expect(getByRole('button')).toBeOnTheScreen();
  });

  it('allows overriding accessibilityRole', () => {
    const { queryByRole, getByRole } = render(
      <PressableGH accessibilityRole="link" onPress={jest.fn()}>
        <Text>x</Text>
      </PressableGH>,
    );

    expect(queryByRole('button')).toBeNull();
    expect(getByRole('link')).toBeOnTheScreen();
  });

  it('forwards disableFeedback through to the style composer', () => {
    // disableFeedback is exercised via composePressableStyle in
    // Pressable.test.tsx; this just guarantees the prop doesn't crash
    // the wrapper or change rendering at rest.
    const { getByText } = render(
      <PressableGH disableFeedback onPress={jest.fn()}>
        <Text>x</Text>
      </PressableGH>,
    );

    expect(getByText('x')).toBeOnTheScreen();
  });
});
