import React from 'react';
import AddNewAccount from './AddNewAccount';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import { AddNewAccountBottomSheetProps } from './AddNewAccountBottomSheet.types';

const AddNewAccountBottomSheet = ({ route }: AddNewAccountBottomSheetProps) => {
  const { scope, clientType } = route?.params || {};

  return (
    <BottomSheet>
      <AddNewAccount scope={scope} clientType={clientType} />
    </BottomSheet>
  );
};

export default AddNewAccountBottomSheet;
