/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import MultiselectItem from '../../../../Select/Multiselect/MultiselectItem';
import CellBase from '../../foundation/CellBase';

// Internal dependencies.
import { CELL_MULTI_SELECT_TEST_ID } from './CellMultiselect.constants';
import styleSheet from './CellMultiselect.styles';
import { CellMultiselectProps } from './CellMultiselect.types';

const CellMultiselect = ({
  style,
  avatarProps,
  title,
  secondaryText,
  tertiaryText,
  tagLabel,
  isSelected = false,
  children,
  ...props
}: CellMultiselectProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <MultiselectItem
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
    </MultiselectItem>
  );
};

export default CellMultiselect;
