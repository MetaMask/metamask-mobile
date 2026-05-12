import React, { useRef } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';
import AddNewAccount from './AddNewAccount';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import { AddNewAccountBottomSheetRouteParams } from './AddNewAccountBottomSheet.types';

const AddNewAccountBottomSheet = () => {
  const route =
    useRoute<
      RouteProp<{ params: AddNewAccountBottomSheetRouteParams }, 'params'>
    >();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { scope, clientType } = route?.params || {};

  return (
    <BottomSheet ref={sheetRef}>
      <AddNewAccount scope={scope} clientType={clientType} />
    </BottomSheet>
  );
};

export default AddNewAccountBottomSheet;
