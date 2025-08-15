import React, { useCallback, useState } from 'react';
import { strings } from '../../../../locales/i18n';
import { AUTHENTICATION_TYPE, BIOMETRY_TYPE } from 'react-native-keychain';
import { LoginViewSelectors } from '../../../../e2e/selectors/wallet/LoginView.selectors';
import { useSelector } from 'react-redux';
import SecurityOptionToggle from '../SecurityOptionToggle/SecurityOptionToggle';

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
      <SecurityOptionToggle
        title={strings(
          `biometrics.enable_${shouldRenderBiometricOption.toLowerCase()}`,
        )}
        value={biometryChoiceState}
        onOptionUpdated={onBiometryValueChanged}
        testId={LoginViewSelectors.BIOMETRIC_SWITCH}
      />
    );
  } else if (shouldRenderBiometricOption === null && allowLoginWithRememberMe) {
    return (
      <SecurityOptionToggle
        title={strings('choose_password.remember_me')}
        value={rememberMeEnabled}
        onOptionUpdated={onRememberMeValueChanged}
        testId={LoginViewSelectors.REMEMBER_ME_SWITCH}
      />
    );
  }
  return null;
};

export default React.memo(LoginOptionsSwitch);
