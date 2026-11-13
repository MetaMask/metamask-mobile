import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';

import {
  BottomSheet,
  Box,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import SelectSRP from './SelectSRP';
import { strings } from '../../../../locales/i18n';
import { SelectSRPBottomSheetTestIds } from './SelectSRPBottomSheet.testIds';
import { goBackIfFocused } from './SelectSRPBottomSheet.utils';
import Routes from '../../../constants/navigation/Routes';
import BottomSheetHeaderGlass from '../../../component-library/components-temp/BottomSheetHeaderGlass';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../../selectors/featureFlagController/glassHeaders';

export const SelectSRPBottomSheet = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
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
    <BottomSheet ref={bottomSheetRef} goBack={goBack}>
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onBack={goBack}
        backButtonProps={{
          testID: SelectSRPBottomSheetTestIds.HEADER_BACK_BUTTON,
        }}
      >
        {strings('secure_your_wallet.srp_list_selection')}
      </BottomSheetHeaderGlass>
      <Box twClassName="-mt-4">
        <SelectSRP onKeyringSelect={handleKeyringSelect} />
      </Box>
    </BottomSheet>
  );
};
