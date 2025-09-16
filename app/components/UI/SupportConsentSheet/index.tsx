import React, { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useDispatch } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../component-library/components/Buttons/Button';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet/BottomSheet';
import { BottomSheetRef } from '../../../component-library/components/BottomSheets/BottomSheet/BottomSheet.types';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader/BottomSheetHeader';
import Checkbox from '../../../component-library/components/Checkbox/Checkbox';
import { strings } from '../../../../locales/i18n';
import {
  setShouldShowConsentSheet,
  setDataSharingPreference,
} from '../../../actions/security';

interface SupportConsentSheetProps {
  isVisible: boolean;
  onConsent: () => void;
  onDecline: () => void;
  onClose?: () => void;
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
  },
});

const SupportConsentSheet: React.FC<SupportConsentSheetProps> = ({
  isVisible,
  onConsent,
  onDecline,
  onClose,
}) => {
  const dispatch = useDispatch();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [savePreference, setSavePreference] = useState(true);

  const handleConsent = () => {
    if (savePreference) {
      // Save that we should not show consent sheet anymore
      dispatch(setShouldShowConsentSheet(false));
      // Save that user wants to share data
      dispatch(setDataSharingPreference(true));
    }
    onConsent();
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      // Empty callback to ensure the sheet closes
    });
  };

  const handleDecline = () => {
    if (savePreference) {
      // Save that we should not show consent sheet anymore
      dispatch(setShouldShowConsentSheet(false));
      // Save that user doesn't want to share data
      dispatch(setDataSharingPreference(false));
    }
    onDecline();
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      // Empty callback to ensure the sheet closes
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      onClose={onClose}
      shouldNavigateBack={false}
    >
      <BottomSheetHeader>
        <Text variant={TextVariant.HeadingMd}>
          {strings('support_consent.title')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-4">
        <Text variant={TextVariant.BodyMd} twClassName="mb-6">
          {strings('support_consent.description')}
        </Text>

        <Box twClassName="mb-6">
          <Checkbox
            label={strings('support_consent.save_preference')}
            isChecked={savePreference}
            onPress={() => setSavePreference(!savePreference)}
          />
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="gap-3"
        >
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            onPress={handleDecline}
            style={styles.button}
            label={strings('support_consent.decline')}
          />

          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            onPress={handleConsent}
            style={styles.button}
            label={strings('support_consent.consent')}
          />
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default SupportConsentSheet;
