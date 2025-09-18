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

  // Simple pass-through to main component coordination
  // Main component handles ALL coordination logic

  // Gesture detection for ScrollView compatibility on Android
  // Sets timestamp FIRST, then calls parent function
  const tap = Gesture.Tap()
    .runOnJS(true)
    .shouldCancelWhenOutside(false)
    .maxDeltaX(20) // Allow some movement while tapping
    .maxDeltaY(20)
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

        // Call main component function (handles coordination)
        onPress(syntheticEvent);
      }
    });

  // Simple accessibility handler - main component handles coordination
  const accessibilityOnPress = (pressEvent: GestureResponderEvent) => {
    if (onPress && !isDisabled) {
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

  // Shared coordination system for maximum reliability
  // Both custom TouchableOpacity and main component use the same timestamp reference
  const lastPressTime = useRef(0);
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

  // All platforms use coordination logic to prevent double firing from any source
  const conditionalOnPress = isDisabled
    ? undefined
    : (pressEvent?: GestureResponderEvent) => {
        // Skip coordination logic in test environments
        if (process.env.NODE_ENV === 'test') {
          onPress?.(pressEvent as GestureResponderEvent);
          return;
        }

        const now = Date.now();
        const timeSinceLastPress = now - lastPressTime.current;

        if (onPress && timeSinceLastPress > COORDINATION_WINDOW) {
          lastPressTime.current = now;
          onPress(pressEvent as GestureResponderEvent);
        }
      };

  return (
    <TouchableComponent
      style={styles.base}
      disabled={isDisabled}
      onPress={conditionalOnPress}
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
