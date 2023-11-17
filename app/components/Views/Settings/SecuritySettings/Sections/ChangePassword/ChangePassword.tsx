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
import { SecurityPrivacyViewSelectorsIDs } from '../../../../../../../e2e/selectors/Settings/SecurityAndPrivacy/SecurityPrivacyView.selectors';

const ChangePassword = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  const resetPassword = (): void => {
    navigation.navigate(Routes.SETTINGS.CHANGE_PASSWORD);
  };

  return (
    <View
      style={styles.setting}
      testID={SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_TITLE}
    >
      <Text style={styles.title}>
        {strings('password_reset.password_title')}
      </Text>
      <Text style={styles.desc}>{strings('password_reset.password_desc')}</Text>
      <Button
        label={strings('password_reset.change_password')}
        variant={ButtonVariants.Secondary}
        onPress={resetPassword}
        style={styles.confirm}
        testID={SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_BUTTON}
      />
    </View>
  );
};

export default ChangePassword;
