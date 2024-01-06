/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import Dropdown from '../../Selectables/Dropdown/Dropdown';
import TokenListItem from '../TokenListItem/TokenListItem';
import { DropdownButtonProps } from '../../Selectables/Dropdown/foundation/DropdownButton/DropdownButton.types';

// Internal dependencies.
import styleSheet from './TokenDropdown.styles';
import { TokenDropdownProps } from './TokenDropdown.types';

const TokenDropdown: React.FC<TokenDropdownProps> = ({
  style,
  value,
  options,
  dropdownButtonProps,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  const alteredDropdownButtonProps: DropdownButtonProps = {
    SkinComponent: TokenListItem,
    ...dropdownButtonProps,
  };
  return (
    <Dropdown
      style={styles.base}
      options={options}
      value={value}
      SkinComponent={TokenListItem}
      dropdownButtonProps={alteredDropdownButtonProps}
      {...props}
    />
  );
};

export default TokenDropdown;
