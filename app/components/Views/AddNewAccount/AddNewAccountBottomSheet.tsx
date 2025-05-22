import React, { useRef } from 'react';
import AddNewAccount from './AddNewAccount';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { AddNewAccountBottomSheetProps } from './AddNewAccountBottomSheet.types';

const AddNewAccountBottomSheet = ({ route }: AddNewAccountBottomSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { scope, clientType } = route?.params || {};

  return (
    <BottomSheet ref={sheetRef}>
      <AddNewAccount scope={scope} clientType={clientType} />
    </BottomSheet>
  );
};

export default AddNewAccountBottomSheet;
