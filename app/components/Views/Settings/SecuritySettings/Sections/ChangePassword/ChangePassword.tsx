import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createStyles } from './styles';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
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
      <Text variant={TextVariant.BodyLGMedium}>
        {strings('password_reset.password_title')}
      </Text>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.desc}
      >
        {strings('password_reset.password_desc')}
      </Text>
      <Button
        label={strings('password_reset.change_password')}
        variant={ButtonVariants.Primary}
        onPress={resetPassword}
        style={styles.confirm}
        width={ButtonWidthTypes.Full}
        size={ButtonSize.Lg}
        testID={SecurityPrivacyViewSelectorsIDs.CHANGE_PASSWORD_BUTTON}
      />
    </View>
  );
};

export default ChangePassword;
