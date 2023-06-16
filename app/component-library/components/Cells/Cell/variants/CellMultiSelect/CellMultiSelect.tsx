/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import MultiSelectItem from '../../../../Select/MultiSelect/MultiSelectItem';
import CellBase from '../../foundation/CellBase';

// Internal dependencies.
import { CELL_MULTI_SELECT_TEST_ID } from '../../../../../../constants/test-ids';
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
    <MultiSelectItem
      isSelected={isSelected}
      style={styles.base}
      testID={CELL_MULTI_SELECT_TEST_ID}
      {...props}
    >
      <CellBase
        avatarProps={avatarProps}
        title={title}
        secondaryText={secondaryText}
        tertiaryText={tertiaryText}
        tagLabel={tagLabel}
      >
        {children}
      </CellBase>
    </MultiSelectItem>
  );
};

export default CellMultiSelect;
