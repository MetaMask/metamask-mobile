/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

import { Platform } from 'react-native';

// External dependencies.
import generateTestId from '../../../../../../../wdio/utils/generateTestId';
import { useStyles } from '../../../../../hooks';
import SelectItem from '../../../../Select/Select/SelectItem';
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
    <SelectItem
      isSelected={isSelected}
      style={styles.base}
      {...props}
      {...generateTestId(Platform, CELLSELECT_TEST_ID)}
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
    </SelectItem>
  );
};

export default CellSelect;
