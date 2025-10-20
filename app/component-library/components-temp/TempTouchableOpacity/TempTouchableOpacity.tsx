/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity as RNTouchableOpacity,
  Platform,
  AccessibilityInfo,
  GestureResponderEvent,
  TouchableOpacityProps,
} from 'react-native';

// Internal dependencies.
interface TempTouchableOpacityProps extends TouchableOpacityProps {
  /**
   * Function to trigger when pressing the button.
   */
  onPress?: (event: GestureResponderEvent) => void;
  /**
   * Function to trigger when pressing in the button.
   */
  onPressIn?: (event: GestureResponderEvent) => void;
  /**
   * Optional prop to enable Android press handling.
   * @default true
   */
  shouldEnableAndroidPressIn?: boolean;
  /**
   * Optional param to disable the button.
   */
  disabled?: boolean;
  /**
   * Child components to render inside the touchable.
   */
  children?: React.ReactNode;
}

const TempTouchableOpacity = ({
  onPress,
  onPressIn,
  disabled,
  shouldEnableAndroidPressIn = true,
  children,
  ...props
}: TempTouchableOpacityProps) => {
  // Track accessibility state - initialized as false
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);

  useEffect(() => {
    // Check accessibility state and handle errors
    AccessibilityInfo.isScreenReaderEnabled()
      .then(setIsAccessibilityEnabled)
      .catch(() => {
        // Keep as false if there's an error
        setIsAccessibilityEnabled(false);
      });

    // Listen for accessibility changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsAccessibilityEnabled,
    );

    return () => subscription?.remove();
  }, []);

  // Check if we should apply Android press handling
  const isE2ETest =
    process.env.IS_TEST === 'true' ||
    process.env.METAMASK_ENVIRONMENT === 'e2e';
  const isUnitTest = process.env.NODE_ENV === 'test';
  const shouldApplyAndroidPressHandling =
    shouldEnableAndroidPressIn &&
    Platform.OS === 'android' &&
    !isE2ETest &&
    !isUnitTest;

  // Determine onPress and onPressIn handlers based on conditions
  let finalOnPress: ((event: GestureResponderEvent) => void) | undefined =
    onPress;
  let finalOnPressIn: ((event: GestureResponderEvent) => void) | undefined =
    onPressIn;

  if (shouldApplyAndroidPressHandling) {
    if (isAccessibilityEnabled) {
      // If accessibility is enabled, use normal handlers
      finalOnPress = onPress;
      finalOnPressIn = onPressIn;
    } else {
      // If accessibility is disabled, pass onPress to onPressIn
      finalOnPress = undefined;
      finalOnPressIn = onPress;
    }
  }

  return (
    <RNTouchableOpacity
      disabled={disabled}
      onPress={disabled ? undefined : finalOnPress}
      onPressIn={disabled ? undefined : finalOnPressIn}
      {...props}
    >
      {children}
    </RNTouchableOpacity>
  );
};

export default TempTouchableOpacity;
