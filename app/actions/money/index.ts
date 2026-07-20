import type { AnyAction } from 'redux';
import type { ThunkAction } from 'redux-thunk';
import { type Hex, isStrictHexString } from '@metamask/utils';
import { isMoneyAccountUpgradeStepError } from '@metamask/money-account-upgrade-controller';
import type { RootState } from '../../reducers';
import { selectPrimaryMoneyAccount } from '../../selectors/moneyAccountController';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import { whenMoneyAccountUpgradeReady } from '../../core/Engine/controllers/money-account-upgrade-controller-init';
import {
  isMoneyAccountUpgradeAbortedError,
  upgradeAccountWithRetry,
} from '../../lib/Money/upgrade-account-with-retry';

const LOG_PREFIX = '[upgradeMoneyAccount]';

/** Sentry tag used to group/filter Money Account upgrade failures. */
const SENTRY_FEATURE_TAG = 'money-account-upgrade';

/**
 * Reports an upgrade failure to Sentry, tagged with the failing step when
 * the error carries one.
 *
 * @param error - The failure to report.
 * @param data - Extra context data (e.g. the attempt number for a failure
 * that is about to be retried).
 */
function reportUpgradeError(
  error: unknown,
  data: Record<string, unknown> = {},
): void {
  const wrapped = error instanceof Error ? error : new Error(String(error));
  const step = isMoneyAccountUpgradeStepError(error) ? error.step : undefined;
  Logger.error(wrapped, {
    tags: {
      feature: SENTRY_FEATURE_TAG,
      ...(step ? { step } : {}),
    },
    context: {
      name: 'money_account_upgrade',
      data: { phase: 'upgrade', ...(step ? { step } : {}), ...data },
    },
  });
}

interface InFlightUpgrade {
  /**
   * Signal of the most recent caller whose dispatch was shadowed by this run.
   * Two screens (Money home and the confirmations stack) trigger the upgrade
   * on focus; navigating between them can dispatch under the new screen's
   * signal while the old screen's run is still winding down. If this run ends
   * because it was aborted, the upgrade restarts under the takeover signal so
   * the newly focused screen still gets its attempt.
   */
  takeoverSignal?: AbortSignal;
}

const upgradesInFlight = new Map<Hex, InFlightUpgrade>();

/** @internal For test use only. */
export const __resetUpgradesInFlightForTesting = () => {
  upgradesInFlight.clear();
};

/**
 * Runs the upgrade for `address`, deduplicating against an in-flight run and
 * restarting under the newest shadowed caller's signal when an aborted run
 * settles.
 *
 * @param address - The Money Account address to upgrade.
 * @param signal - Aborts the run (including scheduled retries).
 */
function startUpgradeRun(address: Hex, signal?: AbortSignal): void {
  const inFlight = upgradesInFlight.get(address);
  if (inFlight) {
    inFlight.takeoverSignal = signal;
    Logger.log(LOG_PREFIX, 'upgrade already in flight; queued takeover', {
      address,
    });
    return;
  }

  const entry: InFlightUpgrade = {};
  upgradesInFlight.set(address, entry);
  const startedAt = Date.now();
  whenMoneyAccountUpgradeReady()
    .then(
      async () => {
        const { MoneyAccountUpgradeController } = Engine.context;
        const accountKey = address.toLowerCase() as Hex;
        const recordedBefore = Boolean(
          MoneyAccountUpgradeController.state.upgradedAccounts[accountKey],
        );
        Logger.log(LOG_PREFIX, 'starting upgrade', {
          address,
          recordedBefore,
        });

        await upgradeAccountWithRetry(
          (upgradeAddress) =>
            MoneyAccountUpgradeController.upgradeAccount(upgradeAddress),
          address,
          {
            signal,
            // Failures that end the run are reported by the catch below;
            // reporting retried ones here means every failure reaches
            // Sentry exactly once, even when a later attempt succeeds.
            onRetry: (error, attempt) => {
              Logger.log(LOG_PREFIX, 'attempt failed; will retry', {
                address,
                attempt,
              });
              reportUpgradeError(error, { attempt, willRetry: true });
            },
          },
        );

        Logger.log(LOG_PREFIX, 'upgrade succeeded', {
          address,
          recordedBefore,
          durationMs: Date.now() - startedAt,
          recorded:
            MoneyAccountUpgradeController.state.upgradedAccounts[accountKey],
        });
      },
      (error: unknown) => {
        // The controller isn't ready: the feature flag is off, the keyring
        // is locked, or bootstrap failed. "Not ready" is a normal state, and
        // bootstrap failures are already reported to Sentry by the
        // controller-init module — so we skip quietly here rather than
        // double-reporting a Sentry error.
        Logger.log(LOG_PREFIX, 'upgrade controller not ready; skipping', {
          address,
          reason: error instanceof Error ? error.message : String(error),
        });
      },
    )
    .catch((error: unknown) => {
      // Reached only for errors thrown by upgradeAccountWithRetry itself.
      // An aborted run (screen lost focus) is a normal way for the retry
      // loop to end, not a failure worth reporting. Match the abort
      // rejection itself rather than `signal.aborted`, so a genuine failure
      // that lands just after the user navigates away is still reported.
      if (isMoneyAccountUpgradeAbortedError(error)) {
        Logger.log(LOG_PREFIX, 'upgrade aborted; skipping', { address });
        return;
      }
      reportUpgradeError(error);
    })
    .finally(() => {
      upgradesInFlight.delete(address);
      const { takeoverSignal } = entry;
      if (signal?.aborted && takeoverSignal && !takeoverSignal.aborted) {
        Logger.log(LOG_PREFIX, 'restarting upgrade for takeover signal', {
          address,
        });
        startUpgradeRun(address, takeoverSignal);
      }
    });
}

export const upgradeMoneyAccount =
  (signal?: AbortSignal): ThunkAction<void, RootState, unknown, AnyAction> =>
  (_dispatch, getState) => {
    const address = selectPrimaryMoneyAccount(getState())?.address;
    if (!address || !isStrictHexString(address)) {
      Logger.log(LOG_PREFIX, 'no valid primary money account; skipping', {
        address,
      });
      return;
    }

    startUpgradeRun(address, signal);
  };
