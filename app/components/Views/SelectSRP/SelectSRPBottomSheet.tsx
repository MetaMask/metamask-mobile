import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';

import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import SelectSRP from './SelectSRP';
import { strings } from '../../../../locales/i18n';
import { SelectSRPBottomSheetTestIds } from './SelectSRPBottomSheet.testIds';
import { goBackIfFocused } from './SelectSRPBottomSheet.utils';
import { useElevatedSurface } from '../../../util/theme/themeUtils';
import Routes from '../../../constants/navigation/Routes';

export const SelectSRPBottomSheet = () => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const surfaceClass = useElevatedSurface();
  const goBack = useCallback(() => {
    goBackIfFocused(navigation);
  }, [navigation]);

  // Dismiss the sheet before navigating to the reveal card. Navigating while
  // ROOT_MODAL_FLOW is still open leaves SelectSRP covering RevealPrivateCredential
  // (regression after #33670 made reveal a native-stack card).
  const handleKeyringSelect = useCallback(
    (keyringId: string) => {
      bottomSheetRef.current?.onCloseBottomSheet(() => {
        navigation.navigate(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL, {
          shouldUpdateNav: true,
          keyringId,
        });
      });
    },
    [navigation],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      goBack={goBack}
      twClassName={surfaceClass}
    >
      <BottomSheetHeader
        onBack={goBack}
        backButtonProps={{
          testID: SelectSRPBottomSheetTestIds.HEADER_BACK_BUTTON,
        }}
      >
        {strings('secure_your_wallet.srp_list_selection')}
      </BottomSheetHeader>
      <Box twClassName="-mt-4">
        <SelectSRP onKeyringSelect={handleKeyringSelect} />
      </Box>
    </BottomSheet>
  );
};
