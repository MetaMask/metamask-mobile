import extractURLParams from '../../DeeplinkManager/utils/extractURLParams';
import type { SaveAttributionPayload } from './attribution';

function readStringField(
  raw: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = raw[key];
  if (typeof v === 'string' && v.trim() !== '') {
    return v.trim();
  }
  return undefined;
}

/**
 * Parse acquisition params from a deeplink URL for {@link saveAttribution}.
 * Returns null if there is nothing attributable.
 */
export function attributionPayloadFromDeeplink(
  deeplinkUrl: string,
): SaveAttributionPayload | null {
  const { params } = extractURLParams(deeplinkUrl);
  const raw = params as unknown as Record<string, unknown>;

  const attribution_id =
    readStringField(raw, 'attributionId') ??
    readStringField(raw, 'attribution_id');

  const payload: SaveAttributionPayload = {};

  if (attribution_id !== undefined) {
    payload.attribution_id = attribution_id;
  }
  const utm_source = readStringField(raw, 'utm_source');
  const utm_medium = readStringField(raw, 'utm_medium');
  const utm_campaign = readStringField(raw, 'utm_campaign');
  const utm_term = readStringField(raw, 'utm_term');
  const utm_content = readStringField(raw, 'utm_content');
  if (utm_source !== undefined) {
    payload.utm_source = utm_source;
  }
  if (utm_medium !== undefined) {
    payload.utm_medium = utm_medium;
  }
  if (utm_campaign !== undefined) {
    payload.utm_campaign = utm_campaign;
  }
  if (utm_term !== undefined) {
    payload.utm_term = utm_term;
  }
  if (utm_content !== undefined) {
    payload.utm_content = utm_content;
  }

  if (Object.keys(payload).length === 0) {
    return null;
  }
  return payload;
}

interface ProcessAttributionShape {
  attributionId?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

/**
 * Map {@link processAttribution} result to {@link saveAttribution} payload.
 */
export function attributionPayloadFromProcessAttribution(
  attribution: ProcessAttributionShape,
): SaveAttributionPayload | null {
  const attribution_id =
    typeof attribution.attributionId === 'string' &&
    attribution.attributionId.trim() !== ''
      ? attribution.attributionId.trim()
      : undefined;

  const payload: SaveAttributionPayload = {};
  if (attribution_id !== undefined) {
    payload.attribution_id = attribution_id;
  }
  const utm_source = attribution.utm_source?.trim();
  const utm_medium = attribution.utm_medium?.trim();
  const utm_campaign = attribution.utm_campaign?.trim();
  const utm_term = attribution.utm_term?.trim();
  const utm_content = attribution.utm_content?.trim();
  if (utm_source) {
    payload.utm_source = utm_source;
  }
  if (utm_medium) {
    payload.utm_medium = utm_medium;
  }
  if (utm_campaign) {
    payload.utm_campaign = utm_campaign;
  }
  if (utm_term) {
    payload.utm_term = utm_term;
  }
  if (utm_content) {
    payload.utm_content = utm_content;
  }

  if (Object.keys(payload).length === 0) {
    return null;
  }
  return payload;
}
