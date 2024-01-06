/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import Select from '../../Selectables/Select/Select';
import TokenListItem from '../TokenListItem/TokenListItem';
import { SelectButtonProps } from '../../Selectables/Select/foundation/SelectButton/SelectButton.types';

// Internal dependencies.
import styleSheet from './TokenSelect.styles';
import { TokenSelectProps } from './TokenSelect.types';

const TokenSelect: React.FC<TokenSelectProps> = ({
  style,
  value,
  options,
  selectButtonProps,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  const alteredSelectButtonProps: SelectButtonProps = {
    SkinComponent: TokenListItem,
    ...selectButtonProps,
  };
  return (
    <Select
      style={styles.base}
      options={options}
      value={value}
      SkinComponent={TokenListItem}
      selectButtonProps={alteredSelectButtonProps}
      {...props}
    />
  );
};

export default TokenSelect;
