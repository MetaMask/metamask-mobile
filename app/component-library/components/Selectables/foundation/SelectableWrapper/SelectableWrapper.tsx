/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import BottomSheet from '../../../BottomSheets/BottomSheet';

// Internal dependencies.
import { SelectableWrapperProps } from './SelectableWrapper.types';

const SelectableWrapper: React.FC<SelectableWrapperProps> = ({
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

export default SelectableWrapper;
