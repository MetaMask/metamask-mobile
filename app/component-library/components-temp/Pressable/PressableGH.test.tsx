import React from 'react';
import { Text, type View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

jest.mock('react-native-gesture-handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable } = require('react-native');
  return { Pressable };
});

import PressableGH from './PressableGH';
import { PressableVariant } from './Pressable.types';

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

  it('passes through accessibilityLabel', () => {
    const { getByLabelText } = render(
      <PressableGH accessibilityLabel="Action" onPress={jest.fn()}>
        <Text>x</Text>
      </PressableGH>,
    );

    expect(getByLabelText('Action')).toBeOnTheScreen();
  });

  it('forwards a ref to the underlying view', () => {
    const ref = React.createRef<View>();
    render(
      <PressableGH ref={ref} onPress={jest.fn()}>
        <Text>x</Text>
      </PressableGH>,
    );

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.measure).toBe('function');
  });

  it('accepts the variant prop without crashing', () => {
    expect(() =>
      render(
        <PressableGH variant={PressableVariant.Highlight} onPress={jest.fn()}>
          <Text>x</Text>
        </PressableGH>,
      ),
    ).not.toThrow();

    expect(() =>
      render(
        <PressableGH variant={PressableVariant.Default} onPress={jest.fn()}>
          <Text>x</Text>
        </PressableGH>,
      ),
    ).not.toThrow();
  });
});
