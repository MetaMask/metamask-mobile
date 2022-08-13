/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import SelectItem from '../../Select/Select/SelectItem';
import CellAccountContent from '../CellAccountContent';

// Internal dependencies.
import { CELL_ACCOUNT_SINGLE_SELECT_TEST_ID } from './CellAccountSelectItem.constants';
import styleSheet from './CellAccountSelectItem.styles';
import { CellAccountSelectItemProps } from './CellAccountSelectItem.types';

const CellAccountSelectItem = ({
  style,
  accountAddress,
  accountAvatarType,
  title,
  secondaryText,
  tertiaryText,
  tagLabel,
  isSelected = false,
  children,
  ...props
}: CellAccountSelectItemProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <SelectItem
      isSelected={isSelected}
      style={styles.base}
      testID={CELL_ACCOUNT_SINGLE_SELECT_TEST_ID}
      {...props}
    >
      <CellAccountContent
        accountAddress={accountAddress}
        accountAvatarType={accountAvatarType}
        title={title}
        secondaryText={secondaryText}
        tertiaryText={tertiaryText}
        tagLabel={tagLabel}
      >
        {children}
      </CellAccountContent>
    </SelectItem>
  );
};

export default CellAccountSelectItem;
