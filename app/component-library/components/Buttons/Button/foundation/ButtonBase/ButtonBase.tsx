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

const TouchableOpacity = ({
  onPress,
  disabled,
  children,
  ...props
}: TouchableOpacityProps & { children?: React.ReactNode }) => {
  // Handle both 'disabled' and 'isDisabled' props for compatibility
  const isDisabled = disabled || (props as { isDisabled?: boolean }).isDisabled;

  // Timestamp-based coordination to prevent double firing:
  // 1. User taps button
  // 2. GestureDetector fires first (records timestamp)
  // 3. RNTouchableOpacity onPress checks timestamp and skips if recent
  // 4. Accessibility tools (screen readers) can still use onPress without ScrollView conflicts
  const lastGestureTime = useRef(0);
  const COORDINATION_WINDOW = 100; // 100ms window to prevent double firing (increased for TalkBack compatibility)

  const tap = Gesture.Tap()
    .runOnJS(true)
    .shouldCancelWhenOutside(false)
    .maxDeltaX(20) // Allow some movement while tapping
    .maxDeltaY(20)
    .onEnd((gestureEvent) => {
      if (onPress && !isDisabled) {
        // Record when gesture handler fires to coordinate with accessibility onPress
        lastGestureTime.current = Date.now();

        // Create a proper GestureResponderEvent-like object from gesture event
        const syntheticEvent = {
          nativeEvent: {
            locationX: gestureEvent.x || 0,
            locationY: gestureEvent.y || 0,
            pageX: gestureEvent.absoluteX || 0,
            pageY: gestureEvent.absoluteY || 0,
            timestamp: lastGestureTime.current,
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
        onPress(syntheticEvent);
      }
    });

  // Accessibility-safe onPress that won't conflict with ScrollView
  // Only fires if gesture handler didn't already handle the interaction
  const accessibilityOnPress = (pressEvent: GestureResponderEvent) => {
    const now = Date.now();
    // Only fire if gesture handler didn't fire in the last COORDINATION_WINDOW ms
    if (
      onPress &&
      !isDisabled &&
      now - lastGestureTime.current > COORDINATION_WINDOW
    ) {
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

  // Timestamp tracking for non-Android platforms only
  // Android coordination is handled entirely by the custom TouchableOpacity component
  const lastPressTime = useRef(0);
  const COORDINATION_WINDOW = 100; // 100ms window to prevent double firing (increased for TalkBack compatibility)

  // Disable gesture wrapper in test environments to prevent test interference
  const isE2ETest =
    process.env.IS_TEST === 'true' ||
    process.env.METAMASK_ENVIRONMENT === 'e2e';
  const isUnitTest = process.env.NODE_ENV === 'test';
  const TouchableComponent =
    Platform.OS === 'android' && !isE2ETest && !isUnitTest
      ? TouchableOpacity
      : RNTouchableOpacity;

  // Handle disabled state properly in all environments
  // Apply coordination logic on ALL platforms to prevent double firing
  const conditionalOnPress = isDisabled
    ? undefined
    : (_pressEvent?: GestureResponderEvent) => {
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
