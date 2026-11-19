import React, { useState, useCallback } from 'react';
import { Keyboard } from 'react-native';
import { strings } from '../../../../../locales/i18n';
import { PREVIOUS_SCREEN } from '../../../../constants/navigation';
import PasswordResetWarningSheet from '../../shared/PasswordResetWarningSheet/PasswordResetWarningSheet';
import ChoosePasswordForm from '../ChoosePasswordForm';
import { usePasswordFields } from '../hooks/usePasswordFields';
import { useWalletCreation } from '../hooks/useWalletCreation';
import type { ChoosePasswordFlowProps } from './types';

const SrpCreateWallet = ({ params }: ChoosePasswordFlowProps) => {
  const provider = params?.provider;
  const [isWarningSheetVisible, setIsWarningSheetVisible] = useState(false);
  const fields = usePasswordFields({ provider });
  const { loading, foxRiveLoaderRef, startWalletCreation } = useWalletCreation({
    password: fields.password,
    isSocialLogin: params?.oauthLoginSuccess,
    provider,
    previousScreen: params?.[PREVIOUS_SCREEN],
    marketingOptInChecked: false,
  });
  const { validatePasswordSubmission } = fields;

  const onPressCreate = useCallback(() => {
    const validation = validatePasswordSubmission({
      isLoading: loading,
      isAwaitingGeolocation: false,
    });
    if (!validation.valid) return;

    Keyboard.dismiss();
    setIsWarningSheetVisible(true);
  }, [validatePasswordSubmission, loading]);

  const onDismissWarningSheet = useCallback(() => {
    setIsWarningSheetVisible(false);
  }, []);

  const onConfirmWarningSheet = useCallback(() => {
    setIsWarningSheetVisible(false);
    void startWalletCreation();
  }, [startWalletCreation]);

  return (
    <ChoosePasswordForm
      description={strings('choose_password.create_description')}
      fields={fields}
      onSubmit={onPressCreate}
      isSubmitLoading={false}
      isLoading={loading}
      foxLoaderRef={foxRiveLoaderRef}
      overlay={
        <PasswordResetWarningSheet
          isVisible={isWarningSheetVisible}
          onConfirm={onConfirmWarningSheet}
          onDismiss={onDismissWarningSheet}
        />
      }
    />
  );
};

export default SrpCreateWallet;
