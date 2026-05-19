import {
  ATTRIBUTION_DEFAULT_TTL_MS,
  type AttributionRecord,
} from '../../core/redux/slices/attribution';

/**
 * Analytics payload fields forwarded from {@link AttributionRecord} to
 * `Wallet Setup Completed` (segment-friendly snake_case).
 */
export interface WalletSetupCompletedAttributionAnalyticsPayload {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  attribution_id?: string;
}

function assignIfNonEmpty(
  target: WalletSetupCompletedAttributionAnalyticsPayload,
  key: keyof WalletSetupCompletedAttributionAnalyticsPayload,
  value: string | undefined,
): void {
  if (value !== undefined && value.trim() !== '') {
    target[key] = value.trim();
  }
}

/**
 * Builds optional acquisition properties for `Wallet Setup Completed` when persisted
 * attribution exists, is within {@link ATTRIBUTION_DEFAULT_TTL_MS}, and marketing
 * consent is explicitly granted.
 */
export function getWalletSetupCompletedAttributionAnalyticsProps(
  attributionRecord: AttributionRecord | null,
  dataCollectionForMarketing: boolean | null,
  nowMs: number = Date.now(),
): WalletSetupCompletedAttributionAnalyticsPayload {
  if (dataCollectionForMarketing !== true) {
    return {};
  }
  if (attributionRecord === null) {
    return {};
  }
  if (nowMs - attributionRecord.capturedAt > ATTRIBUTION_DEFAULT_TTL_MS) {
    return {};
  }
  const props: WalletSetupCompletedAttributionAnalyticsPayload = {};
  assignIfNonEmpty(props, 'utm_source', attributionRecord.utm_source);
  assignIfNonEmpty(props, 'utm_medium', attributionRecord.utm_medium);
  assignIfNonEmpty(props, 'utm_campaign', attributionRecord.utm_campaign);
  assignIfNonEmpty(props, 'utm_term', attributionRecord.utm_term);
  assignIfNonEmpty(props, 'utm_content', attributionRecord.utm_content);
  assignIfNonEmpty(props, 'attribution_id', attributionRecord.attribution_id);
  return props;
}
