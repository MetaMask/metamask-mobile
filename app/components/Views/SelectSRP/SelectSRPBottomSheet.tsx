import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';

import {
  BottomSheet,
  type BottomSheetRef,
  BottomSheetHeader,
  Box,
} from '@metamask/design-system-react-native';

import SelectSRP from './SelectSRP';
import { strings } from '../../../../locales/i18n';
import { SelectSRPBottomSheetTestIds } from './SelectSRPBottomSheet.testIds';
import { goBackIfFocused } from './SelectSRPBottomSheet.utils';

export const SelectSRPBottomSheet = () => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();

  const goBack = useCallback(() => {
    goBackIfFocused(navigation);
  }, [navigation]);

  return (
    <BottomSheet ref={bottomSheetRef} goBack={goBack}>
      <BottomSheetHeader
        onBack={goBack}
        backButtonProps={{
          testID: SelectSRPBottomSheetTestIds.HEADER_BACK_BUTTON,
        }}
      >
        {strings('secure_your_wallet.srp_list_selection')}
      </BottomSheetHeader>
      <Box twClassName="-mt-4">
        <SelectSRP />
      </Box>
    </BottomSheet>
  );
};
