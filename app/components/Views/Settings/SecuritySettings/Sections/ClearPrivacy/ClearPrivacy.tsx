import React from 'react';
import { View } from 'react-native';
import { styleSheet } from './styles';
import { useStyles } from '../../../../../../component-library/hooks';
import { strings } from '../../../../../../../locales/i18n';
import { CLEAR_PRIVACY_SECTION } from '../../SecuritySettings.constants';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { SecurityPrivacyViewSelectorsIDs } from '../../SecurityPrivacyView.testIds';

interface ClearPrivacyProps {
  onPressClearPrivacy: () => void;
}

const ClearPrivacy = ({ onPressClearPrivacy }: ClearPrivacyProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={[styles.setting]} testID={CLEAR_PRIVACY_SECTION}>
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {strings('app_settings.clear_privacy_title')}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        style={styles.desc}
      >
        {strings('app_settings.clear_privacy_desc')}
      </Text>
      <View style={styles.accessory}>
        <Button
          variant={ButtonVariant.Secondary}
          testID={SecurityPrivacyViewSelectorsIDs.CLEAR_PRIVACY_DATA_BUTTON}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onPressClearPrivacy}
        >
          {strings('app_settings.clear_privacy_title')}
        </Button>
      </View>
    </View>
  );
};

export default ClearPrivacy;
