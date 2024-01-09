/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../hooks';
import ListItem from '../../../List/ListItem';
import ListItemSelect from '../../../List/ListItemSelect/ListItemSelect';
import ListItemMultiSelect from '../../../List/ListItemMultiSelect/ListItemMultiSelect';
import ListItemColumn, { WidthType } from '../../../List/ListItemColumn';
import { ValueListVariant } from '../../ValueList.types';

// Internal dependencies.
import styleSheet from './ValueListItemBase.styles';
import { ValueListItemBaseProps } from './ValueListItemBase.types';
import {
  DEFAULT_VALUELISTITEMBASE_VARIANT,
  DEFAULT_VALUELISTITEMBASE_GAP,
  DEFAULT_VALUELISTITEMBASE_VERTICALALIGNMENT,
} from './ValueListItemBase.constants';

const ValueListItemBase: React.FC<ValueListItemBaseProps> = ({
  variant = DEFAULT_VALUELISTITEMBASE_VARIANT,
  startAccessory,
  children,
  endAccessory,
  gap = DEFAULT_VALUELISTITEMBASE_GAP,
  verticalAlignment = DEFAULT_VALUELISTITEMBASE_VERTICALALIGNMENT,
  style,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  let ContainerComponent;

  switch (variant) {
    case ValueListVariant.Display:
      ContainerComponent = ListItem;
      break;
    case ValueListVariant.MultiSelect:
      ContainerComponent = ListItemMultiSelect;
      break;
    case ValueListVariant.Select:
      ContainerComponent = ListItemSelect;
      break;
    default:
      ContainerComponent = ListItem;
      break;
  }

  return (
    <ContainerComponent
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
    </ContainerComponent>
  );
};

export default ValueListItemBase;
