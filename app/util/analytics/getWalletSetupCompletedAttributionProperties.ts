import type { JsonMap } from '../../core/Analytics/MetaMetrics.types';
import {
  ATTRIBUTION_DEFAULT_TTL_MS,
  type AttributionRecord,
} from '../../core/redux/slices/attribution';
import type { RootState } from '../../reducers';
import { selectAttributionRecord } from '../../selectors/attribution';

const ATTRIBUTION_PROPERTY_KEYS: (keyof AttributionRecord)[] = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'attribution_id',
];

/**
 * Returns acquisition fields to attach to Wallet Setup Completed when persisted
 * attribution exists, is within TTL, and the user has opted into marketing data collection.
 */
export function getWalletSetupCompletedAttributionProperties(
  state: RootState,
  nowMs: number = Date.now(),
): JsonMap {
  if (state.security.dataCollectionForMarketing !== true) {
    return {};
  }

  const record = selectAttributionRecord(state);
  if (record === null) {
    return {};
  }

  if (nowMs - record.capturedAt > ATTRIBUTION_DEFAULT_TTL_MS) {
    return {};
  }

  const out: JsonMap = {};
  for (const key of ATTRIBUTION_PROPERTY_KEYS) {
    const value = record[key];
    if (typeof value !== 'string') {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed !== '') {
      out[key] = trimmed;
    }
  }
  return out;
}
