/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../hooks';
import ListItem from '../../../List/ListItem';
import ListItemColumn, { WidthType } from '../../../List/ListItemColumn';

// Internal dependencies.
import styleSheet from './SelectValueBase.styles';
import { SelectValueBaseProps } from './SelectValueBase.types';

const SelectValueBase: React.FC<SelectValueBaseProps> = ({
  startAccessory,
  children,
  endAccessory,
  gap,
  verticalAlignment,
  style,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <ListItem
      style={styles.base}
      gap={gap}
      verticalAlignment={verticalAlignment}
      {...props}
    >
      {startAccessory && <ListItemColumn>{startAccessory}</ListItemColumn>}
      {children && (
        <ListItemColumn widthType={WidthType.Fill}>{children}</ListItemColumn>
      )}
      {endAccessory && <ListItemColumn>{endAccessory}</ListItemColumn>}
    </ListItem>
  );
};

export default SelectValueBase;
