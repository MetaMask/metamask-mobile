import React, { useCallback, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { AUTHENTICATION_TYPE, BIOMETRY_TYPE } from 'react-native-keychain';
import { createStyles } from './styles';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../util/theme';

interface Props {
  shouldRenderBiometricOption:
    | BIOMETRY_TYPE
    | AUTHENTICATION_TYPE
    | string
    | null;
  biometryChoiceState: boolean;
  onUpdateBiometryChoice: (biometryEnabled: boolean) => void;
  onUpdateRememberMe: (rememberMeEnabled: boolean) => void;
}

/**
 * View that renders the toggle for login options
 * The highest priority login option is biometrics and will always get rendered over other options IF it is enabled.
 * If the user has enabled login with remember me in settings and has turned off biometrics then remember me will be the option
 * If both of these features are disabled then no options will be rendered
 */
const LoginOptionsSwitch = ({
  shouldRenderBiometricOption,
  biometryChoiceState,
  onUpdateBiometryChoice,
  onUpdateRememberMe,
}: Props) => {
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);
  const allowLoginWithRememberMe = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.security.allowLoginWithRememberMe,
  );
  const [rememberMeEnabled, setRememberMeEnabled] = useState<boolean>(false);

  const onBiometryValueChanged = useCallback(
    async (newBiometryChoice: boolean) => {
      onUpdateBiometryChoice(newBiometryChoice);
    },
    [onUpdateBiometryChoice],
  );

  const onRememberMeValueChanged = useCallback(async () => {
    onUpdateRememberMe(!rememberMeEnabled);
    setRememberMeEnabled(!rememberMeEnabled);
  }, [onUpdateRememberMe, rememberMeEnabled]);

  // should only render remember me option if biometrics are disabled and rememberOptionMeEnabled is enabled in security settings
  // if both are disabled then this component returns null
  if (shouldRenderBiometricOption !== null) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>
          {strings(
            `biometrics.enable_${shouldRenderBiometricOption.toLowerCase()}`,
          )}
        </Text>
        <Switch
          onValueChange={onBiometryValueChanged}
          value={biometryChoiceState}
          style={styles.switch}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={theme.brandColors.white}
          ios_backgroundColor={colors.border.muted}
        />
      </View>
    );
  } else if (shouldRenderBiometricOption === null && allowLoginWithRememberMe) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>
          {strings(`choose_password.remember_me`)}
        </Text>
        <Switch
          onValueChange={onRememberMeValueChanged}
          value={rememberMeEnabled}
          style={styles.switch}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={theme.brandColors.white}
          ios_backgroundColor={colors.border.muted}
          testID={LoginViewSelectors.REMEMBER_ME_SWITCH}
        />
      </View>
    );
  }
  return null;
};

export default React.memo(LoginOptionsSwitch);
