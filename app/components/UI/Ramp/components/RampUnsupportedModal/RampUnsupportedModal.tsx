import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';

import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { RAMP_UNSUPPORTED_MODAL_TEST_IDS } from './RampUnsupportedModal.testIds';

export const createRampUnsupportedModalNavigationDetails =
  createNavigationDetails(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.UNSUPPORTED_REGION_MODAL,
  );

function RampUnsupportedModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      isInteractable={false}
      testID={RAMP_UNSUPPORTED_MODAL_TEST_IDS.MODAL}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: RAMP_UNSUPPORTED_MODAL_TEST_IDS.CLOSE_BUTTON,
        }}
      >
        <Text variant={TextVariant.HeadingMd}>
          {strings('fiat_on_ramp_aggregator.unsupported_region_modal.title')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-6 pb-6">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings(
            'fiat_on_ramp_aggregator.unsupported_region_modal.description',
          )}
        </Text>
      </Box>

      <Box twClassName="gap-4 px-6 pb-6">
        <Button
          size={ButtonSize.Lg}
          onPress={handleClose}
          variant={ButtonVariant.Primary}
          isFullWidth
        >
          {strings('fiat_on_ramp_aggregator.unsupported_region_modal.got_it')}
        </Button>
      </Box>
    </BottomSheet>
  );
}

export default RampUnsupportedModal;
