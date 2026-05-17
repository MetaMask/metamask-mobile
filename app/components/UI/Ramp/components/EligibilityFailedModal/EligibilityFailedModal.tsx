import React, { useCallback, useRef } from 'react';
import { View, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';

import styleSheet from './EligibilityFailedModal.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { ELIGIBILITY_FAILED_MODAL_TEST_IDS } from './EligibilityFailedModal.testIds';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';

const SUPPORT_URL = METAMASK_SUPPORT_URL;

export const createEligibilityFailedModalNavigationDetails =
  createNavigationDetails(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.ELIGIBILITY_FAILED_MODAL,
  );

function EligibilityFailedModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
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
      goBack={navigation.goBack}
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
