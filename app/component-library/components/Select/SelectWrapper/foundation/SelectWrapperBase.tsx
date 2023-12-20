/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState, useCallback, useRef } from 'react';

// External dependencies.
import BottomSheet, { BottomSheetRef } from '../../../BottomSheets/BottomSheet';

// Internal dependencies.
import { SelectWrapperBaseProps } from './SelectWrapperBase.types';

const SelectWrapperBase: React.FC<SelectWrapperBaseProps> = ({
  triggerEl,
  isBottomSheetOpen = false,
  bottomSheetProps,
  children,
}) => {
  const [isMenuOpened, setIsMenuOpened] = useState(isBottomSheetOpen);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const onMenuOpen = useCallback(() => {
    setIsMenuOpened(true);
    bottomSheetProps?.onOpen?.();
  }, [setIsMenuOpened, bottomSheetProps]);

  const onMenuClose = useCallback(
    (hasPendingAction: boolean) => {
      setIsMenuOpened(false);
      bottomSheetProps?.onClose?.(hasPendingAction);
    },
    [setIsMenuOpened, bottomSheetProps],
  );

  return (
    <>
      {triggerEl && triggerEl}
      {isMenuOpened && (
        <BottomSheet
          ref={bottomSheetRef}
          onOpen={onMenuOpen}
          onClose={onMenuClose}
          {...bottomSheetProps}
        >
          {children}
        </BottomSheet>
      )}
    </>
  );
};

export default SelectWrapperBase;
