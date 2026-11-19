import React, { useState, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import Engine from '../../../../core/Engine';
import { Authentication } from '../../../../core';
import AppConstants from '../../../../core/AppConstants';
import { createPasswordlessRecoveryService } from '../../../../core/MfaRecovery/engineBindings';
import { passwordSet as passwordSetAction } from '../../../../actions/user';
import { setLockTime as setLockTimeAction } from '../../../../actions/settings';
import AUTHENTICATION_TYPE from '../../../../constants/userProperties';
import { PREVIOUS_SCREEN } from '../../../../constants/navigation';
import Logger from '../../../../util/Logger';
import { TraceName, endTrace } from '../../../../util/trace';
import ChoosePasswordForm from '../ChoosePasswordForm';
import ChoosePasswordMarketingOptIn from '../ChoosePasswordMarketingOptIn';
import { usePasswordFields } from '../hooks/usePasswordFields';
import { useMarketingOptIn } from '../hooks/useMarketingOptIn';
import { usePasswordSetupTracking } from '../hooks/usePasswordSetupTracking';
import type { OnboardingFoxLoaderRef } from '../../../UI/OnboardingFoxLoader/OnboardingFoxLoader';
import type { ChoosePasswordFlowProps } from './types';

type RecoveryStep = 'reset_global_password' | 'fetch_secrets' | 'unlock_wallet';

/**
 * Forgot-password MFA recovery. The seedless controller already recovered the
 * vault keys and holds AAL2, so the new password is set directly, then the
 * wallet is unlocked from the secrets fetched with it.
 */
const RecoveryResetPassword = ({ params }: ChoosePasswordFlowProps) => {
  const provider = params?.provider;
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const foxRiveLoaderRef = useRef<OnboardingFoxLoaderRef>(null);
  const {
    marketingOptInChecked,
    setSelection,
    isAwaitingGeolocation,
    applyMarketingOptIn,
  } = useMarketingOptIn();
  const fields = usePasswordFields({ provider });
  const { password, validatePasswordSubmission } = fields;

  usePasswordSetupTracking({
    isLoading: loading,
    provider,
    previousScreen: params?.[PREVIOUS_SCREEN],
  });

  const resetPassword = useCallback(async () => {
    setLoading(true);
    let step: RecoveryStep = 'reset_global_password';
    try {
      await createPasswordlessRecoveryService().resetGlobalPassword(password);

      step = 'fetch_secrets';
      const secrets =
        await Engine.context.SeedlessOnboardingController.fetchAllSecretData(
          password,
        );

      step = 'unlock_wallet';
      await Authentication.unlockWithRecoveredSecrets(password, secrets, {
        // PASSWORD auth storage: BIOMETRIC would show an OS sheet on submit.
        authType: AUTHENTICATION_TYPE.PASSWORD,
        onBeforeNavigate: async () => {
          dispatch(passwordSetAction());
          dispatch(setLockTimeAction(AppConstants.DEFAULT_LOCK_TIMEOUT));
          endTrace({ name: TraceName.OnboardingExistingSocialLogin });
          endTrace({ name: TraceName.OnboardingJourneyOverall });
          applyMarketingOptIn(marketingOptInChecked);
        },
      });
    } catch (err) {
      Logger.error(
        err instanceof Error ? err : new Error(String(err)),
        `ChoosePassword: passwordless social recovery failed at ${step}`,
      );
      // Do not recreateVault/unset password — recovery is not new-wallet create.
      Alert.alert(
        strings('wallet_recovery_mfa.recovery_failed'),
        __DEV__ ? step : undefined,
      );
    } finally {
      foxRiveLoaderRef.current?.stop();
      setLoading(false);
    }
  }, [password, dispatch, applyMarketingOptIn, marketingOptInChecked]);

  const onPressCreate = useCallback(async () => {
    const validation = validatePasswordSubmission({
      isLoading: loading,
      isAwaitingGeolocation,
    });
    if (!validation.valid) return;

    await resetPassword();
  }, [
    validatePasswordSubmission,
    loading,
    isAwaitingGeolocation,
    resetPassword,
  ]);

  return (
    <ChoosePasswordForm
      description={strings(
        'choose_password.description_social_login_update_ios',
      )}
      fields={fields}
      onSubmit={onPressCreate}
      isSubmitLoading={isAwaitingGeolocation}
      isLoading={loading}
      foxLoaderRef={foxRiveLoaderRef}
    >
      <ChoosePasswordMarketingOptIn
        isSelected={marketingOptInChecked}
        onPress={setSelection}
      />
    </ChoosePasswordForm>
  );
};

export default RecoveryResetPassword;
