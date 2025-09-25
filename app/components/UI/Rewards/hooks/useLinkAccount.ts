import { useCallback, useState, useContext } from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { strings } from '../../../../../locales/i18n';
import { ToastContext } from '../../../../component-library/components/Toast/Toast.context';
import { IconColor } from '../../../../component-library/components/Icons/Icon/Icon.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button/Button.types';

interface UseLinkAccountResult {
  linkAccount: (account: InternalAccount) => Promise<boolean>;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

export const useLinkAccount = (): UseLinkAccountResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toastRef } = useContext(ToastContext);

  const linkAccount = useCallback(
    async (account: InternalAccount): Promise<boolean> => {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      try {
        const success = await Engine.controllerMessenger.call(
          'RewardsController:linkAccountToSubscriptionCandidate',
          account,
        );

        if (success) {
          if (toastRef?.current) {
            toastRef.current.showToast({
              variant: ToastVariants.Icon,
              iconName: IconName.Check,
              iconColor: IconColor.Success,
              labelOptions: [
                {
                  label: strings(
                    'rewards.settings.link_account_success_title',
                    {
                      accountName: account.metadata.name,
                    },
                  ),
                },
              ],
              hasNoTimeout: false,
              closeButtonOptions: {
                variant: ButtonVariants.Primary,
                endIconName: IconName.CircleX,
                label: strings('rewards.toast_dismiss'),
                onPress: () => {
                  toastRef.current?.closeToast();
                },
              },
            });
          }
          return true;
        }

        if (toastRef?.current) {
          toastRef.current.showToast({
            variant: ToastVariants.Icon,
            iconName: IconName.CircleX,
            iconColor: IconColor.Error,
            labelOptions: [
              { label: strings('rewards.settings.link_account_error_title') },
            ],
            hasNoTimeout: false,
            closeButtonOptions: {
              variant: ButtonVariants.Primary,
              endIconName: IconName.CircleX,
              label: strings('rewards.toast_dismiss'),
              onPress: () => {
                toastRef.current?.closeToast();
              },
            },
          });
        }

        setIsError(true);
        setError('Failed to link account');
        return false;
      } catch (err) {
        if (toastRef?.current) {
          toastRef.current.showToast({
            variant: ToastVariants.Icon,
            iconName: IconName.CircleX,
            iconColor: IconColor.Error,
            labelOptions: [
              { label: strings('rewards.settings.link_account_error_title') },
            ],
            hasNoTimeout: false,
            closeButtonOptions: {
              variant: ButtonVariants.Primary,
              endIconName: IconName.CircleX,
              label: strings('rewards.toast_dismiss'),
              onPress: () => {
                toastRef.current?.closeToast();
              },
            },
          });
        }

        Logger.log('useLinkAccount: Failed to link account', err);
        setIsError(true);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [toastRef],
  );

  return {
    linkAccount,
    isLoading,
    isError,
    error,
  };
};
