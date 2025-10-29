/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

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
  shouldEnableAndroidPressIn = false,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, gap, isDisabled });

  return (
    <TempTouchableOpacity
      style={styles.base}
      disabled={isDisabled}
      shouldEnableAndroidPressIn={shouldEnableAndroidPressIn}
      {...props}
    >
      <ListItem gap={gap} style={styles.listItem}>
        <Checkbox
          style={styles.checkbox}
          isChecked={isSelected}
          isDisabled={isDisabled}
        />
        {children}
      </ListItem>
      {isSelected && (
        <View style={styles.underlay} accessibilityRole="checkbox" accessible />
      )}
    </TempTouchableOpacity>
  );
};

export default ListItemMultiSelect;
