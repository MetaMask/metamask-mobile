import React from 'react';
import { Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  PanGestureHandlerProps,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';

interface NotificationRootProps
  extends Pick<PanGestureHandlerProps, 'simultaneousHandlers'> {
  children: React.ReactNode;
  styles: StyleSheet.NamedStyles<any>;
  handleOnPress: () => void;
  onDismiss?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRANSLATE_X_THRESHOLD = -SCREEN_WIDTH * 0.3;

function NotificationRoot({
  children,
  handleOnPress,
  styles,
  onDismiss,
  simultaneousHandlers,
}: NotificationRootProps) {
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue();
  const paddingVertical = useSharedValue(10);
  const opacity = useSharedValue(1);

  const panGesture = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onActive: (event: PanGestureHandlerGestureEvent) => {
      translateX.value = event.translationX;
    },
    onEnd: () => {
      const isDismissed = translateX.value < TRANSLATE_X_THRESHOLD;
      if (isDismissed) {
        translateX.value = withTiming(-SCREEN_WIDTH);
        itemHeight.value = withTiming(0);
        paddingVertical.value = withTiming(0);
        opacity.value = withTiming(0, undefined, (isFinished: boolean) => {
          if (isFinished && onDismiss) {
            runOnJS(onDismiss);
          }
        });
      } else {
        translateX.value = withTiming(0);
      }
    },
  });

  const rChildrenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const rIconStyle = useAnimatedStyle(() => {
    const opacity = withTiming(
      translateX.value < TRANSLATE_X_THRESHOLD ? 1 : 0,
    );
    return { opacity };
  });

  const rContainerStyle = useAnimatedStyle(() => ({
    height: itemHeight.value,
    paddingVertical: paddingVertical.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.wrapper, rContainerStyle]}>
      <PanGestureHandler
        simultaneousHandlers={simultaneousHandlers}
        onGestureEvent={panGesture}
      >
        <Animated.View onPress={handleOnPress} style={[rChildrenStyle]}>
          <TouchableOpacity onPress={handleOnPress}>
            {children}
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
      <Animated.View style={[styles.trashIconContainer, rIconStyle]}>
        <Icon
          size={IconSize.Md}
          name={IconName.Trash}
          color={IconColor.Warning}
        />
      </Animated.View>
    </Animated.View>
  );
}

export default NotificationRoot;
