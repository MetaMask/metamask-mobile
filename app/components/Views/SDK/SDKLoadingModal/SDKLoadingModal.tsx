// Third party dependencies.
import React, { useRef } from 'react';

// External dependencies
import SDKLoading from '@components/UI/SDKLoading';
import BottomSheet, {
  BottomSheetRef,
} from '@component-library/components/BottomSheets/BottomSheet';

const SDKLoadingModal = () => {
  const sheetRef = useRef<BottomSheetRef>(null);

  return (
    <BottomSheet ref={sheetRef}>
      <SDKLoading />
    </BottomSheet>
  );
};

export default SDKLoadingModal;
