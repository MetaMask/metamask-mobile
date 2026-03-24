import React from 'react';
import {
  TextField,
  IconName,
  TextVariant,
  Text,
  TextFieldSize,
  Box,
  FontWeight,
  ButtonIcon,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { RevealSeedViewSelectorsIDs } from '../RevealSeedView.testIds';
import { useTheme } from '../../../../util/theme';
import { PasswordEntryProps } from '../types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const PasswordEntry = ({
  onPasswordChange,
  onSubmit,
  warningMessage,
  showPassword,
  onToggleShowPassword,
}: PasswordEntryProps) => {
  const tw = useTailwind();
  const { colors, themeAppearance } = useTheme();

  return (
    <>
      <Text
        twClassName="mb-1"
        color={TextColor.TextDefault}
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
      >
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
        autoComplete="password"
        endAccessory={
          <ButtonIcon
            iconName={showPassword ? IconName.Eye : IconName.EyeSlash}
            onPress={onToggleShowPassword}
          />
        }
        size={TextFieldSize.Lg}
      />
      <Text
        twClassName="mt-2"
        color={TextColor.ErrorDefault}
        variant={TextVariant.BodySm}
        testID={RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID}
      >
        {warningMessage}
      </Text>
    </>
  );
};

export default PasswordEntry;
