import React, { useCallback, useRef } from 'react';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';

export interface ProcessingInfoModalParams {
  providerName: string;
  providerSupportUrl?: string;
}

export const createProcessingInfoModalNavigationDetails =
  createNavigationDetails<ProcessingInfoModalParams>(
    Routes.RAMP.MODALS.PROCESSING_INFO,
  );

function ProcessingInfoModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { providerName, providerSupportUrl } =
    useParams<ProcessingInfoModalParams>();

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleGoToSupport = useCallback(async () => {
    if (!providerSupportUrl) return;
    handleClose();
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(providerSupportUrl);
    } else {
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: providerSupportUrl,
          title: providerName,
        },
      });
    }
  }, [providerSupportUrl, providerName, handleClose, navigation]);

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      isInteractable={false}
      testID="processing-info-modal"
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: 'processing-info-modal-close-button' }}
      />

      <Box twClassName="px-6 pb-4">
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('ramps_order_details.processing_info_modal_description')}
        </Text>
      </Box>

      <Box twClassName="px-6 pb-6">
        <Button
          size={ButtonSize.Lg}
          onPress={handleGoToSupport}
          label={strings('ramps_order_details.go_to_provider_support', {
            provider: providerName,
          })}
          variant={ButtonVariants.Secondary}
          width={ButtonWidthTypes.Full}
        />
      </Box>
    </BottomSheet>
  );
}

export default ProcessingInfoModal;
