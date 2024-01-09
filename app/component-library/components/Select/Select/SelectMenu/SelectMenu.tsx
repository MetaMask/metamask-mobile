/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../hooks';
import BaseSelectMenu from '../../../../base-components/Select/BaseSelectMenu';
import ListSelect from '../../../List/ListSelect';

// Internal dependencies.
import styleSheet from './SelectMenu.styles';
import { SelectMenuProps } from './SelectMenu.types';

const SelectMenu: React.FC<SelectMenuProps> = ({
  style,
  options,
  headerEl,
  footerEl,
  ...listSelectProps
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <BaseSelectMenu style={styles.base} headerEl={headerEl} footerEl={footerEl}>
      <ListSelect options={options} {...listSelectProps} />
    </BaseSelectMenu>
  );
};

export default SelectMenu;
