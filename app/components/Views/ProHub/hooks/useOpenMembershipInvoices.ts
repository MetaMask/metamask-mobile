import { useCallback, useRef, useState } from 'react';
import { Linking } from 'react-native';
import Engine from '../../../../core/Engine';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import { strings } from '../../../../../locales/i18n';

export interface UseOpenMembershipInvoicesResult {
  openInvoices: () => Promise<void>;
  isOpening: boolean;
  errorMessage: string | null;
}

/**
 * True when the billing portal address is an https URL.
 *
 * The subscription API returns a Stripe Billing Portal session URL. Anything
 * else is not opened.
 *
 * @param url - Address returned by `getBillingPortalUrl`.
 * @returns Whether the address can be opened.
 */
const isBillingPortalUrl = (url: string | undefined): url is string => {
  if (!url) {
    return false;
  }

  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Opens the Stripe billing portal for the signed-in subscription customer.
 *
 * Uses the same controller call as Shield: `getBillingPortalUrl` requests a
 * portal session and this hook opens the returned https URL.
 *
 * @returns Open callback, in-flight state, and a localized failure message.
 */
export function useOpenMembershipInvoices(): UseOpenMembershipInvoicesResult {
  const [isOpening, setIsOpening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isOpeningRef = useRef(false);

  const openInvoices = useCallback(async () => {
    if (isOpeningRef.current) {
      return;
    }

    isOpeningRef.current = true;
    setIsOpening(true);
    setErrorMessage(null);

    try {
      const { url } =
        await Engine.context.SubscriptionController.getBillingPortalUrl();

      if (!isBillingPortalUrl(url)) {
        throw new Error(
          'Membership invoices returned a non-https billing portal URL',
        );
      }

      await Linking.openURL(url);
    } catch (error) {
      Logger.error(
        ensureError(error, 'useOpenMembershipInvoices.getBillingPortalUrl'),
        {
          tags: {
            feature: 'money_account_plus',
            operation: 'get_billing_portal_url',
          },
        },
      );
      setErrorMessage(strings('pro_hub.membership.invoices_failed'));
    } finally {
      isOpeningRef.current = false;
      setIsOpening(false);
    }
  }, []);

  return { openInvoices, isOpening, errorMessage };
}
