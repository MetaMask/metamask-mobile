// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - Notifications team directory
import React from 'react';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS, withTiming } from 'react-native-reanimated';

import NotificationRoot from './Root';

const children = <></>;
const styles = {
  wrapper: {},
  trashIconContainer: {},
};
const handleOnPress = jest.fn();
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useSharedValue: jest.fn().mockImplementation((init) => ({
    value: init,
    withTiming: jest.fn((toValue, _, callback) => ({ toValue, callback })),
  })),
  runOnJS: jest.fn((callback) => callback()),
}));

describe('NotificationRoot', () => {
  const SWIPE_THRESHOLD = -100;
  const SCREEN_WIDTH = 300; // Assume some screen width

  // Mock callbacks
  const onDismiss = jest.fn();

  // Shared values setup
  const transX = useSharedValue(0);
  const itemHeight = useSharedValue(100); // Assume initial height
  const paddingVertical = useSharedValue(20); // Assume initial padding
  const opacity = useSharedValue(1); // Assume full opacity
  const onActive = (event: PanGestureHandlerGestureEvent) => {
    const isSwipingLeft = event.translationX > 0;

    if (isSwipingLeft) {
      transX.value = 0;
      return;
    }

    transX.value = event.translationX;
  };
  const onEnd = () => {
    const isDismissed = transX.value < SWIPE_THRESHOLD;
    if (isDismissed) {
      transX.value = withTiming(-SCREEN_WIDTH);
      itemHeight.value = withTiming(0);
      paddingVertical.value = withTiming(0);
      opacity.value = withTiming(0, undefined, (isFinished: boolean) => {
        if (isFinished && onDismiss) {
          runOnJS(onDismiss);
        }
      });
    } else {
      transX.value = withTiming(0);
    }
  };

  it('matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <NotificationRoot
        handleOnPress={handleOnPress}
        onDismiss={onDismiss}
        styles={styles}
      >
        {children}
      </NotificationRoot>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should dismiss the item if transX.value is less than SWIPE_THRESHOLD', () => {
    transX.value = -150;
    onEnd();
    expect(transX.value).toBe(-SCREEN_WIDTH);
    expect(itemHeight.value).toBe(0);
    expect(paddingVertical.value).toBe(0);
    expect(opacity.value).toBe(0);
  });

  it('should set transX.value to 0 if swiping left', () => {
    const event = {
      translationX: 10,
    } as unknown as PanGestureHandlerGestureEvent;
    onActive(event);
    expect(transX.value).toBe(0);
  });

  it('should set transX.value to event.translationX if not swiping left', () => {
    const event = {
      translationX: -10,
    } as unknown as PanGestureHandlerGestureEvent;
    onActive(event);
    expect(transX.value).toBe(-10);
  });
});
