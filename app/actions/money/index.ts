import type { AnyAction } from 'redux';
import type { ThunkAction } from 'redux-thunk';
import { type Hex, isStrictHexString } from '@metamask/utils';
import { isMoneyAccountUpgradeStepError } from '@metamask/money-account-upgrade-controller';
import type { RootState } from '../../reducers';
import { selectPrimaryMoneyAccount } from '../../selectors/moneyAccountController';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import { whenMoneyAccountUpgradeReady } from '../../core/Engine/controllers/money-account-upgrade-controller-init';

const LOG_PREFIX = '[upgradeMoneyAccount]';

/** Sentry tag used to group/filter Money Account upgrade failures. */
const SENTRY_FEATURE_TAG = 'money-account-upgrade';

/**
 * Message `upgradeAccountWithRetry` rejects with when its AbortSignal fires.
 * Mirrors the controller package's internal constant, so we can tell an
 * aborted run apart from a genuine failure that happens to land after the
 * user navigated away (which should still be reported).
 */
const RETRY_ABORTED_MESSAGE = 'Money Account upgrade retry aborted';

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

        await MoneyAccountUpgradeController.upgradeAccountWithRetry(address, {
          signal,
        });

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
      if (error instanceof Error && error.message === RETRY_ABORTED_MESSAGE) {
        Logger.log(LOG_PREFIX, 'upgrade aborted; skipping', { address });
        return;
      }
      const wrapped = error instanceof Error ? error : new Error(String(error));
      const step = isMoneyAccountUpgradeStepError(error)
        ? error.step
        : undefined;
      Logger.error(wrapped, {
        tags: {
          feature: SENTRY_FEATURE_TAG,
          ...(step ? { step } : {}),
        },
        context: {
          name: 'money_account_upgrade',
          data: { phase: 'upgrade', ...(step ? { step } : {}) },
        },
      });
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
