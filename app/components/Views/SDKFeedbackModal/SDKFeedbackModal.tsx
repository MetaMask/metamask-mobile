import SDKFeedback from '../../../../app/components/UI/SDKFeedback';
import React, { useRef } from 'react';

import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';

const SDKLoadingModal = () => {
  const sheetRef = useRef<SheetBottomRef>(null);

  return (
    <SheetBottom ref={sheetRef}>
      <SDKFeedback
        onConfirm={() => {
          sheetRef.current?.hide();
        }}
      />
    </SheetBottom>
  );
};

export default SDKLoadingModal;
