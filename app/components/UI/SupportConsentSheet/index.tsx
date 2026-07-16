import React from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  ButtonsAlignment,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  ParamListBase,
} from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';

export interface SupportConsentSheetParams {
  onConfirm: () => void;
  onReject: () => void;
}

/**
 * Consent sheet shown at every contact-support entry point. The choice is not
 * persisted, matching the extension's behavior of asking on every visit
 * (see extension PR #44482).
 */
const SupportConsentSheet = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamListBase, string>>();
  const { onConfirm, onReject } =
    (route.params as SupportConsentSheetParams) || {};

  // Intentionally distinct from handleReject: swipe/backdrop/header-close is a
  // pure dismiss (no support URL opened at all), while "Don't share" explicitly
  // opens the plain (non-enriched) support URL.
  const handleDismiss = () => {
    navigation.goBack();
  };

  const handleConfirm = () => {
    navigation.goBack();
    onConfirm?.();
  };

  const handleReject = () => {
    navigation.goBack();
    onReject?.();
  };

  return (
    <BottomSheet goBack={navigation.goBack} testID="support-consent-sheet">
      <BottomSheetHeader
        onClose={handleDismiss}
        closeButtonProps={{ testID: 'support-consent-sheet-close-button' }}
      >
        {strings('support_consent.title')}
      </BottomSheetHeader>
      <Text variant={TextVariant.BodyMd} twClassName="px-4 pb-4">
        {strings('support_consent.description')}
      </Text>
      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Horizontal}
        primaryButtonProps={{
          children: strings('support_consent.confirm'),
          onPress: handleConfirm,
          testID: 'support-consent-sheet-confirm-button',
        }}
        secondaryButtonProps={{
          children: strings('support_consent.reject'),
          onPress: handleReject,
          testID: 'support-consent-sheet-reject-button',
        }}
      />
    </BottomSheet>
  );
};

export default SupportConsentSheet;
