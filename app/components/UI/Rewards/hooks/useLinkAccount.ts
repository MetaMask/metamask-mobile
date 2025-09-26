import { useCallback, useState } from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';
import useRewardsToast from './useRewardsToast';

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
  const { showToast, RewardsToastOptions } = useRewardsToast();

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
          showToast(
            RewardsToastOptions.success(
              strings('rewards.settings.link_account_success_title', {
                accountName: account.metadata.name,
              }),
            ),
          );
          return true;
        }

        showToast(
          RewardsToastOptions.error(
            strings('rewards.settings.link_account_error_title'),
          ),
        );

        setIsError(true);
        setError('Failed to link account');
        return false;
      } catch (err) {
        showToast(
          RewardsToastOptions.error(
            strings('rewards.settings.link_account_error_title'),
          ),
        );

        Logger.log('useLinkAccount: Failed to link account', err);
        setIsError(true);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [RewardsToastOptions, showToast],
  );

  return {
    linkAccount,
    isLoading,
    isError,
    error,
  };
};
