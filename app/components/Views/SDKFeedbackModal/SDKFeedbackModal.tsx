import SDKFeedback from '../../../../app/components/UI/SDKFeedback';
import React, { useRef } from 'react';
import { useNavigation } from '@react-navigation/native';

import SheetBottom, {
  SheetBottomRef,
} from '../../../component-library/components/Sheet/SheetBottom';

const SDKLoadingModal = () => {
  const sheetRef = useRef<SheetBottomRef>(null);
  const navigation = useNavigation();

  return (
    <SheetBottom ref={sheetRef}>
      <SDKFeedback
        onConfirm={() => {
          navigation.goBack();
        }}
      />
    </SheetBottom>
  );
};

export default SDKLoadingModal;
