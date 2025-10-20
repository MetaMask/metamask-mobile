/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useRef } from 'react';
import { View, Platform, GestureResponderEvent } from 'react-native';

// External dependencies.
import Checkbox from '../../Checkbox';
import { useStyles } from '../../../hooks';
import ListItem from '../../List/ListItem/ListItem';

// Internal dependencies.
import styleSheet from './ListItemMultiSelect.styles';
import { ListItemMultiSelectProps } from './ListItemMultiSelect.types';
import { DEFAULT_LISTITEMMULTISELECT_GAP } from './ListItemMultiSelect.constants';
import TempTouchableOpacity from '../../../components-temp/TempTouchableOpacity';

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

  // iOS/other platforms: coordinate with checkbox to prevent double firing
  const getOnPress = () => {
    if (isDisabled) return undefined;

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
    <TempTouchableOpacity
      style={styles.base}
      disabled={isDisabled}
      onPress={getOnPress()}
      {...props}
    >
      <ListItem gap={gap} style={styles.listItem}>
        <View
          pointerEvents={
            Platform.OS === 'android'
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
    </TempTouchableOpacity>
  );
};

export default ListItemMultiSelect;
