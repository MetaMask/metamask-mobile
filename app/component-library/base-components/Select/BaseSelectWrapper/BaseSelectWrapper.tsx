/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import BaseSelectButton from '../BaseSelectButton/BaseSelectButton';
import BaseSelectableWrapper from '../../Selectable/BaseSelectableWrapper/BaseSelectableWrapper';

// Internal dependencies.
import { BaseSelectWrapperProps } from './BaseSelectWrapper.types';

const BaseSelectWrapper: React.FC<BaseSelectWrapperProps> = ({
  selectButtonProps,
  value,
  placeholder,
  triggerEl,
  ...props
}) => (
  <BaseSelectableWrapper
    triggerEl={
      triggerEl || (
        <BaseSelectButton placeholder={placeholder} {...selectButtonProps}>
          {value && value}
        </BaseSelectButton>
      )
    }
    {...props}
  />
);

export default BaseSelectWrapper;
