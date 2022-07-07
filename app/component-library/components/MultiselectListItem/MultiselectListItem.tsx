/* eslint-disable react/prop-types */
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useStyles } from '../../hooks';
import Checkbox from '../Checkbox';
import styleSheet from './MultiselectListItem.styles';
import { MultiselectListItemProps } from './MultiselectListItem.types';

const MultiselectListItem: React.FC<MultiselectListItemProps> = ({
  style,
  isSelected,
  children,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, isSelected });

  return (
    <TouchableOpacity style={styles.base} {...props}>
      <Checkbox style={styles.checkbox} isSelected={isSelected} />
      {children}
    </TouchableOpacity>
  );
};

export default MultiselectListItem;
