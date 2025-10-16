/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useRef, useState, useEffect } from 'react';
import {
  TouchableOpacity as RNTouchableOpacity,
  TouchableOpacityProps,
  View,
  Platform,
  GestureResponderEvent,
  AccessibilityInfo,
} from 'react-native';

// External dependencies.
import Checkbox from '../../Checkbox';
import { useStyles } from '../../../hooks';
import ListItem from '../../List/ListItem/ListItem';

// Internal dependencies.
import styleSheet from './ListItemMultiSelect.styles';
import { ListItemMultiSelectProps } from './ListItemMultiSelect.types';
import { DEFAULT_LISTITEMMULTISELECT_GAP } from './ListItemMultiSelect.constants';
import {
  Gesture,
  GestureDetector,
  type GestureStateChangeEvent,
  type TapGestureHandlerEventPayload,
} from 'react-native-gesture-handler';

const TouchableOpacity = ({
  onPress,
  disabled,
  children,
  ...props
}: TouchableOpacityProps & {
  children?: React.ReactNode;
}) => {
  const isDisabled = disabled || (props as { isDisabled?: boolean }).isDisabled;

  // Track accessibility state - start with false as default to ensure gesture handler works
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState<
    boolean | null
  >(false);

  useEffect(() => {
    // Check initial accessibility state
    AccessibilityInfo.isScreenReaderEnabled()
      .then(setIsAccessibilityEnabled)
      .catch((error) => {
        // Log the error for debugging
        console.warn('AccessibilityInfo.isScreenReaderEnabled failed:', error);
        // Fallback to false - assume accessibility is OFF
        // This ensures gesture handler will work in ScrollViews
        setIsAccessibilityEnabled(false);
      });

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
        onPress={
          isAccessibilityEnabled === true && !isDisabled ? onPress : undefined
        } // Use TouchableOpacity onPress only when accessibility is explicitly ON (safer for accessibility users)
        {...props}
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

  // iOS checkbox coordination: For iOS/other platforms, we need coordination between checkbox and main component
  const lastCheckboxGestureTime = useRef(0);
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

  // iOS checkbox coordination: Set timestamp FIRST, then call raw parent function
  // This ensures main component's onPress coordination sees the recent timestamp and skips
  const checkboxOnPressIn = (pressEvent: GestureResponderEvent) => {
    if (onPress && !isDisabled) {
      // Skip coordination logic in test environments
      if (process.env.NODE_ENV === 'test') {
        onPress(pressEvent);
        return;
      }

      // Set timestamp BEFORE calling parent function (timestamp-first pattern)
      lastCheckboxGestureTime.current = Date.now();
      // Call raw parent function directly (bypasses main component coordination)
      onPress(pressEvent);
    }
  };

  // Android: Pass onPress directly to custom TouchableOpacity (it handles coordination)
  // iOS/other platforms: coordinate with checkbox to prevent double firing
  const getOnPress = () => {
    if (isDisabled) return undefined;

    // Android: Pass onPress directly to custom TouchableOpacity
    if (Platform.OS === 'android' && !isE2ETest && !isUnitTest) {
      return onPress;
    }

    // iOS/other platforms: coordinate with checkbox
    return (pressEvent?: GestureResponderEvent) => {
      // Skip coordination logic in test environments
      if (process.env.NODE_ENV === 'test') {
        onPress?.(pressEvent as GestureResponderEvent);
        return;
      }

      // iOS/other platforms: coordinate with checkbox
      const now = Date.now();
      const timeSinceLastGesture = now - lastCheckboxGestureTime.current;

      if (onPress && timeSinceLastGesture > COORDINATION_WINDOW) {
        lastCheckboxGestureTime.current = now;
        onPress(pressEvent as GestureResponderEvent);
      }
    };
  };

  return (
    <TouchableComponent
      style={styles.base}
      disabled={isDisabled}
      onPress={getOnPress()}
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
