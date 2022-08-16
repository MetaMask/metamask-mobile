/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import SelectItem from '../../../../Select/Select/SelectItem';
import CellBase from '../../foundation/CellBase';

// Internal dependencies.
import { CELL_SELECT_TEST_ID } from './CellSelect.constants';
import styleSheet from './CellSelect.styles';
import { CellSelectProps } from './CellSelect.types';

const CellSelect = ({
  style,
  avatarAccountAddress,
  avatarAccountType,
  title,
  secondaryText,
  tertiaryText,
  tagLabel,
  isSelected = false,
  children,
}: CellSelectProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <SelectItem
      isSelected={isSelected}
      style={styles.base}
      testID={CELL_SELECT_TEST_ID}
    >
      <CellBase
        avatarAccountAddress={avatarAccountAddress}
        avatarAccountType={avatarAccountType}
        title={title}
        secondaryText={secondaryText}
        tertiaryText={tertiaryText}
        tagLabel={tagLabel}
      >
        {children}
      </CellBase>
    </SelectItem>
  );
};

export default CellSelect;
