import React from 'react';
import { Animated, Easing } from 'react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { AnimatedCursor } from './animated-cursor';

describe('AnimatedCursor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the easing function and stops blinking on unmount', () => {
    const blinkAnimation = {
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn(),
    } as unknown as Animated.CompositeAnimation;
    const timingSpy = jest.spyOn(Animated, 'timing');
    jest.spyOn(Animated, 'loop').mockReturnValue(blinkAnimation);

    const { unmount } = renderWithProvider(<AnimatedCursor />);

    expect(timingSpy).toHaveBeenNthCalledWith(
      1,
      expect.any(Animated.Value),
      expect.objectContaining({ easing: Easing.bounce, toValue: 0 }),
    );
    expect(timingSpy).toHaveBeenNthCalledWith(
      2,
      expect.any(Animated.Value),
      expect.objectContaining({ easing: Easing.bounce, toValue: 1 }),
    );
    expect(blinkAnimation.start).toHaveBeenCalledTimes(1);

    unmount();

    expect(blinkAnimation.stop).toHaveBeenCalledTimes(1);
  });
});
