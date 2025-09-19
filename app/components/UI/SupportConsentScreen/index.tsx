import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  useNavigation,
  useRoute,
  RouteProp,
  ParamListBase,
} from '@react-navigation/native';
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
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader/BottomSheetHeader';
import Checkbox from '../../../component-library/components/Checkbox/Checkbox';
import { strings } from '../../../../locales/i18n';
import {
  setShouldShowConsentSheet,
  setDataSharingPreference,
} from '../../../actions/security';

interface SupportConsentScreenParams {
  onConsent?: () => void;
  onDecline?: () => void;
}

const SupportConsentScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamListBase, string>>();
  const [savePreference, setSavePreference] = useState(true);

  const { onConsent, onDecline } =
    (route.params as SupportConsentScreenParams) || {};

  const handleConsent = () => {
    if (savePreference) {
      // Save that we should not show consent sheet anymore
      dispatch(setShouldShowConsentSheet(false));
      // Save that user wants to share data
      dispatch(setDataSharingPreference(true));
    }
    onConsent?.();
  };

  const handleDecline = () => {
    if (savePreference) {
      // Save that we should not show consent sheet anymore
      dispatch(setShouldShowConsentSheet(false));
      // Save that user doesn't want to share data
      dispatch(setDataSharingPreference(false));
    }
    onDecline?.();
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <BottomSheet onClose={handleClose} shouldNavigateBack={false}>
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

export default SupportConsentScreen;
