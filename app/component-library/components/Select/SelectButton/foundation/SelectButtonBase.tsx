/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../hooks';
import ListItem from '../../../List/ListItem';
import ListItemColumn, { WidthType } from '../../../List/ListItemColumn';

// Internal dependencies.
import styleSheet from './SelectButtonBase.styles';
import { SelectButtonBaseProps } from './SelectButtonBase.types';

const SelectButtonBase: React.FC<SelectButtonBaseProps> = ({
  startAccessory,
  children,
  endAccessory,
  caretIcon,
  gap,
  verticalAlignment,
  style,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <TouchableOpacity style={styles.base} activeOpacity={1} {...props}>
      <ListItem gap={gap} verticalAlignment={verticalAlignment}>
        {startAccessory && <ListItemColumn>{startAccessory}</ListItemColumn>}
        {children && (
          <ListItemColumn widthType={WidthType.Fill}>{children}</ListItemColumn>
        )}
        {endAccessory && <ListItemColumn>{endAccessory}</ListItemColumn>}
        <ListItemColumn>{caretIcon}</ListItemColumn>
      </ListItem>
    </TouchableOpacity>
  );
};

export default SelectButtonBase;
