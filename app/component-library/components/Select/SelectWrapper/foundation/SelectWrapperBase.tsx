/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import BottomSheet from '../../../BottomSheets/BottomSheet';

// Internal dependencies.
import { SelectWrapperBaseProps } from './SelectWrapperBase.types';

const SelectWrapperBase: React.FC<SelectWrapperBaseProps> = ({
  triggerEl,
  isBottomSheetOpen = false,
  bottomSheetProps,
  children,
}) => (
  <>
    {triggerEl && triggerEl}
    {isBottomSheetOpen && (
      <BottomSheet {...bottomSheetProps}>{children}</BottomSheet>
    )}
  </>
);

export default SelectWrapperBase;
