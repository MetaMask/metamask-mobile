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

  // Shared coordination state to prevent race conditions between gesture and accessibility handlers
  const coordinationRef = useRef<{
    lastPressTime: number;
    isProcessing: boolean;
  }>({ lastPressTime: 0, isProcessing: false });

  const COORDINATION_WINDOW = 100; // 100ms window for TalkBack compatibility

  // Centralized coordination logic for Android
  const handlePress = (pressEvent?: GestureResponderEvent) => {
    if (!onPress || isDisabled) return;

    const now = Date.now();
    const timeSinceLastPress = now - coordinationRef.current.lastPressTime;

    // Prevent double firing using both processing flag and timing window
    if (
      !coordinationRef.current.isProcessing &&
      timeSinceLastPress > COORDINATION_WINDOW
    ) {
      coordinationRef.current.isProcessing = true;
      coordinationRef.current.lastPressTime = now;

      try {
        onPress(pressEvent as GestureResponderEvent);
      } finally {
        // Synchronously reset processing flag after execution completes
        coordinationRef.current.isProcessing = false;
      }
    }
  };

  // Gesture detection for ScrollView compatibility on Android
  const tap = Gesture.Tap()
    .runOnJS(true)
    .shouldCancelWhenOutside(false)
    .maxDeltaX(20) // Allow some movement while tapping
    .maxDeltaY(20)
    .onEnd((gestureEvent) => {
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

      handlePress(syntheticEvent);
    });

  // Accessibility handler with coordination
  const accessibilityOnPress = (pressEvent: GestureResponderEvent) => {
    handlePress(pressEvent);
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

  // Disable gesture wrapper in test environments to prevent test interference
  const isE2ETest =
    process.env.IS_TEST === 'true' ||
    process.env.METAMASK_ENVIRONMENT === 'e2e';
  const isUnitTest = process.env.NODE_ENV === 'test';
  const TouchableComponent =
    Platform.OS === 'android' && !isE2ETest && !isUnitTest
      ? TouchableOpacity
      : RNTouchableOpacity;

  return (
    <TouchableComponent
      disabled={isDisabled}
      activeOpacity={1}
      onPress={isDisabled ? undefined : onPress}
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
