/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useRef } from 'react';
import {
  TouchableOpacity as RNTouchableOpacity,
  TouchableOpacityProps,
  Platform,
  GestureResponderEvent,
} from 'react-native';

// External dependencies.
import Text from '../../../../Texts/Text';
import Icon from '../../../../Icons/Icon';
import { useStyles } from '../../../../../hooks';

// Internal dependencies.
import { ButtonBaseProps } from './ButtonBase.types';
import styleSheet from './ButtonBase.styles';
import {
  DEFAULT_BUTTONBASE_LABEL_COLOR,
  DEFAULT_BUTTONBASE_SIZE,
  DEFAULT_BUTTONBASE_WIDTH,
  DEFAULT_BUTTONBASE_ICON_SIZE,
  DEFAULT_BUTTONBASE_LABEL_TEXTVARIANT,
} from './ButtonBase.constants';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

export const TouchableOpacity = ({
  onPress,
  disabled,
  children,
  ...props
}: TouchableOpacityProps & {
  children?: React.ReactNode;
}) => {
  // Handle both 'disabled' and 'isDisabled' props for compatibility
  const isDisabled = disabled || (props as { isDisabled?: boolean }).isDisabled;

  // Simple pass-through to main component coordination
  // Main component handles ALL coordination logic

  // Gesture detection for ScrollView compatibility on Android
  // Sets timestamp FIRST, then calls parent function
  const tap = Gesture.Tap()
    .runOnJS(true)
    .shouldCancelWhenOutside(false)
    .maxDeltaX(20) // Allow some movement while tapping
    .maxDeltaY(20)
    .onEnd((gestureEvent) => {
      if (onPress && !isDisabled) {
        // Create a proper GestureResponderEvent-like object from gesture event
        const syntheticEvent = {
          nativeEvent: {
            locationX: gestureEvent.x || 0,
            locationY: gestureEvent.y || 0,
            pageX: gestureEvent.absoluteX || 0,
            pageY: gestureEvent.absoluteY || 0,
            timestamp: Date.now(),
          },
          persist: () => {
            /* no-op for synthetic event */
          },
          preventDefault: () => {
            /* no-op for synthetic event */
          },
          stopPropagation: () => {
            /* no-op for synthetic event */
          },
        } as GestureResponderEvent;

        // Call main component function (handles coordination)
        onPress(syntheticEvent);
      }
    });

  // Simple accessibility handler - main component handles coordination
  const accessibilityOnPress = (pressEvent: GestureResponderEvent) => {
    if (onPress && !isDisabled) {
      onPress(pressEvent);
    }
  };

  return (
    <GestureDetector gesture={tap}>
      <RNTouchableOpacity
        disabled={isDisabled}
        onPress={accessibilityOnPress} // Restored for accessibility without ScrollView conflicts
        {...props}
        // Ensure disabled prop is available to tests
        {...(process.env.NODE_ENV === 'test' && { disabled: isDisabled })}
      >
        {children}
      </RNTouchableOpacity>
    </GestureDetector>
  );
};

const ButtonBase = ({
  label,
  labelColor = DEFAULT_BUTTONBASE_LABEL_COLOR,
  labelTextVariant = DEFAULT_BUTTONBASE_LABEL_TEXTVARIANT,
  startIconName,
  endIconName,
  size = DEFAULT_BUTTONBASE_SIZE,
  onPress,
  style,
  width = DEFAULT_BUTTONBASE_WIDTH,
  isDisabled,
  ...props
}: ButtonBaseProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
    size,
    width,
    isDisabled,
  });

  // Shared coordination system for maximum reliability
  // Both custom TouchableOpacity and main component use the same timestamp reference
  const lastPressTime = useRef(0);
  const COORDINATION_WINDOW = 100; // 100ms window for TalkBack compatibility

  // Disable gesture wrapper in test environments to prevent test interference
  const isE2ETest =
    process.env.IS_TEST === 'true' ||
    process.env.METAMASK_ENVIRONMENT === 'e2e';
  const isUnitTest = process.env.NODE_ENV === 'test';
  const TouchableComponent =
    Platform.OS === 'android' && !isE2ETest && !isUnitTest
      ? TouchableOpacity
      : RNTouchableOpacity;

  const conditionalOnPress = isDisabled
    ? undefined
    : (_pressEvent?: GestureResponderEvent) => {
        // Skip coordination logic in test environments
        if (process.env.NODE_ENV === 'test') {
          onPress?.();
          return;
        }

        const now = Date.now();
        const timeSinceLastPress = now - lastPressTime.current;

        if (onPress && timeSinceLastPress > COORDINATION_WINDOW) {
          lastPressTime.current = now;
          onPress();
        }
      };

  return (
    <TouchableComponent
      disabled={isDisabled}
      activeOpacity={1}
      onPress={conditionalOnPress}
      style={styles.base}
      accessibilityRole="button"
      accessible
      {...props}
    >
      {startIconName && (
        <Icon
          color={labelColor.toString()}
          name={startIconName}
          size={DEFAULT_BUTTONBASE_ICON_SIZE}
          style={styles.startIcon}
        />
      )}
      {typeof label === 'string' ? (
        <Text
          variant={labelTextVariant}
          style={styles.label}
          accessibilityRole="none"
        >
          {label}
        </Text>
      ) : (
        label
      )}
      {endIconName && (
        <Icon
          color={labelColor.toString()}
          name={endIconName}
          size={DEFAULT_BUTTONBASE_ICON_SIZE}
          style={styles.endIcon}
        />
      )}
    </TouchableComponent>
  );
};

export default ButtonBase;
