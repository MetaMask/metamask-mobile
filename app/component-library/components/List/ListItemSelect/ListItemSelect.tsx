/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import ListItem from '../../List/ListItem/ListItem';

// Internal dependencies.
import styleSheet from './ListItemSelect.styles';
import { ListItemSelectProps } from './ListItemSelect.types';
import { DEFAULT_SELECTITEM_GAP } from './ListItemSelect.constants';
import TempTouchableOpacity from '../../../components-temp/TempTouchableOpacity';

const ListItemSelect: React.FC<ListItemSelectProps> = ({
  style,
  isSelected = false,
  isDisabled = false,
  children,
  onLongPress,
  gap = DEFAULT_SELECTITEM_GAP,
  verticalAlignment,
  shouldEnableAndroidPressIn = false,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, isDisabled });

  return (
    <TempTouchableOpacity
      style={styles.base}
      disabled={isDisabled}
      onLongPress={onLongPress}
      shouldEnableAndroidPressIn={shouldEnableAndroidPressIn}
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
    </TempTouchableOpacity>
  );
};

export default ListItemSelect;
