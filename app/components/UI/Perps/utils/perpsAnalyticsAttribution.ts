/**
 * Helpers for mapping Mobile navigation / deeplink context onto the
 * perps-controller analytics attribution contract (TAT-3463).
 */

import type {
  PerpsAttributionContext,
  TrackingData,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';

export interface PerpsEntryAttributionInput {
  source?: string;
  sourceSection?: string;
}

export type PerpsEntryAttribution = Pick<
  TrackingData,
  'entryPoint' | 'discoverySource' | 'perpDiscoverySource'
>;

/**
 * Map navigation `source` / `source_section` onto TrackingData attribution fields.
 * Keeps legacy `source` callers intact — callers should still pass `source` when needed.
 */
export function toPerpsEntryAttribution(
  input: PerpsEntryAttributionInput,
): PerpsEntryAttribution {
  const attribution: PerpsEntryAttribution = {};
  if (input.source) {
    attribution.entryPoint = input.source;
  }
  if (input.sourceSection) {
    attribution.discoverySource = input.sourceSection;
    attribution.perpDiscoverySource = input.sourceSection;
  }
  return attribution;
}

/**
 * Parse UTM query params from a perps deeplink path (query string or full path).
 */
export function parsePerpsUtmFromPath(
  perpsPath: string,
): PerpsAttributionContext {
  const query = perpsPath.includes('?') ? perpsPath.split('?')[1] : perpsPath;
  const params = new URLSearchParams(query);

  const context: PerpsAttributionContext = {};
  const utmSource = params.get('utm_source') ?? undefined;
  const utmMedium = params.get('utm_medium') ?? undefined;
  const utmCampaign = params.get('utm_campaign') ?? undefined;
  const utmContent = params.get('utm_content') ?? undefined;
  const utmTerm = params.get('utm_term') ?? undefined;

  if (utmSource) context.utmSource = utmSource;
  if (utmMedium) context.utmMedium = utmMedium;
  if (utmCampaign) context.utmCampaign = utmCampaign;
  if (utmContent) context.utmContent = utmContent;
  if (utmTerm) context.utmTerm = utmTerm;

  return context;
}

export function hasPerpsUtmAttribution(
  context: PerpsAttributionContext,
): boolean {
  return Boolean(
    context.utmSource ||
      context.utmMedium ||
      context.utmCampaign ||
      context.utmContent ||
      context.utmTerm,
  );
}

/**
 * Store UTM attribution on the in-memory PerpsController context so
 * TradingService can merge it into submitted/terminal events.
 */
export function setPerpsUtmAttribution(context: PerpsAttributionContext): void {
  if (!hasPerpsUtmAttribution(context)) {
    return;
  }
  Engine.context.PerpsController.setAttributionContext(context);
}
