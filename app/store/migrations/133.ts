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
 * Mapping preserves pre-refactor semantics per legacy field.
 *
 * `spendableBalance` takes `availableToTradeBalance` ?? `availableBalance`.
 * Pre-refactor the TAT-3016 hotfix folded spot USDC into
 * `availableToTradeBalance` for the order-entry path, so that is the
 * correct pre-refactor "max collateral for a new position" value.
 *
 * `withdrawableBalance` takes `availableBalance` only. Pre-refactor
 * `availableBalance` was perps-clearinghouse withdrawable only — the
 * correct cap for Standard-mode withdraw validation.
 *
 * The asymmetric mapping avoids inflating `withdrawableBalance` on cold
 * start for migrated Standard-mode users (where `availableToTradeBalance`
 * would include folded spot that HL won't actually let out). A fresh WS
 * fetch within ~1-2s of launch replaces the migrated values with live
 * post-refactor adapter output.
 *
 * The `subAccountBreakdown` entries (HIP-3) migrate from the legacy
 * `{ availableBalance, totalBalance }` shape to
 * `{ spendableBalance, withdrawableBalance, totalBalance }`. Sub-account
 * legacy `availableBalance` was the per-DEX perps-only value (no spot
 * fold), so both new sub fields take that value.
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

  const hasNewSpendable = hasProperty(accountState, 'spendableBalance');
  const hasNewWithdrawable = hasProperty(accountState, 'withdrawableBalance');
  const hasLegacyKey =
    hasProperty(accountState, 'availableBalance') ||
    hasProperty(accountState, 'availableToTradeBalance');

  if (hasLegacyKey || !hasNewSpendable || !hasNewWithdrawable) {
    const spendableResolved = legacyTradeable ?? legacyAvailable ?? '0';
    const withdrawableResolved = legacyAvailable ?? '0';
    if (!hasNewSpendable) {
      accountState.spendableBalance = spendableResolved;
    }
    if (!hasNewWithdrawable) {
      accountState.withdrawableBalance = withdrawableResolved;
    }
    // Always strip the legacy keys — including `null`/non-string shapes we
    // couldn't interpret — so downstream code never reads a stale field.
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
      const hasSubLegacyKey = hasProperty(entryRecord, 'availableBalance');
      const hasSubNewSpendable = hasProperty(entryRecord, 'spendableBalance');
      const hasSubNewWithdrawable = hasProperty(
        entryRecord,
        'withdrawableBalance',
      );
      if (hasSubLegacyKey || !hasSubNewSpendable || !hasSubNewWithdrawable) {
        const resolved = legacySubAvailable ?? '0';
        if (!hasSubNewSpendable) {
          entryRecord.spendableBalance = resolved;
        }
        if (!hasSubNewWithdrawable) {
          entryRecord.withdrawableBalance = resolved;
        }
        delete entryRecord.availableBalance;
      }
    }
  }

  return state;
};

export default migration;
