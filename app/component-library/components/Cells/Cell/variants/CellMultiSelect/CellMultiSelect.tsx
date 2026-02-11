/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import ListItemMultiSelect from '../../../../List/ListItemMultiSelect';
import CellBase from '../../foundation/CellBase';
import { CellComponentSelectorsIDs } from '../../CellComponent.testIds';

// Internal dependencies.
import styleSheet from './CellMultiSelect.styles';
import { CellMultiSelectProps } from './CellMultiSelect.types';

const CellMultiSelect = ({
  style,
  avatarProps,
  title,
  secondaryText,
  tertiaryText,
  tagLabel,
  isSelected = false,
  children,
  ...props
}: CellMultiSelectProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <ListItemMultiSelect
      isSelected={isSelected}
      style={styles.base}
      testID={CellComponentSelectorsIDs.MULTISELECT}
      {...props}
    >
      <CellBase
        avatarProps={avatarProps}
        title={title}
        secondaryText={secondaryText}
        tertiaryText={tertiaryText}
        tagLabel={tagLabel}
        style={styles.cell}
      >
        {children}
      </CellBase>
    </ListItemMultiSelect>
  );
};

export default CellMultiSelect;
