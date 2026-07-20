import { getVersion } from 'react-native-device-info';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import Engine from '../../core/Engine';
import Logger from '../Logger';
import { METAMASK_SUPPORT_URL } from '../../constants/urls';
import Routes from '../../constants/navigation/Routes';

// Query param names must match the extension implementation (see
// https://github.com/MetaMask/metamask-extension/pull/44482) so the CS support
// site (SEG-20) can rely on a single, client-agnostic contract.
export const SUPPORT_URL_PARAM_CUSTOMER_SERVICE_TOKEN =
  'customer_service_token';
export const SUPPORT_URL_PARAM_VERSION = 'metamask_version';

/**
 * Appends support metadata to a base support URL.
 *
 * @param baseUrl - Support URL to enrich (defaults to the generic help center URL).
 * @param customerServiceToken - JWT obtained from `AuthenticationController.getCustomerServiceToken()`.
 * @returns Support URL with `metamask_version` and, when available, `customer_service_token` appended.
 */
export const buildSupportUrl = (
  baseUrl: string = METAMASK_SUPPORT_URL,
  customerServiceToken?: string,
): string => {
  const url = new URL(baseUrl);
  url.searchParams.append(SUPPORT_URL_PARAM_VERSION, getVersion());
  if (customerServiceToken) {
    url.searchParams.append(
      SUPPORT_URL_PARAM_CUSTOMER_SERVICE_TOKEN,
      customerServiceToken,
    );
  }
  return url.toString();
};

/**
 * Replaces the customer service token value in a support URL with a
 * placeholder so it is safe to log (e.g. as a Sentry breadcrumb) without
 * leaking the JWT off-device.
 *
 * @param url - Support URL potentially containing a `customer_service_token` param.
 * @returns The same URL with the token value redacted, if present.
 */
export const redactCustomerServiceToken = (url: string): string => {
  const redacted = new URL(url);
  if (redacted.searchParams.has(SUPPORT_URL_PARAM_CUSTOMER_SERVICE_TOKEN)) {
    redacted.searchParams.set(
      SUPPORT_URL_PARAM_CUSTOMER_SERVICE_TOKEN,
      '[REDACTED]',
    );
  }
  return redacted.toString();
};

/**
 * Builds the support URL to open after the user confirms sharing device details.
 *
 * Fetches a fresh customer-service JWT (canonical profile ID in the `sub` claim,
 * 60-min expiry) at the moment of the request rather than caching it, since a
 * cached token would just expire unused. Falls back to the plain support URL
 * when no token can be obtained (locked wallet, not signed in, rate-limited) so
 * the user is never blocked from reaching support; the support site defaults
 * such requests to Tier 3.
 *
 * @param baseUrl - Support URL to enrich (defaults to the generic help center URL).
 * @returns Support URL enriched with the JWT when available, otherwise the plain support URL.
 */
export const getEnrichedSupportUrl = async (
  baseUrl: string = METAMASK_SUPPORT_URL,
): Promise<string> => {
  try {
    const customerServiceToken =
      await Engine.context.AuthenticationController.getCustomerServiceToken();
    const url = buildSupportUrl(baseUrl, customerServiceToken);
    Logger.log(
      '[SupportConsent] Opening enriched support URL',
      redactCustomerServiceToken(url),
    );
    return url;
  } catch (error) {
    Logger.log(
      '[SupportConsent] Failed to fetch customer service token, falling back to plain URL',
      error,
    );
    return buildSupportUrl(baseUrl);
  }
};

export type OpenSupportUrl = (url: string) => void | Promise<void>;

/**
 * Shows the support consent sheet, then opens the support URL via the
 * caller-provided `open` function (e.g. navigating to SimpleWebview,
 * `Linking.openURL`, or an in-app browser), keeping each entry point's
 * existing opening mechanism intact.
 *
 * The consent choice is not persisted: the sheet is shown on every call,
 * matching the extension's behavior (see extension PR #44482).
 *
 * Shared by `useSupportConsent` (function components) and class components
 * that cannot use hooks (e.g. `ErrorBoundary`, `AppInformation`).
 *
 * @param navigation - Navigation object used to open the consent sheet.
 * @param open - Callback invoked with the final support URL once the user responds.
 * @param baseUrl - Support URL to enrich or fall back to (defaults to the generic help center URL).
 */
export const navigateToSupportConsent = (
  // Only `navigate` is needed; Pick avoids coupling to the caller's exact
  // NavigationProp variant (hooks override `getState`, class props differ).
  navigation: Pick<NavigationProp<ParamListBase>, 'navigate'>,
  open: OpenSupportUrl,
  baseUrl?: string,
): void => {
  const onConfirm = async () => {
    const url = await getEnrichedSupportUrl(baseUrl);
    try {
      await open(url);
    } catch (error) {
      Logger.log('[SupportConsent] Failed to open support URL', error);
    }
  };

  const onReject = async () => {
    // Honor the "Don't share" choice literally: open the raw base URL without
    // appending metamask_version (or any device detail), matching the consent copy.
    const url = baseUrl ?? METAMASK_SUPPORT_URL;
    Logger.log(
      '[SupportConsent] Opening support URL without device details',
      url,
    );
    try {
      await open(url);
    } catch (error) {
      Logger.log('[SupportConsent] Failed to open support URL', error);
    }
  };

  navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
    screen: Routes.MODAL.SUPPORT_CONSENT_SHEET,
    params: { onConfirm, onReject },
  });
};
