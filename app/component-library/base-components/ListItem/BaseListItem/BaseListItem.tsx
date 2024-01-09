/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import BaseListItemBase from './foundation/BaseListItemBase';
import ListItemColumn, { WidthType } from './foundation/BaseListItemBaseColumn';

// Internal dependencies.
import styleSheet from './BaseListItem.styles';
import { BaseListItemProps } from './BaseListItem.types';
import {
  DEFAULT_BASELISTITEM_GAP,
  DEFAULT_BASELISTITEM_VERTICALALIGNMENT,
} from './BaseListItem.constants';

const BaseListItem: React.FC<BaseListItemProps> = ({
  startAccessory,
  children,
  endAccessory,
  gap = DEFAULT_BASELISTITEM_GAP,
  verticalAlignment = DEFAULT_BASELISTITEM_VERTICALALIGNMENT,
  style,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <BaseListItemBase
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
    </BaseListItemBase>
  );
};

export default BaseListItem;
