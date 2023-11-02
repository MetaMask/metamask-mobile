/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../hooks';
import ListItem from '../../../List/ListItem/ListItem';

// Internal dependencies.
import styleSheet from './SelectItem.styles';
import { SelectItemProps } from './SelectItem.types';
import { DEFAULT_SELECTITEM_GAP } from './SelectItem.constants';

const SelectItem: React.FC<SelectItemProps> = ({
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

  return (
    <TouchableOpacity
      style={styles.base}
      disabled={isDisabled}
      onPress={onPress}
      onLongPress={onLongPress}
      {...props}
    >
      <ListItem gap={gap}>{children}</ListItem>
      {isSelected && (
        <View style={styles.underlay} accessibilityRole="checkbox" accessible>
          <View style={styles.underlayBar} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export default SelectItem;
