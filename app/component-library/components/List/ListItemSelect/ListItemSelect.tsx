// Third party dependencies.
import React, { useCallback } from 'react';
import { TouchableOpacity, View, GestureResponderEvent } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import ListItem from '../../List/ListItem/ListItem';

// Internal dependencies.
import styleSheet from './ListItemSelect.styles';
import { ListItemSelectProps } from './ListItemSelect.types';
import { DEFAULT_SELECTITEM_GAP } from './ListItemSelect.constants';

const ListItemSelect: React.FC<ListItemSelectProps> = ({
  style,
  isSelected = false,
  isDisabled = false,
  children,
  onPress,
  onLongPress,
  gap = DEFAULT_SELECTITEM_GAP,
  verticalAlignment,
  rightAccessory,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, isDisabled });

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (!isDisabled && onPress) {
        onPress(event);
      }
    },
    [isDisabled, onPress],
  );

  const handleLongPress = useCallback(
    (event: GestureResponderEvent) => {
      if (!isDisabled && onLongPress) {
        onLongPress(event);
      }
    },
    [isDisabled, onLongPress],
  );

  return (
    <TouchableOpacity
      style={styles.base}
      onPress={handlePress}
      onLongPress={handleLongPress}
      disabled={isDisabled}
      {...props}
    >
      <ListItem gap={gap} style={styles.listItem}>
        <View style={styles.contentContainer}>
          <View style={styles.childrenContainer}>{children}</View>
          {rightAccessory && (
            <View pointerEvents="box-none">{rightAccessory}</View>
          )}
        </View>
      </ListItem>
      {isSelected && (
        <View
          pointerEvents="box-none"
          style={styles.underlay}
          accessibilityRole="checkbox"
          accessible
        >
          <View style={styles.underlayBar} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default ListItemSelect;
