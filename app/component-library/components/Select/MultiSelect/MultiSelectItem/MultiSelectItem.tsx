/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies.
import Checkbox from '../../../Checkbox';
import { useStyles } from '../../../../hooks';
import ListItem from '../../../List/ListItem/ListItem';

// Internal dependencies.
import styleSheet from './MultiSelectItem.styles';
import { MultiSelectItemProps } from './MultiSelectItem.types';
import {
  DEFAULT_MULTISELECTITEM_PADDING,
  DEFAULT_MULTISELECTITEM_BORDERRADIUS,
  DEFAULT_MULTISELECTITEM_GAP,
} from './MultiSelectItem.constants';

const MultiSelectItem: React.FC<MultiSelectItemProps> = ({
  style,
  isSelected = false,
  isDisabled = false,
  children,
  gap = DEFAULT_MULTISELECTITEM_GAP,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, gap, isDisabled });

  return (
    <TouchableOpacity style={styles.base} disabled={isDisabled} {...props}>
      <ListItem
        padding={DEFAULT_MULTISELECTITEM_PADDING}
        borderRadius={DEFAULT_MULTISELECTITEM_BORDERRADIUS}
        gap={gap}
        {...props}
      >
        <Checkbox
          style={styles.checkbox}
          isChecked={isSelected}
          onPressIn={props.onPress}
        />
        {children}
      </ListItem>
      {isSelected && (
        <View style={styles.underlay} accessibilityRole="checkbox" accessible />
      )}
    </TouchableOpacity>
  );
};

export default MultiSelectItem;
