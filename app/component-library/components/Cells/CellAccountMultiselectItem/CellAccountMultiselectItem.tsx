/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import MultiselectItem from '../../Select/Multiselect/MultiselectItem';
import CellAccountContent from '../CellAccountContent';

// Internal dependencies.
import { CELL_ACCOUNT_MULTI_SELECT_TEST_ID } from './CellAccountMultiselectItem.constants';
import styleSheet from './CellAccountMultiselectItem.styles';
import { CellAccountMultiselectItemProps } from './CellAccountMultiselectItem.types';

const CellAccountMultiselectItem = ({
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
}: CellAccountMultiselectItemProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <MultiselectItem
      isSelected={isSelected}
      style={styles.base}
      testID={CELL_ACCOUNT_MULTI_SELECT_TEST_ID}
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
    </MultiselectItem>
  );
};

export default CellAccountMultiselectItem;
