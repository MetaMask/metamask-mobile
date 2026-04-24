import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 133:
 *
 * TAT-3047 reshapes PerpsController.accountState balance fields. The
 * `availableBalance` + optional `availableToTradeBalance` pair is replaced
 * by `spendableBalance` + `withdrawableBalance`.
 *
 * `accountState` is persisted. Without this migration, existing installs
 * rehydrate an accountState whose legacy keys no longer match what
 * consumers read, leaving balance UIs at 0/-- until a fresh fetch lands,
 * which blocks order-entry and withdraw on cold start, offline use, or
 * slow startup.
 *
 * Mapping mirrors the post-refactor adapter semantics. The new spendable
 * and withdrawable fields each take `availableToTradeBalance` when
 * present (includes spot fold), otherwise fall back to `availableBalance`.
 *
 * The `subAccountBreakdown` entries (HIP-3) also migrate from the legacy
 * `{ availableBalance, totalBalance }` shape to
 * `{ spendableBalance, withdrawableBalance, totalBalance }`.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 133;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  if (
    !hasProperty(state.engine.backgroundState, 'PerpsController') ||
    !isObject(state.engine.backgroundState.PerpsController)
  ) {
    return state;
  }

  const { PerpsController } = state.engine.backgroundState;

  if (
    !hasProperty(PerpsController, 'accountState') ||
    !isObject(PerpsController.accountState)
  ) {
    return state;
  }

  const accountState = PerpsController.accountState as Record<string, unknown>;

  const legacyAvailable =
    typeof accountState.availableBalance === 'string'
      ? accountState.availableBalance
      : undefined;
  const legacyTradeable =
    typeof accountState.availableToTradeBalance === 'string'
      ? accountState.availableToTradeBalance
      : undefined;

  if (legacyAvailable !== undefined || legacyTradeable !== undefined) {
    const resolved = legacyTradeable ?? legacyAvailable ?? '0';
    if (!hasProperty(accountState, 'spendableBalance')) {
      accountState.spendableBalance = resolved;
    }
    if (!hasProperty(accountState, 'withdrawableBalance')) {
      accountState.withdrawableBalance = resolved;
    }
    delete accountState.availableBalance;
    delete accountState.availableToTradeBalance;
  }

  if (
    hasProperty(accountState, 'subAccountBreakdown') &&
    isObject(accountState.subAccountBreakdown)
  ) {
    const breakdown = accountState.subAccountBreakdown as Record<
      string,
      unknown
    >;
    for (const key of Object.keys(breakdown)) {
      const entry = breakdown[key];
      if (!isObject(entry)) {
        continue;
      }
      const entryRecord = entry as Record<string, unknown>;
      const legacySubAvailable =
        typeof entryRecord.availableBalance === 'string'
          ? entryRecord.availableBalance
          : undefined;
      if (legacySubAvailable !== undefined) {
        if (!hasProperty(entryRecord, 'spendableBalance')) {
          entryRecord.spendableBalance = legacySubAvailable;
        }
        if (!hasProperty(entryRecord, 'withdrawableBalance')) {
          entryRecord.withdrawableBalance = legacySubAvailable;
        }
        delete entryRecord.availableBalance;
      }
    }
  }

  return state;
};

export default migration;
