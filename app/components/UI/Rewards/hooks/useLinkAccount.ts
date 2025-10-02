import { useCallback, useState } from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';
import useRewardsToast from './useRewardsToast';
import { formatAddress } from '../../../../util/address';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { deriveAccountMetricProps } from '../utils';
import { IMetaMetricsEvent } from '../../../../core/Analytics';

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
    (event: IMetaMetricsEvent, account: InternalAccount) => {
      const accountMetricProps = deriveAccountMetricProps(account);
      trackEvent(
        createEventBuilder(event).addProperties(accountMetricProps).build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

  const linkAccount = useCallback(
    async (account: InternalAccount): Promise<boolean> => {
      setIsLoading(true);
      setIsError(false);
      setError(null);

      triggerAccountLinkingEvent(
        MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_STARTED,
        account,
      );

      try {
        const success = await Engine.controllerMessenger.call(
          'RewardsController:linkAccountToSubscriptionCandidate',
          account,
        );

        if (success) {
          triggerAccountLinkingEvent(
            MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_COMPLETED,
            account,
          );
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
        triggerAccountLinkingEvent(
          MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_FAILED,
          account,
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
        triggerAccountLinkingEvent(
          MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_FAILED,
          account,
        );
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
