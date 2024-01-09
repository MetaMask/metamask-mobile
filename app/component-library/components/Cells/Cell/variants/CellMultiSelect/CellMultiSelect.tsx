/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import BaseListItemMultiSelect from '../../../../../base-components/ListItem/BaseListItemMultiSelect';
import CellBase from '../../foundation/CellBase';
import { CellModalSelectorsIDs } from '../../../../../../../e2e/selectors/Modals/CellModal.selectors';

// Internal dependencies.
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
    <BaseListItemMultiSelect
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
        style={styles.cell}
      >
        {children}
      </CellBase>
    </BaseListItemMultiSelect>
  );
};

export default CellMultiSelect;
