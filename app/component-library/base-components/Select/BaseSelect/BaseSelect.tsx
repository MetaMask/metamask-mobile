/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import BaseSelectWrapper from '../BaseSelectWrapper/BaseSelectWrapper';
import BaseSelectableMenu from '../../Selectable/BaseSelectableMenu';

// Internal dependencies.
import styleSheet from './BaseSelect.styles';
import { BaseSelectProps } from './BaseSelect.types';

const BaseSelect: React.FC<BaseSelectProps> = ({
  style,
  selectButtonProps,
  bottomSheetProps,
  headerEl,
  children,
  footerEl,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <BaseSelectWrapper
      style={styles.base}
      selectButtonProps={selectButtonProps}
      bottomSheetProps={bottomSheetProps}
      {...props}
    >
      <BaseSelectableMenu headerEl={headerEl} footerEl={footerEl}>
        {children}
      </BaseSelectableMenu>
    </BaseSelectWrapper>
  );
};

export default BaseSelect;
