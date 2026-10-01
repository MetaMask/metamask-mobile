import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  ButtonsAlignment,
  Checkbox,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  ParamListBase,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { strings } from '../../../../locales/i18n';
import {
  setDataSharingPreference,
  setShouldShowConsentSheet,
} from '../../../actions/security';

export interface SupportConsentSheetParams {
  onConfirm: () => void;
  onReject: () => void;
}

/**
 * Consent sheet shown at every contact-support entry point until the user
 * saves a choice with "Save my preference". Once saved, `navigateToSupportConsent`
 * skips the sheet and applies the saved choice; the user can turn this off in
 * Settings > Security & privacy > "Remember my support preference".
 */
const SupportConsentSheet = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RouteProp<ParamListBase, string>>();
  const { onConfirm, onReject } =
    (route.params as SupportConsentSheetParams) || {};
  const [savePreference, setSavePreference] = useState(true);

  const persistPreference = (shareData: boolean) => {
    if (!savePreference) {
      return;
    }
    dispatch(setShouldShowConsentSheet(false));
    dispatch(setDataSharingPreference(shareData));
  };

  // Intentionally distinct from handleReject: swipe/backdrop/header-close is a
  // pure dismiss (no support URL opened at all, nothing saved), while
  // "Don't share" explicitly opens the plain (non-enriched) support URL.
  const handleDismiss = () => {
    navigation.goBack();
  };

  const handleConfirm = () => {
    persistPreference(true);
    navigation.goBack();
    onConfirm?.();
  };

  const handleReject = () => {
    persistPreference(false);
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
      <Checkbox
        isSelected={savePreference}
        onChange={setSavePreference}
        label={strings('support_consent.save_preference')}
        twClassName="px-4 pb-4"
        testID="support-consent-sheet-save-preference-checkbox"
      />
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
