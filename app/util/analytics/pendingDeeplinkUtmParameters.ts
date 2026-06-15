import Logger from '../Logger';
import UrlParser from 'url-parse';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';
import { attributionPayloadFromDeeplink } from '../../core/redux/slices/attributionFromSources';
import type { AnalyticsTrackingEvent } from './AnalyticsEventBuilder';
import { EVENT_NAME } from '../../core/Analytics/MetaMetrics.events';
import type { WalletSetupCompletedAttributionAnalyticsPayload } from './walletSetupCompletedAttribution';
import { removeUtmPropertiesWithoutMarketingConsent } from './removeUtmPropertiesWithoutMarketingConsent';

export const UTM_PARAMETERS = [
  'utm_campaign',
  'utm_content',
  'utm_medium',
  'utm_source',
  'utm_term',
] as const;

export type UtmParameter = (typeof UTM_PARAMETERS)[number];

function getDeeplinkForAttribution(): string | null {
  return (
    AppStateEventProcessor.pendingDeeplink ??
    AppStateEventProcessor.currentDeeplink
  );
}

function getDeeplinkPathname(deeplink: string): string {
  try {
    return new UrlParser(deeplink).pathname.replace(/\/$/, '') || '/';
  } catch {
    return '';
  }
}

/**
 * True when the deeplink targets onboarding (https path or metamask://onboarding host).
 */
export function isOnboardingDeeplink(deeplink: string): boolean {
  const url = new UrlParser(deeplink);
  const pathname = getDeeplinkPathname(deeplink);

  if (pathname === '/onboarding') {
    return true;
  }

  return (
    url.protocol.startsWith('metamask') &&
    url.hostname === 'onboarding' &&
    (pathname === '/' || pathname === '')
  );
}

/**
 * Parses acquisition query params from a deeplink URL string.
 */
export function parseDeeplinkUtmParameters(
  deeplink: string,
): WalletSetupCompletedAttributionAnalyticsPayload | null {
  try {
    const payload = attributionPayloadFromDeeplink(deeplink);
    return payload && Object.keys(payload).length > 0 ? payload : null;
  } catch (error) {
    Logger.error(error as Error, 'Failed to parse deeplink for UTM parameters');
    return null;
  }
}

/**
 * Reads acquisition params from the pending install deeplink at track time.
 */
export function getPendingDeeplinkUtmParameters(): WalletSetupCompletedAttributionAnalyticsPayload | null {
  const deeplink = getDeeplinkForAttribution();
  if (!deeplink) {
    return null;
  }

  return parseDeeplinkUtmParameters(deeplink);
}

/**
 * Clears pending deeplink after wallet setup when the install link was onboarding-only.
 */
export function clearOnboardingPendingDeeplinkIfNeeded(): void {
  const deeplink = getDeeplinkForAttribution();
  if (!deeplink || !isOnboardingDeeplink(deeplink)) {
    return;
  }

  AppStateEventProcessor.clearPendingDeeplink();
}

/**
 * Keeps or strips acquisition params on a buffered Wallet Setup Completed event
 * based on marketing consent at metrics opt-in.
 */
export function applyMarketingConsentToWalletSetupCompletedEvent(
  event: AnalyticsTrackingEvent,
  hasMarketingConsent: boolean,
): AnalyticsTrackingEvent {
  if (event.name !== EVENT_NAME.WALLET_SETUP_COMPLETED) {
    return event;
  }

  const marketingConsent = !!hasMarketingConsent;

  return {
    ...event,
    properties: removeUtmPropertiesWithoutMarketingConsent(
      event.properties,
      marketingConsent,
    ),
    sensitiveProperties: removeUtmPropertiesWithoutMarketingConsent(
      event.sensitiveProperties,
      marketingConsent,
    ),
  };
}
