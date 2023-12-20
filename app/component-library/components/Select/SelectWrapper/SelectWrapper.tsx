/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import SelectButton from '../SelectButton/SelectButton';
import { SelectValueProps } from '../SelectValue/SelectValue.types';

// Internal dependencies.
import SelectWrapperBase from './foundation/SelectWrapperBase';
import { SelectWrapperProps } from './SelectWrapper.types';

const SelectWrapper: React.FC<SelectWrapperProps> = ({
  placeholder = '',
  value,
  selectButtonProps,
  ...props
}) => {
  const renderTriggerEl = () => {
    const selectButtonContent: SelectValueProps = value || {
      description: placeholder,
    };
    return <SelectButton {...selectButtonContent} {...selectButtonProps} />;
  };

  return <SelectWrapperBase triggerEl={renderTriggerEl()} {...props} />;
};

export default SelectWrapper;
