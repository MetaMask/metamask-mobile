/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import BaseSelectWrapper from '../../../../base-components/Select/BaseSelectWrapper';
import SelectButton from '../SelectButton';

// Internal dependencies.
import { SelectWrapperProps } from './SelectWrapper.types';

const SelectWrapper: React.FC<SelectWrapperProps> = ({
  value,
  placeholder,
  selectButtonProps,
  ...props
}) => (
  <BaseSelectWrapper
    {...props}
    triggerEl={
      <SelectButton
        value={value}
        placeholder={placeholder}
        {...selectButtonProps}
      />
    }
  />
);

export default SelectWrapper;
