import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createStyles } from './styles';
import { useTheme } from '../../../../../../util/theme';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Text from '../../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  CHANGE_PASSWORD_TITLE_ID,
  CHANGE_PASSWORD_BUTTON_ID,
} from '../../../../../../constants/test-ids';

const ChangePassword = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  const resetPassword = (): void => {
    navigation.navigate(Routes.SETTINGS.CHANGE_PASSWORD);
  };

  return (
    <View style={styles.setting} testID={CHANGE_PASSWORD_TITLE_ID}>
      <Text style={styles.title}>
        {strings('password_reset.password_title')}
      </Text>
      <Text style={styles.desc}>{strings('password_reset.password_desc')}</Text>
      <Button
        label={strings('password_reset.change_password')}
        variant={ButtonVariants.Secondary}
        onPress={resetPassword}
        style={styles.confirm}
        testID={CHANGE_PASSWORD_BUTTON_ID}
      />
    </View>
  );
};

export default ChangePassword;
