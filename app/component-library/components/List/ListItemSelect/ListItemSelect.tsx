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
import { useStyles } from '../../../hooks';
import ListItem from '../../List/ListItem/ListItem';

// Internal dependencies.
import styleSheet from './ListItemSelect.styles';
import { ListItemSelectProps } from './ListItemSelect.types';
import { DEFAULT_SELECTITEM_GAP } from './ListItemSelect.constants';
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
