/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
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
  const tap = Gesture.Tap()
    .runOnJS(true)
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
        onPress(syntheticEvent);
      }
    });

  // When using gesture detector, don't pass onPress to RNTouchableOpacity
  // to prevent double event firing. The gesture detector handles the press events.
  // Only preserve onPress for accessibility when the gesture detector isn't handling it.
  const accessibleOnPress = undefined; // Gesture detector handles all press events

  return (
    <GestureDetector gesture={tap}>
      <RNTouchableOpacity
        disabled={isDisabled}
        onPress={accessibleOnPress} // No onPress to prevent double firing
        {...props}
        // Ensure disabled prop is available to tests
        {...(process.env.NODE_ENV === 'test' && { disabled: isDisabled })}
        // Preserve accessibility properties
        accessible
        accessibilityRole="button"
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

  // Handle disabled state properly in all environments
  // For custom TouchableOpacity (Android), pass original onPress and let it handle disabled state internally
  // For standard TouchableOpacity, apply conditional logic to prevent disabled interaction
  const conditionalOnPress =
    TouchableComponent === TouchableOpacity
      ? onPress
      : isDisabled
      ? undefined
      : onPress;

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
