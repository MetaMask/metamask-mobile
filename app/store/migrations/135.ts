import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { createMMKV } from 'react-native-mmkv';
import type {
  AttributionRecord,
  AttributionState,
} from '../../core/redux/slices/attribution';
import { ensureValidState } from './util';

const migrationVersion = 135;

/** Same MMKV instance id as the removed nested redux-persist adapter. */
const LEGACY_ATTRIBUTION_MMKV_ID = 'redux-persist-attribution';
const LEGACY_PERSIST_KEY = 'persist:attribution';

function parseLegacyAttributionState(
  raw: string,
): AttributionState | undefined {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || !hasProperty(parsed, 'attribution')) {
      return undefined;
    }
    const record = parsed.attribution;
    if (record === null) {
      return { attribution: null };
    }
    if (!isObject(record) || typeof record.capturedAt !== 'number') {
      return undefined;
    }
    return { attribution: record as unknown as AttributionRecord };
  } catch {
    return undefined;
  }
}

/**
 * Migration 135: Move marketing attribution persistence from isolated MMKV
 * (`redux-persist-attribution` + nested persistReducer) into the root
 * redux-persist payload (MigratedStorage). Reads legacy `persist:attribution`
 * once and deletes it so attribution has a single source of truth.
 *
 * Numbered 135 because migration 134 on `main` is the Sei block explorer update.
 */
const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const root = state as unknown as Record<string, unknown>;

  const current = root.attribution;
  const currentRecord =
    isObject(current) && hasProperty(current, 'attribution')
      ? (current as AttributionState).attribution
      : null;

  try {
    const legacy = createMMKV({ id: LEGACY_ATTRIBUTION_MMKV_ID });
    const raw = legacy.getString(LEGACY_PERSIST_KEY);

    if (!raw) {
      return state;
    }

    const fromLegacy = parseLegacyAttributionState(raw);

    if (!fromLegacy) {
      legacy.remove(LEGACY_PERSIST_KEY);
      return state;
    }

    if (currentRecord === null && fromLegacy.attribution !== null) {
      root.attribution = fromLegacy;
    }

    legacy.remove(LEGACY_PERSIST_KEY);
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to migrate attribution from legacy MMKV: ${error}`,
      ),
    );
  }

  return state;
};

export default migration;
