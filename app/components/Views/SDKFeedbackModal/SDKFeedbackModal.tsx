// Third party dependencies.
import SDKFeedback from '../../../../app/components/UI/SDKFeedback';
import React, { useRef } from 'react';

import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';

const SDKLoadingModal = () => {
  const sheetRef = useRef<SheetBottomRef>(null);

  return (
    <SheetBottom ref={sheetRef}>
      <SDKFeedback />
    </SheetBottom>
  );
};

export default SDKLoadingModal;
