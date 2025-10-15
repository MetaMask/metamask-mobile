/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity as RNTouchableOpacity,
  TouchableOpacityProps,
  View,
  Platform,
  GestureResponderEvent,
  AccessibilityInfo,
} from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import ListItem from '../../List/ListItem/ListItem';

// Internal dependencies.
import styleSheet from './ListItemSelect.styles';
import { ListItemSelectProps } from './ListItemSelect.types';
import { DEFAULT_SELECTITEM_GAP } from './ListItemSelect.constants';
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

const ListItemSelect: React.FC<ListItemSelectProps> = ({
  style,
  isSelected = false,
  isDisabled = false,
  children,
  onPress,
  onLongPress,
  gap = DEFAULT_SELECTITEM_GAP,
  verticalAlignment,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, isDisabled });

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
      style={styles.base}
      disabled={isDisabled}
      onPress={isDisabled ? undefined : onPress}
      onLongPress={onLongPress}
      {...props}
    >
      <ListItem gap={gap} style={styles.listItem}>
        {children}
      </ListItem>
      {isSelected && (
        <View style={styles.underlay} accessibilityRole="checkbox" accessible>
          <View style={styles.underlayBar} />
        </View>
      )}
    </TouchableComponent>
  );
};

export default ListItemSelect;
