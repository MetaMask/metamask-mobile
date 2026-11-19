import React, { useCallback } from 'react';
import { strings } from '../../../../../locales/i18n';
import { PREVIOUS_SCREEN } from '../../../../constants/navigation';
import ChoosePasswordForm from '../ChoosePasswordForm';
import ChoosePasswordMarketingOptIn from '../ChoosePasswordMarketingOptIn';
import { usePasswordFields } from '../hooks/usePasswordFields';
import { useMarketingOptIn } from '../hooks/useMarketingOptIn';
import { useWalletCreation } from '../hooks/useWalletCreation';
import type { ChoosePasswordFlowProps } from './types';

const SocialCreateWallet = ({ params }: ChoosePasswordFlowProps) => {
  const provider = params?.provider;
  const {
    marketingOptInChecked,
    setSelection,
    isAwaitingGeolocation,
    applyMarketingOptIn,
  } = useMarketingOptIn();
  const fields = usePasswordFields({ provider });
  const { loading, foxRiveLoaderRef, startWalletCreation } = useWalletCreation({
    password: fields.password,
    isSocialLogin: params?.oauthLoginSuccess,
    provider,
    previousScreen: params?.[PREVIOUS_SCREEN],
    marketingOptInChecked,
    applyMarketingOptIn,
  });
  const { validatePasswordSubmission } = fields;

  const onPressCreate = useCallback(async () => {
    const validation = validatePasswordSubmission({
      isLoading: loading,
      isAwaitingGeolocation,
    });
    if (!validation.valid) return;

    await startWalletCreation();
  }, [
    validatePasswordSubmission,
    loading,
    isAwaitingGeolocation,
    startWalletCreation,
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

export default SocialCreateWallet;
