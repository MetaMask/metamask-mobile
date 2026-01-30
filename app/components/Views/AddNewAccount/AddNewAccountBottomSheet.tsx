import React, { useRef } from 'react';
import { useRoute, RouteProp } from '@react-navigation/native';
import AddNewAccount from './AddNewAccount';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import type { RootParamList } from '../../../util/navigation/types';

type AddNewAccountBottomSheetRouteProp = RouteProp<RootParamList, 'AddAccount'>;

const AddNewAccountBottomSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const route = useRoute<AddNewAccountBottomSheetRouteProp>();
  const { scope, clientType } = route?.params || {};

  return (
    <BottomSheet ref={sheetRef}>
      <AddNewAccount scope={scope} clientType={clientType} />
    </BottomSheet>
  );
};

export default AddNewAccountBottomSheet;
