import React, { Fragment, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Box } from '@metamask/design-system-react-native';

import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import SelectSRP from './SelectSRP';
import { strings } from '../../../../locales/i18n';

export const SelectSRPBottomSheet = () => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();

  return (
    <BottomSheet ref={bottomSheetRef}>
      <SafeAreaView>
        <Fragment>
          <SheetHeader
            title={strings('secure_your_wallet.srp_list_selection')}
            onBack={() => {
              navigation.goBack();
            }}
          />
          <Box twClassName="-mt-4">
            <SelectSRP />
          </Box>
        </Fragment>
      </SafeAreaView>
    </BottomSheet>
  );
};
