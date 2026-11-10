import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectMfaUiKitEnabled } from '../../../../../../selectors/featureFlagController/mfaUiKit';
import { SecurityPrivacyViewSelectorsIDs } from '../../SecurityPrivacyView.testIds';

const MfaSection = () => {
  const navigation = useNavigation();
  const isMfaUiKitEnabled = useSelector(selectMfaUiKitEnabled);

  if (!isMfaUiKitEnabled) {
    return null;
  }

  return (
    <Box
      twClassName="mt-6"
      testID={SecurityPrivacyViewSelectorsIDs.MFA_SECTION}
    >
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {strings('mfa.settings.title')}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        twClassName="mt-2"
      >
        {strings('mfa.settings.description')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        onPress={() => navigation.navigate(Routes.MFA.SETTINGS)}
        twClassName="mt-4"
        isFullWidth
        size={ButtonSize.Lg}
        testID={SecurityPrivacyViewSelectorsIDs.MFA_BUTTON}
      >
        {strings('mfa.settings.manage')}
      </Button>
    </Box>
  );
};

export default MfaSection;
