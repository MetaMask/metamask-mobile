/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import SelectWrapper from './SelectWrapper/SelectWrapper';
import SelectMenu from './SelectMenu';

// Internal dependencies.
import styleSheet from './Select.styles';
import { SelectProps } from './Select.types';

const Select: React.FC<SelectProps> = ({
  style,
  headerEl,
  options,
  footerEl,
  selectedOption,
  topAccessory,
  bottomAccessory,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <SelectWrapper style={styles.base} {...props}>
      <SelectMenu
        headerEl={headerEl}
        footerEl={footerEl}
        options={options}
        selectedOption={selectedOption}
        topAccessory={topAccessory}
        bottomAccessory={bottomAccessory}
      />
    </SelectWrapper>
  );
};

export default Select;
