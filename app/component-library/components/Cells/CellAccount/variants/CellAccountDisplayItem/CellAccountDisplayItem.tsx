/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import CellAccountBaseItem from '../../foundation/CellAccountBaseItem';
import CellAccountDisplayItemContainer from '../../foundation/CellAccountDisplayItemContainer';

// Internal dependencies.
import { CELL_ACCOUNT_DISPLAY_ITEM_TEST_ID } from './CellAccountDisplayItem.constants';
import styleSheet from './CellAccountDisplayItem.styles';
import { CellAccountDisplayItemProps } from './CellAccountDisplayItem.types';

const CellAccountDisplayItem = ({
  style,
  avatarAccountAddress,
  avatarAccountType,
  title,
  secondaryText,
  tertiaryText,
  tagLabel,
  children,
}: CellAccountDisplayItemProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <CellAccountDisplayItemContainer
      style={styles.base}
      testID={CELL_ACCOUNT_DISPLAY_ITEM_TEST_ID}
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
    </CellAccountDisplayItemContainer>
  );
};

export default CellAccountDisplayItem;
