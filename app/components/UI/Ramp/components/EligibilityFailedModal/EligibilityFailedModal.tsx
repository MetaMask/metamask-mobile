import React, { useCallback, useRef } from 'react';
import { View, Linking } from 'react-native';
import {
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';

import styleSheet from './EligibilityFailedModal.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { ELIGIBILITY_FAILED_MODAL_TEST_IDS } from './EligibilityFailedModal.testIds';

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
      testID={ELIGIBILITY_FAILED_MODAL_TEST_IDS.MODAL}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: ELIGIBILITY_FAILED_MODAL_TEST_IDS.CLOSE_BUTTON,
        }}
      >
        <Text variant={TextVariant.HeadingMd}>
          {strings('fiat_on_ramp_aggregator.eligibility_failed_modal.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings(
            'fiat_on_ramp_aggregator.eligibility_failed_modal.description',
          )}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          size={ButtonSize.Lg}
          onPress={navigateToContactSupport}
          variant={ButtonVariant.Secondary}
          isFullWidth
        >
          {strings(
            'fiat_on_ramp_aggregator.eligibility_failed_modal.contact_support',
          )}
        </Button>
        <Button
          size={ButtonSize.Lg}
          onPress={handleClose}
          variant={ButtonVariant.Primary}
          isFullWidth
        >
          {strings('fiat_on_ramp_aggregator.eligibility_failed_modal.got_it')}
        </Button>
      </View>
    </BottomSheet>
  );
}

export default EligibilityFailedModal;
