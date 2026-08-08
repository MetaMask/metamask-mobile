import React from 'react';
import { Text, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import ShimmerOverlay from './ShimmerOverlay';

jest.mock('react-native-linear-gradient', () => 'LinearGradient');

describe('ShimmerOverlay', () => {
  it('renders children', () => {
    render(
      <ShimmerOverlay testID="shimmer">
        <Text>child content</Text>
      </ShimmerOverlay>,
    );

    expect(screen.getByText('child content')).toBeOnTheScreen();
  });

  it('does not render the shimmer band before layout has been measured', () => {
    render(
      <ShimmerOverlay testID="shimmer">
        <View />
      </ShimmerOverlay>,
    );

    expect(screen.queryByTestId('shimmer')).toBeNull();
  });

  it('renders the shimmer band after the wrapper measures a non-zero width', () => {
    render(
      <ShimmerOverlay testID="shimmer">
        <Text>child</Text>
      </ShimmerOverlay>,
    );

    const wrapper = screen.getByText('child').parent;
    expect(wrapper).toBeTruthy();

    act(() => {
      fireEvent(wrapper as never, 'layout', {
        nativeEvent: { layout: { width: 200, height: 32, x: 0, y: 0 } },
      });
    });

    expect(screen.getByTestId('shimmer')).toBeOnTheScreen();
  });
});
