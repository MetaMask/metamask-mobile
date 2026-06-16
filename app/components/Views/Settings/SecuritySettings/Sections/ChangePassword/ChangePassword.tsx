import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createStyles } from './styles';
import {
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
import { SecurityPrivacyViewSelectorsIDs } from '../../SecurityPrivacyView.testIds';

const ChangePassword = () => {
  const styles = createStyles();
  const navigation = useNavigation();

  const resetPassword = (): void => {
    navigation.navigate(Routes.SETTINGS.CHANGE_PASSWORD);
  };

  return (
    <View
      style={styles.setting}
      testID={SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_CONTAINER}
    >
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {strings('password_reset.password_title')}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        style={styles.desc}
      >
        {strings('password_reset.password_desc')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        onPress={resetPassword}
        style={styles.confirm}
        isFullWidth
        size={ButtonSize.Lg}
        testID={SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_BUTTON}
      >
        {strings('password_reset.change_password')}
      </Button>
    </View>
  );
};

export default ChangePassword;
