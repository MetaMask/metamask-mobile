// Third party dependencies
import React, { useRef } from 'react';

// External dependencies
import SDKFeedback from '../../../UI/SDKFeedback';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';

const SDKLoadingModal = () => {
  const sheetRef = useRef<BottomSheetRef>(null);

  return (
    <BottomSheet ref={sheetRef}>
      <SDKFeedback
        onConfirm={() => {
          sheetRef.current?.onCloseBottomSheet();
        }}
      />
    </BottomSheet>
  );
};

export default SDKLoadingModal;
