/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../hooks';
import CellBase from '../../../component-library/components/Cells/Cell/foundation/CellBase';

// Internal dependencies.
import styleSheet from './CellSelectWithMenu.styles';
import { CellSelectWithMenuProps } from './CellSelectWithMenu.types';
import { CellModalSelectorsIDs } from '../../../../e2e/selectors/Modals/CellModal.selectors';
import ListItemMultiSelectButton from '../ListItemMultiSelectButton/ListItemMultiSelectButton';

const CellSelectWithMenu = ({
  style,
  avatarProps,
  title,
  secondaryText,
  tertiaryText,
  tagLabel,
  isSelected = false,
  children,
  ...props
}: CellSelectWithMenuProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <ListItemMultiSelectButton
      isSelected={isSelected}
      style={styles.base}
      testID={CellModalSelectorsIDs.MULTISELECT}
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
    </ListItemMultiSelectButton>
  );
};

export default CellSelectWithMenu;
