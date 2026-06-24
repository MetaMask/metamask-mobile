import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { RAMPS_SERVICE_DISRUPTION_MODAL_TEST_IDS } from './RampsServiceDisruptionModal.testIds';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';

export const createRampsServiceDisruptionModalNavigationDetails =
  createNavigationDetails(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.RAMPS_SERVICE_DISRUPTION_MODAL,
  );

function RampsServiceDisruptionModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const surfaceClass = useElevatedSurface();

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      isInteractable={false}
      testID={RAMPS_SERVICE_DISRUPTION_MODAL_TEST_IDS.MODAL}
      twClassName={surfaceClass}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: RAMPS_SERVICE_DISRUPTION_MODAL_TEST_IDS.CLOSE_BUTTON,
        }}
      >
        <Text variant={TextVariant.HeadingSm}>
          {strings('fiat_on_ramp_aggregator.service_disruption_modal.title')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-6 pb-6">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings(
            'fiat_on_ramp_aggregator.service_disruption_modal.description',
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
          {strings('fiat_on_ramp_aggregator.service_disruption_modal.got_it')}
        </Button>
      </Box>
    </BottomSheet>
  );
}

export default RampsServiceDisruptionModal;
