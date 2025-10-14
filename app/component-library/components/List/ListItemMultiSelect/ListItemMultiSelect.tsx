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
}: TouchableOpacityProps & {
  children?: React.ReactNode;
}) => {
  const isDisabled = disabled || (props as { isDisabled?: boolean }).isDisabled;

  // Shared coordination state to prevent race conditions between gesture and accessibility handlers
  const coordinationRef = useRef<{
    lastPressTime: number;
    isProcessing: boolean;
  }>({ lastPressTime: 0, isProcessing: false });

  const COORDINATION_WINDOW = 200; // 200ms window for TalkBack compatibility

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

  // Coordination for checkbox interaction on non-Android platforms
  const lastCheckboxGestureTime = useRef(0);
  const COORDINATION_WINDOW = 200; // 200ms window for TalkBack compatibility

  // Disable gesture wrapper in test environments to prevent test interference
  const isE2ETest =
    process.env.IS_TEST === 'true' ||
    process.env.METAMASK_ENVIRONMENT === 'e2e';
  const isUnitTest = process.env.NODE_ENV === 'test';
  const TouchableComponent =
    Platform.OS === 'android' && !isE2ETest && !isUnitTest
      ? TouchableOpacity
      : RNTouchableOpacity;

  // iOS checkbox coordination: Set timestamp FIRST, then call raw parent function
  // This ensures main component's conditionalOnPress sees the recent timestamp and skips
  const checkboxOnPressIn = (pressEvent: GestureResponderEvent) => {
    if (onPress && !isDisabled) {
      // Set timestamp BEFORE calling parent function (timestamp-first pattern)
      lastCheckboxGestureTime.current = Date.now();
      // Call raw parent function directly (bypasses main component coordination)
      onPress(pressEvent);
    }
  };

  return (
    <TouchableComponent
      style={styles.base}
      disabled={isDisabled}
      onPress={
        TouchableComponent === TouchableOpacity
          ? onPress
          : isDisabled
          ? undefined
          : process.env.NODE_ENV === 'test'
          ? onPress // In tests, pass onPress directly without coordination
          : (pressEvent?: GestureResponderEvent) => {
              // For iOS: coordinate with checkbox to prevent double firing
              const now = Date.now();
              const timeSinceLastGesture =
                now - lastCheckboxGestureTime.current;

              if (onPress && timeSinceLastGesture > COORDINATION_WINDOW) {
                lastCheckboxGestureTime.current = now;
                onPress(pressEvent as GestureResponderEvent);
              }
            }
      }
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
