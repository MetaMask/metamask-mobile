import React, { useCallback, useRef } from 'react';
import { Box } from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';

import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

export const createRampUnsupportedModalNavigationDetails =
  createNavigationDetails(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.UNSUPPORTED_REGION_MODAL,
  );

function RampUnsupportedModal() {
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      isInteractable={false}
      testID="ramp-unsupported-modal"
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: 'bottomsheetheader-close-button' }}
      >
        <Text variant={TextVariant.HeadingMD}>
          {strings('fiat_on_ramp_aggregator.unsupported_region_modal.title')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-6 pb-6">
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings(
            'fiat_on_ramp_aggregator.unsupported_region_modal.description',
          )}
        </Text>
      </Box>

      <Box twClassName="gap-4 px-6 pb-6">
        <Button
          size={ButtonSize.Lg}
          onPress={handleClose}
          label={strings(
            'fiat_on_ramp_aggregator.unsupported_region_modal.got_it',
          )}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
      </Box>
    </BottomSheet>
  );
}

export default RampUnsupportedModal;
