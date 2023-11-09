/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import ListItemSelect from '../../../../List/ListItemSelect';
import CellBase from '../../foundation/CellBase';

// Internal dependencies.
import styleSheet from './CellSelect.styles';
import { CellSelectProps } from './CellSelect.types';
import { CELLSELECT_TEST_ID } from './CellSelect.constants';

const CellSelect = ({
  style,
  avatarProps,
  title,
  secondaryText,
  tertiaryText,
  tagLabel,
  isSelected = false,
  children,
  ...props
}: CellSelectProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <ListItemSelect
      isSelected={isSelected}
      style={styles.base}
      testID={CELLSELECT_TEST_ID}
      {...props}
    >
      <CellBase
        avatarProps={avatarProps}
        title={title}
        secondaryText={secondaryText}
        tertiaryText={tertiaryText}
        tagLabel={tagLabel}
        style={style}
      >
        {children}
      </CellBase>
    </ListItemSelect>
  );
};

export default CellSelect;
