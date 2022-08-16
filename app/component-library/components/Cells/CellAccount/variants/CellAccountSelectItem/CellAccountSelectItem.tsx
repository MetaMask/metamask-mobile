/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import SelectItem from '../../../../Select/Select/SelectItem';
import CellAccountBaseItem from '../../foundation/CellAccountBaseItem';

// Internal dependencies.
import { CELL_ACCOUNT_SELECT_ITEM_TEST_ID } from './CellAccountSelectItem.constants';
import styleSheet from './CellAccountSelectItem.styles';
import { CellAccountSelectItemProps } from './CellAccountSelectItem.types';

const CellAccountSelectItem = ({
  style,
  avatarAccountAddress,
  avatarAccountType,
  title,
  secondaryText,
  tertiaryText,
  tagLabel,
  isSelected = false,
  children,
}: CellAccountSelectItemProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <SelectItem
      isSelected={isSelected}
      style={styles.base}
      testID={CELL_ACCOUNT_SELECT_ITEM_TEST_ID}
    >
      <CellAccountBaseItem
        avatarAccountAddress={avatarAccountAddress}
        avatarAccountType={avatarAccountType}
        title={title}
        secondaryText={secondaryText}
        tertiaryText={tertiaryText}
        tagLabel={tagLabel}
      >
        {children}
      </CellAccountBaseItem>
    </SelectItem>
  );
};

export default CellAccountSelectItem;
