/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useRef } from 'react';
import {
  TouchableOpacity as RNTouchableOpacity,
  TouchableOpacityProps,
  View,
  Platform,
  GestureResponderEvent,
} from 'react-native';

// External dependencies.
import Checkbox from '../../Checkbox';
import { useStyles } from '../../../hooks';
import ListItem from '../../List/ListItem/ListItem';

// Internal dependencies.
import styleSheet from './ListItemMultiSelect.styles';
import { ListItemMultiSelectProps } from './ListItemMultiSelect.types';
import { DEFAULT_LISTITEMMULTISELECT_GAP } from './ListItemMultiSelect.constants';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const TouchableOpacity = ({
  onPress,
  disabled,
  children,
  ...props
}: TouchableOpacityProps & { children?: React.ReactNode }) => {
  const isDisabled = disabled || (props as { isDisabled?: boolean }).isDisabled;

  // Timestamp-based coordination to prevent double firing:
  // 1. User taps multi-select item
  // 2. GestureDetector fires first (records timestamp) - handles ScrollView conflicts
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

const ListItemMultiSelect: React.FC<ListItemMultiSelectProps> = ({
  style,
  isSelected = false,
  isDisabled = false,
  children,
  gap = DEFAULT_LISTITEMMULTISELECT_GAP,
  onPress,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, gap, isDisabled });

  // Timestamp tracking for Checkbox coordination on non-Android platforms only
  // Android coordination is handled entirely by the custom TouchableOpacity component
  const lastCheckboxGestureTime = useRef(0);
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
    : (pressEvent?: GestureResponderEvent) => {
        const now = Date.now();
        const timeSinceLastPress = now - lastCheckboxGestureTime.current;

        if (onPress && timeSinceLastPress > COORDINATION_WINDOW) {
          lastCheckboxGestureTime.current = now;
          onPress(pressEvent as GestureResponderEvent);
        }
      };

  // Checkbox onPressIn with timestamp coordination (non-Android only)
  // Event firing order:
  // 1. Checkbox onPressIn -> records timestamp -> calls onPress
  // 2. Main TouchableComponent onPress -> checks timestamp -> skips if recent
  const checkboxOnPressIn = (pressEvent: GestureResponderEvent) => {
    const now = Date.now();
    // Record timestamp and call onPress if not disabled
    if (onPress && !isDisabled) {
      lastCheckboxGestureTime.current = now;
      onPress(pressEvent);
    }
  };

  return (
    <TouchableComponent
      style={styles.base}
      disabled={isDisabled}
      onPress={conditionalOnPress}
      {...props}
    >
      <ListItem gap={gap} style={styles.listItem}>
        <View
          pointerEvents={
            Platform.OS === 'android' && !isE2ETest && !isUnitTest
              ? 'none' // On Android, make checkbox non-interactive to prevent double firing
              : 'auto' // On other platforms, allow normal interaction
          }
        >
          <Checkbox
            style={styles.checkbox}
            isChecked={isSelected}
            isDisabled={isDisabled}
            onPressIn={
              Platform.OS === 'android'
                ? undefined // Android uses main gesture handler only
                : isDisabled
                ? undefined
                : checkboxOnPressIn // iOS/other platforms use checkbox onPressIn
            }
          />
        </View>
        {children}
      </ListItem>
      {isSelected && (
        <View style={styles.underlay} accessibilityRole="checkbox" accessible />
      )}
    </TouchableComponent>
  );
};

export default ListItemMultiSelect;
