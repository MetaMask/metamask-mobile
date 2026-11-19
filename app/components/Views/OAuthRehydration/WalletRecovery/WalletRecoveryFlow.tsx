import React, { useCallback, useContext, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { ThemeContext } from '../../../../util/theme';
import WalletRecoveryLoading from './WalletRecoveryLoading';
import WalletRecoveryVerify from './WalletRecoveryVerify';
import WalletRecoveryEnterPassword from './WalletRecoveryEnterPassword';
import WalletRecoveryPassword from './WalletRecoveryPassword';
import useWalletRecoveryFlow, {
  type UseWalletRecoveryFlowParams,
} from './useWalletRecoveryFlow';

export interface WalletRecoveryFlowProps extends UseWalletRecoveryFlowParams {
  password: string;
  unlockError: string | null;
  isUnlocking: boolean;
  isInputDisabled: boolean;
}

const WalletRecoveryFlow = ({
  password,
  unlockError,
  isUnlocking,
  isInputDisabled,
  ...flowParams
}: WalletRecoveryFlowProps) => {
  const { themeAppearance } = useContext(ThemeContext);
  const netInfo = useNetInfo();
  const {
    step,
    loadingMessage,
    fallbackMethods,
    verifyBusy,
    verifyError,
    recoveryError,
    rejectedBiometryLabel,
    handleRecoveryMethodSelect,
    handleForgotPassword,
    handlePasswordBack,
    handleUseOtherMethod,
    handleChangePassword,
    handleSubmitPassword,
  } = useWalletRecoveryFlow(flowParams);

  // Hardware back matches header back on recovery steps.
  const handleBackPress = useCallback(() => {
    if (step === 'password' || step === 'enterPassword') {
      if (!isUnlocking) {
        handlePasswordBack();
      }
      return true;
    }
    if (step === 'verify' && verifyBusy) {
      return true;
    }
    handleUseOtherMethod();
    return true;
  }, [step, isUnlocking, verifyBusy, handlePasswordBack, handleUseOtherMethod]);

  useEffect(() => {
    const backHandlerSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );
    return () => {
      backHandlerSubscription.remove();
    };
  }, [handleBackPress]);

  const error = recoveryError ?? unlockError;

  if (step === 'loading') {
    return <WalletRecoveryLoading message={loadingMessage} />;
  }
  if (step === 'verify') {
    return (
      <WalletRecoveryVerify
        showPasskey={fallbackMethods.includes('passkey')}
        showPassword
        // Email OTP only when enrolled and auth is Telegram.
        showEmail={
          flowParams.authConnection === 'telegram' &&
          fallbackMethods.includes('email_otp')
        }
        showTotp={fallbackMethods.includes('totp')}
        isBusy={verifyBusy}
        isOffline={
          netInfo.isConnected === false || netInfo.isInternetReachable === false
        }
        error={verifyError}
        onBack={handleUseOtherMethod}
        onSelectMethod={handleRecoveryMethodSelect}
      />
    );
  }
  // Figma: OS biometrics rejected after MFA → Enter password unlock.
  if (step === 'enterPassword') {
    return (
      <WalletRecoveryEnterPassword
        biometryLabel={rejectedBiometryLabel}
        password={password}
        error={error}
        isLoading={isUnlocking}
        keyboardAppearance={themeAppearance}
        onChangePassword={handleChangePassword}
        onSubmit={handleSubmitPassword}
        onBack={handlePasswordBack}
        onForgotPassword={() => {
          void handleForgotPassword();
        }}
      />
    );
  }
  return (
    <WalletRecoveryPassword
      password={password}
      error={error}
      isLoading={isUnlocking}
      isDisabled={isInputDisabled}
      keyboardAppearance={themeAppearance}
      onChangePassword={handleChangePassword}
      onSubmit={handleSubmitPassword}
      onBack={handlePasswordBack}
    />
  );
};

export default WalletRecoveryFlow;
