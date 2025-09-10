import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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

interface SupportConsentSheetProps {
  isVisible: boolean;
  onConsent: () => void;
  onDecline: () => void;
}

const SupportConsentSheet: React.FC<SupportConsentSheetProps> = ({
  isVisible,
  onConsent,
  onDecline,
}) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [savePreference, setSavePreference] = useState(true);

  const handleConsent = () => {
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      onConsent();
    });
  };

  const handleDecline = () => {
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      onDecline();
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet ref={bottomSheetRef}>
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
            style={{ flex: 1 }}
            label={strings('support_consent.decline')}
          />

          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            onPress={handleConsent}
            style={{ flex: 1 }}
            label={strings('support_consent.consent')}
          />
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default SupportConsentSheet;
