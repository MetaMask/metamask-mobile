import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';

import { ensureValidState } from './util';
import { CardEntryPoint } from '../../components/UI/Card/util/metrics';

export const migrationVersion = 140;

const VALID_ENTRY_POINTS = new Set<string>(Object.values(CardEntryPoint));

/**
 * Migration 140: Normalize `card.pendingMoneyAccountCardLink` to `CardEntryPoint | null`.
 *
 * The field used to be a boolean. It was widened to `CardEntryPoint | null`
 * without a migration; a stale `true` persisted from a prior install would
 * pass the truthy guard and propagate the literal boolean into navigation
 * params and analytics. Coerce anything that isn't a known entry point to
 * null.
 */
const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (!isObject(state) || !isObject(state.card)) {
      return state;
    }

    const card = state.card as Record<string, unknown>;
    if (!hasProperty(card, 'pendingMoneyAccountCardLink')) {
      return state;
    }

    const value = card.pendingMoneyAccountCardLink;
    if (
      value !== null &&
      !(typeof value === 'string' && VALID_ENTRY_POINTS.has(value))
    ) {
      card.pendingMoneyAccountCardLink = null;
    }
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to normalize pendingMoneyAccountCardLink: ${String(error)}`,
      ),
    );
  }

  return state;
};

export default migration;
