import { useCallback, useState } from 'react';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../../../core/Engine';
import { MetaMetricsEvents, useMetrics } from '../../../hooks/useMetrics';
import { deriveAccountMetricProps } from '../utils';
import { IMetaMetricsEvent } from '../../../../core/Analytics';
import useRewardsToast from './useRewardsToast';
import { strings } from '../../../../../locales/i18n';
import { formatAddress } from '../../../../util/address';

interface UseLinkAccountAddressResult {
  linkAccountAddress: (account: InternalAccount) => Promise<boolean>;
  isLoading: boolean;
  isError: boolean;
}

export const useLinkAccountAddress = (
  showToasts: boolean = true,
): UseLinkAccountAddressResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const { trackEvent, createEventBuilder } = useMetrics();
  const { showToast, RewardsToastOptions } = useRewardsToast();

  const triggerAccountLinkingEvent = useCallback(
    (event: IMetaMetricsEvent, account: InternalAccount) => {
      const accountMetricProps = deriveAccountMetricProps(account);
      trackEvent(
        createEventBuilder(event).addProperties(accountMetricProps).build(),
      );
    },
    [createEventBuilder, trackEvent],
  );

  const linkAccountAddress = useCallback(
    async (account: InternalAccount): Promise<boolean> => {
      setIsLoading(true);
      setIsError(false);

      try {
        // Check if account supports opt-in
        const isSupported = await Engine.controllerMessenger.call(
          'RewardsController:isOptInSupported',
          account,
        );

        if (!isSupported) {
          setIsError(true);
          if (showToasts) {
            showToast(
              RewardsToastOptions.error(
                strings(
                  'rewards.link_account_group.link_account_address_error',
                  {
                    address: formatAddress(account.address, 'short'),
                  },
                ),
              ),
            );
          }
          return false;
        }

        // Check opt-in status
        const optInResponse = await Engine.controllerMessenger.call(
          'RewardsController:getOptInStatus',
          { addresses: [account.address] },
        );

        // If already opted in, return success
        if (optInResponse.ois[0]) {
          return true;
        }

        // Emit started event
        triggerAccountLinkingEvent(
          MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_STARTED,
          account,
        );

        try {
          // Link the account
          const success = await Engine.controllerMessenger.call(
            'RewardsController:linkAccountToSubscriptionCandidate',
            account,
          );

          if (success) {
            triggerAccountLinkingEvent(
              MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_COMPLETED,
              account,
            );
            return true;
          }

          triggerAccountLinkingEvent(
            MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_FAILED,
            account,
          );
          if (showToasts) {
            showToast(
              RewardsToastOptions.error(
                strings(
                  'rewards.link_account_group.link_account_address_error',
                  {
                    address: formatAddress(account.address, 'short'),
                  },
                ),
              ),
            );
          }
          setIsError(true);
          return false;
        } catch (err) {
          triggerAccountLinkingEvent(
            MetaMetricsEvents.REWARDS_ACCOUNT_LINKING_FAILED,
            account,
          );
          if (showToasts) {
            showToast(
              RewardsToastOptions.error(
                strings(
                  'rewards.link_account_group.link_account_address_error',
                  {
                    address: formatAddress(account.address, 'short'),
                  },
                ),
              ),
            );
          }
          setIsError(true);
          return false;
        }
      } catch (err) {
        if (showToasts) {
          showToast(
            RewardsToastOptions.error(
              strings('rewards.link_account_group.link_account_address_error', {
                address: formatAddress(account.address, 'short'),
              }),
            ),
          );
        }
        setIsError(true);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [showToasts, triggerAccountLinkingEvent, showToast, RewardsToastOptions],
  );

  return {
    linkAccountAddress,
    isLoading,
    isError,
  };
};
