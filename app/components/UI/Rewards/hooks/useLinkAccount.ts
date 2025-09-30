import { useCallback, useState } from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';
import useRewardsToast from './useRewardsToast';
import { formatAddress } from '../../../../util/address';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { formatAccountScope, RewardsMetricsStatuses } from '../utils';

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
  const { trackEvent, createEventBuilder } = useMetrics();

  const triggerAccountLinkingEvent = useCallback(
    (status: RewardsMetricsStatuses, account: InternalAccount) => {
      const accountScope = formatAccountScope(account);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_ACCOUNT_LINKING)
          .addProperties({
            status,
            scope: accountScope,
            wallet_type: account.type,
          })
          .build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

  const linkAccount = useCallback(
    async (account: InternalAccount): Promise<boolean> => {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      triggerAccountLinkingEvent(RewardsMetricsStatuses.STARTED, account);

      try {
        const success = await Engine.controllerMessenger.call(
          'RewardsController:linkAccountToSubscriptionCandidate',
          account,
        );

        if (success) {
          triggerAccountLinkingEvent(RewardsMetricsStatuses.COMPLETED, account);
          showToast(
            RewardsToastOptions.success(
              strings('rewards.settings.link_account_success_title', {
                accountName: formatAddress(account.address, 'short'),
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
        triggerAccountLinkingEvent(RewardsMetricsStatuses.FAILED, account);
        setIsError(true);
        setError('Failed to link account');
        return false;
      } catch (err) {
        showToast(
          RewardsToastOptions.error(
            strings('rewards.settings.link_account_error_title'),
          ),
        );
        triggerAccountLinkingEvent(RewardsMetricsStatuses.FAILED, account);
        Logger.log('useLinkAccount: Failed to link account', err);
        setIsError(true);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [RewardsToastOptions, showToast, triggerAccountLinkingEvent],
  );

  return {
    linkAccount,
    isLoading,
    isError,
    error,
  };
};
