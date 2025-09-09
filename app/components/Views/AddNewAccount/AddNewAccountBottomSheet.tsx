import React, { useRef } from 'react';
import AddNewAccount from './AddNewAccount';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../util/navigation/types';

type AddNewAccountBottomSheetProps = StackScreenProps<
  RootParamList,
  'AddAccount'
>;

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
