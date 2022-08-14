/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import MultiselectItem from '../../Select/Multiselect/MultiselectItem';
import CellAccountBaseItem from '../CellAccountBaseItem';

// Internal dependencies.
import { CELL_ACCOUNT_MULTI_SELECT_ITEM_TEST_ID } from './CellAccountMultiselectItem.constants';
import styleSheet from './CellAccountMultiselectItem.styles';
import { CellAccountMultiselectItemProps } from './CellAccountMultiselectItem.types';

const CellAccountMultiselectItem = ({
  style,
  avatarAccountAddress,
  avatarAccountType,
  title,
  secondaryText,
  tertiaryText,
  tagLabel,
  isSelected = false,
  children,
  ...props
}: CellAccountMultiselectItemProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <MultiselectItem
      isSelected={isSelected}
      style={styles.base}
      testID={CELL_ACCOUNT_MULTI_SELECT_ITEM_TEST_ID}
      {...props}
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
    </MultiselectItem>
  );
};

export default CellAccountMultiselectItem;
