import React, { useCallback, useRef } from 'react';
import { Pressable, type LayoutChangeEvent } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { strings } from '../../../../../../locales/i18n';
import { ProHubTestIds } from '../../ProHub.testIds';
import {
  CARD_TILT_SPRING,
  PHYSICAL_CARD_PRESS_MAX_ROTATE_X_DEG,
  PHYSICAL_CARD_PRESS_MAX_ROTATE_Y_DEG,
  PHYSICAL_CARD_REST_ROTATE_X_DEG,
  PHYSICAL_CARD_REST_ROTATE_Y_DEG,
  PHYSICAL_CARD_REST_ROTATE_Z_DEG,
} from './PhysicalCardPreview.constants';

interface CardPointerEvent {
  nativeEvent: {
    locationX?: number;
    locationY?: number;
    offsetX?: number;
    offsetY?: number;
  };
}

const clampUnit = (value: number): number => Math.max(-1, Math.min(1, value));

const PhysicalCardPreview = () => {
  const size = useRef({ width: 1, height: 1 });
  const rotateX = useSharedValue(PHYSICAL_CARD_REST_ROTATE_X_DEG);
  const rotateY = useSharedValue(PHYSICAL_CARD_REST_ROTATE_Y_DEG);
  const rotateZ = useSharedValue(PHYSICAL_CARD_REST_ROTATE_Z_DEG);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { rotateZ: `${rotateZ.value}deg` },
    ],
  }));

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    size.current = { width, height };
  }, []);

  const tiltTowardPointer = useCallback(
    (event: CardPointerEvent) => {
      const { locationX, locationY, offsetX, offsetY } = event.nativeEvent;
      const pointerX = locationX ?? offsetX ?? size.current.width / 2;
      const pointerY = locationY ?? offsetY ?? size.current.height / 2;
      const nx = clampUnit((pointerX / size.current.width) * 2 - 1);
      const ny = clampUnit((pointerY / size.current.height) * 2 - 1);

      // Offset from rest: the pointer corner recedes, the opposite side lifts.
      rotateX.value = withSpring(
        PHYSICAL_CARD_REST_ROTATE_X_DEG -
          ny * PHYSICAL_CARD_PRESS_MAX_ROTATE_X_DEG,
        CARD_TILT_SPRING,
      );
      rotateY.value = withSpring(
        PHYSICAL_CARD_REST_ROTATE_Y_DEG +
          nx * PHYSICAL_CARD_PRESS_MAX_ROTATE_Y_DEG,
        CARD_TILT_SPRING,
      );
    },
    [rotateX, rotateY],
  );

  const resetTilt = useCallback(() => {
    rotateX.value = withSpring(
      PHYSICAL_CARD_REST_ROTATE_X_DEG,
      CARD_TILT_SPRING,
    );
    rotateY.value = withSpring(
      PHYSICAL_CARD_REST_ROTATE_Y_DEG,
      CARD_TILT_SPRING,
    );
  }, [rotateX, rotateY]);

  return (
    <Box twClassName="w-[90%] mx-auto">
      <Pressable
        onLayout={handleLayout}
        onPressIn={tiltTowardPointer}
        onPressOut={resetTilt}
        onHoverIn={tiltTowardPointer}
        onHoverOut={resetTilt}
        onTouchMove={tiltTowardPointer}
        accessibilityRole="image"
        accessibilityLabel={strings('pro_hub.physical_card.title')}
        testID={ProHubTestIds.CARD_PLACEHOLDER}
      >
        <Animated.View style={animatedStyle}>
          <Box twClassName="w-full h-[225px] rounded-2xl bg-background-section" />
        </Animated.View>
      </Pressable>
    </Box>
  );
};

export default PhysicalCardPreview;
