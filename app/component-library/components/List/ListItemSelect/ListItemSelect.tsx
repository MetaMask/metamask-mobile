/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
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

const TouchableOpacity = ({ onPress, ...props }: TouchableOpacityProps) => {
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      if (onPress) {
        onPress({} as GestureResponderEvent);
      }
    });

  return (
    <GestureDetector gesture={tap}>
      <RNTouchableOpacity {...props} />
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

  const TouchableComponent =
    Platform.OS === 'android' ? TouchableOpacity : RNTouchableOpacity;

  return (
    <TouchableComponent
      style={styles.base}
      disabled={isDisabled}
      onPress={onPress}
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
