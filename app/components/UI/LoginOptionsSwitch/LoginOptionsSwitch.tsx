import React, { useCallback, useState } from 'react';
import { View, Switch, Text } from 'react-native';
import { mockTheme, useAppThemeFromContext } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import { createStyles } from './styles';
import {
  LOGIN_WITH_BIOMETRICS_SWITCH,
  LOGIN_WITH_REMEMBER_ME_SWITCH,
} from '../../../constants/test-ids';
import { useSelector } from 'react-redux';

interface Props {
  shouldRenderBiometricOption: BIOMETRY_TYPE | null;
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
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);
  const allowLoginWithRememberMe = useSelector(
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
          thumbColor={colors.white}
          ios_backgroundColor={colors.border.muted}
          testID={LOGIN_WITH_BIOMETRICS_SWITCH}
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
          thumbColor={colors.white}
          ios_backgroundColor={colors.border.muted}
          testID={LOGIN_WITH_REMEMBER_ME_SWITCH}
        />
      </View>
    );
  }
  return null;
};

export default React.memo(LoginOptionsSwitch);
