// Third party dependencies.
import React, { useRef } from 'react';

import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';

import SDKLoading from '../../UI/SDKLoading';

const SDKLoadingModal = () => {
  const sheetRef = useRef<SheetBottomRef>(null);

  return (
    <SheetBottom ref={sheetRef}>
      <SDKLoading />
    </SheetBottom>
  );
};

export default SDKLoadingModal;
