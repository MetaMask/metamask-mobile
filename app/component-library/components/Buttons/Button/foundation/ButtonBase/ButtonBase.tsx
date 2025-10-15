/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity as RNTouchableOpacity,
  TouchableOpacityProps,
  Platform,
  GestureResponderEvent,
  AccessibilityInfo,
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
import {
  Gesture,
  GestureDetector,
  type GestureStateChangeEvent,
  type TapGestureHandlerEventPayload,
} from 'react-native-gesture-handler';

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

  // Track accessibility state - start with null to indicate "unknown"
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    // Check initial accessibility state
    AccessibilityInfo.isScreenReaderEnabled().then(setIsAccessibilityEnabled);

    // Listen for accessibility changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsAccessibilityEnabled,
    );

    return () => subscription?.remove();
  }, []);

  // Gesture detection for ScrollView compatibility on Android
  const tap = Gesture.Tap()
    .runOnJS(true)
    .shouldCancelWhenOutside(false)
    .maxDeltaX(20) // Allow some movement while tapping
    .maxDeltaY(20)
    .requireExternalGestureToFail() // Wait for other gestures to fail before activating
    .maxDuration(300) // Tight constraint: must complete within 300ms
    .minPointers(1)
    .onEnd(
      (
        gestureEvent: GestureStateChangeEvent<TapGestureHandlerEventPayload>,
      ) => {
        // Only handle gesture when we KNOW accessibility is OFF
        // When accessibility is ON or UNKNOWN, let TouchableOpacity handle the press
        if (onPress && !isDisabled && isAccessibilityEnabled === false) {
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

          onPress(syntheticEvent);
        }
      },
    );

  // In test environments, behave like standard TouchableOpacity
  if (process.env.NODE_ENV === 'test') {
    return (
      <RNTouchableOpacity
        disabled={isDisabled}
        onPress={isDisabled ? undefined : onPress}
        {...props}
      >
        {children}
      </RNTouchableOpacity>
    );
  }

  return (
    <GestureDetector gesture={tap}>
      <RNTouchableOpacity
        disabled={isDisabled}
        onPress={!isDisabled ? onPress : undefined} // Always enable TouchableOpacity onPress as fallback
        {...props}
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
