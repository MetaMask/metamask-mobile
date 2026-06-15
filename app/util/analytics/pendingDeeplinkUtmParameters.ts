import Logger from '../Logger';
import UrlParser from 'url-parse';
import { AppStateEventProcessor } from '../../core/AppStateEventListener';
import { attributionPayloadFromDeeplink } from '../../core/redux/slices/attributionFromSources';
import type { AnalyticsTrackingEvent } from './AnalyticsEventBuilder';
import { EVENT_NAME } from '../../core/Analytics/MetaMetrics.events';
import type { WalletSetupCompletedAttributionAnalyticsPayload } from './walletSetupCompletedAttribution';
import { removeUtmPropertiesWithoutMarketingConsent } from './removeUtmPropertiesWithoutMarketingConsent';
import { UTM_PARAMETERS, type UtmParameter } from './utmParameters';
import { hasTestOverrides, testConfig } from '../test/utils';
import ReduxService from '../../core/redux';
import type { AttributionRecord } from '../../core/redux/slices/attribution';

export { UTM_PARAMETERS, type UtmParameter };

function getDeeplinkForAttribution(): string | null {
  return (
    AppStateEventProcessor.pendingDeeplink ??
    AppStateEventProcessor.currentDeeplink
  );
}

function ensureE2eInstallDeeplinkFromTestConfig(): void {
  if (!hasTestOverrides) {
    return;
  }

  const deeplink =
    typeof testConfig.e2ePendingInstallDeeplink === 'string'
      ? testConfig.e2ePendingInstallDeeplink
      : undefined;

  if (deeplink && !getDeeplinkForAttribution()) {
    AppStateEventProcessor.setCurrentDeeplink(deeplink);
  }
}

function attributionRecordToPayload(
  record: AttributionRecord,
): WalletSetupCompletedAttributionAnalyticsPayload | null {
  const payload: WalletSetupCompletedAttributionAnalyticsPayload = {};

  if (record.utm_source?.trim()) {
    payload.utm_source = record.utm_source.trim();
  }
  if (record.utm_medium?.trim()) {
    payload.utm_medium = record.utm_medium.trim();
  }
  if (record.utm_campaign?.trim()) {
    payload.utm_campaign = record.utm_campaign.trim();
  }
  if (record.utm_term?.trim()) {
    payload.utm_term = record.utm_term.trim();
  }
  if (record.utm_content?.trim()) {
    payload.utm_content = record.utm_content.trim();
  }
  if (record.attribution_id?.trim()) {
    payload.attribution_id = record.attribution_id.trim();
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

/**
 * E2E fixtures preload Redux attribution; Android CI cannot read Detox launch args.
 * Fall back to the persisted record when no install deeplink is available.
 */
function getE2eAttributionUtmFallback(): WalletSetupCompletedAttributionAnalyticsPayload | null {
  if (!hasTestOverrides) {
    return null;
  }

  try {
    const record =
      ReduxService.store.getState().attribution?.attribution ?? null;
    if (!record) {
      return null;
    }

    return attributionRecordToPayload(record);
  } catch {
    return null;
  }
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
  ensureE2eInstallDeeplinkFromTestConfig();

  const deeplink = getDeeplinkForAttribution();
  if (deeplink) {
    return parseDeeplinkUtmParameters(deeplink);
  }

  return getE2eAttributionUtmFallback();
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
