import React, { useCallback, useRef } from 'react';
import { StyleSheet } from 'react-native';
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
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';

export interface ProcessingInfoModalParams {
  providerName: string;
  providerSupportUrl?: string;
  statusDescription?: string;
}

export const createProcessingInfoModalNavigationDetails =
  createNavigationDetails<ProcessingInfoModalParams>(
    Routes.RAMP.MODALS.PROCESSING_INFO,
  );

const styles = StyleSheet.create({
  centeredText: {
    textAlign: 'center',
  },
});

function ProcessingInfoModal() {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { providerName, providerSupportUrl, statusDescription } =
    useParams<ProcessingInfoModalParams>();

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleGoToSupport = useCallback(async () => {
    if (!providerSupportUrl) return;
    let urlDomain: string | undefined;
    try {
      urlDomain = new URL(providerSupportUrl).hostname;
    } catch {
      urlDomain = providerSupportUrl;
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_EXTERNAL_LINK_CLICKED)
        .addProperties({
          location: 'Order Details',
          external_link_description: 'Provider Support',
          url_domain: urlDomain,
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    if (await InAppBrowser.isAvailable()) {
      // Close the sheet before the InAppBrowser overlay opens so the two don't overlap.
      handleClose();
      await InAppBrowser.open(providerSupportUrl);
    } else {
      // Navigate without closing the sheet first. If we called handleClose() here,
      // shouldNavigateBack would fire goBack() after the close animation and pop the
      // Webview screen off the stack instead of the modal.
      navigation.navigate('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: providerSupportUrl,
          title: providerName,
        },
      });
    }
  }, [
    providerSupportUrl,
    providerName,
    handleClose,
    navigation,
    trackEvent,
    createEventBuilder,
  ]);

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

      {statusDescription && (
        <Box twClassName="px-6 pb-4">
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.centeredText}
          >
            {statusDescription}
          </Text>
        </Box>
      )}

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
