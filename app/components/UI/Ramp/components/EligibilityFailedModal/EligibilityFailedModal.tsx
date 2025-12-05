import React, { useCallback, useRef } from 'react';
import { View, Linking } from 'react-native';
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

import styleSheet from './EligibilityFailedModal.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

const SUPPORT_URL = 'https://support.metamask.io';

export const createEligibilityFailedModalNavigationDetails =
  createNavigationDetails(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.ELIGIBILITY_FAILED_MODAL,
  );

function EligibilityFailedModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});

  const navigateToContactSupport = useCallback(() => {
    Linking.openURL(SUPPORT_URL).catch((error: unknown) => {
      console.error('Failed to open support URL:', error);
    });
  }, []);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      isInteractable={false}
      testID="eligibility-failed-modal"
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: 'bottomsheetheader-close-button' }}
      >
        <Text variant={TextVariant.HeadingMD}>
          {strings('fiat_on_ramp_aggregator.eligibility_failed_modal.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings(
            'fiat_on_ramp_aggregator.eligibility_failed_modal.description',
          )}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          size={ButtonSize.Lg}
          onPress={navigateToContactSupport}
          label={strings(
            'fiat_on_ramp_aggregator.eligibility_failed_modal.contact_support',
          )}
          variant={ButtonVariants.Secondary}
          width={ButtonWidthTypes.Full}
        />
        <Button
          size={ButtonSize.Lg}
          onPress={handleClose}
          label={strings(
            'fiat_on_ramp_aggregator.eligibility_failed_modal.got_it',
          )}
          variant={ButtonVariants.Primary}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </BottomSheet>
  );
}

export default EligibilityFailedModal;
