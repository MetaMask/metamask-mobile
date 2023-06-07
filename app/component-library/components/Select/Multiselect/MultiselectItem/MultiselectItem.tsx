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
import { DEFAULT_MULTISELECTITEM_PADDING } from './MultiSelectItem.constants';

const MultiSelectItem: React.FC<MultiSelectItemProps> = ({
  style,
  isSelected = false,
  isDisabled = false,
  children,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, isDisabled });

  return (
    <TouchableOpacity style={styles.base} disabled={isDisabled} {...props}>
      <Checkbox style={styles.checkbox} isChecked={isSelected} />
      <ListItem padding={DEFAULT_MULTISELECTITEM_PADDING} {...props}>
        {children}
      </ListItem>
      {isSelected && (
        <View style={styles.underlay} accessibilityRole="checkbox" />
      )}
    </TouchableOpacity>
  );
};

export default MultiSelectItem;
