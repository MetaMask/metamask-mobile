import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { INPUTSTEPPER_CURSOR_TESTID } from './InputStepper.constants';

const BLINK_DURATION_MS = 800;

interface InputStepperCursorProps {
  height: number;
}

export const InputStepperCursor = ({ height }: InputStepperCursorProps) => {
  const tw = useTailwind();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0,
          duration: BLINK_DURATION_MS,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: BLINK_DURATION_MS,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
    );

    blink.start();

    return () => blink.stop();
  }, [opacity]);

  return (
    <Animated.View
      testID={INPUTSTEPPER_CURSOR_TESTID}
      style={[tw.style('mx-1 w-0.5 bg-primary-default'), { height, opacity }]}
    />
  );
};
