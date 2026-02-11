import React from 'react';
import { ButtonIcon, IconName } from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import TextField from '../../../../component-library/components/Form/TextField/TextField';
import { strings } from '../../../../../locales/i18n';
import { RevealSeedViewSelectorsIDs } from '../RevealSeedView.testIds';
import { useTheme } from '../../../../util/theme';
import { PasswordEntryProps } from '../types';

const PasswordEntry = ({
  onPasswordChange,
  onSubmit,
  warningMessage,
  showPassword,
  onToggleShowPassword,
  styles,
}: PasswordEntryProps) => {
  const { colors, themeAppearance } = useTheme();

  return (
    <>
      <Text style={styles.enterPassword} variant={TextVariant.BodyMDMedium}>
        {strings('reveal_credential.enter_password')}
      </Text>
      <TextField
        placeholder={'Password'}
        placeholderTextColor={colors.text.muted}
        onChangeText={onPasswordChange}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        onSubmitEditing={onSubmit}
        keyboardAppearance={themeAppearance}
        testID={RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID}
        returnKeyType="done"
        autoComplete="new-password"
        autoFocus
        endAccessory={
          <ButtonIcon
            iconName={showPassword ? IconName.Eye : IconName.EyeSlash}
            onPress={onToggleShowPassword}
          />
        }
      />
      <Text
        style={styles.warningText}
        testID={RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID}
      >
        {warningMessage}
      </Text>
    </>
  );
};

export default PasswordEntry;
