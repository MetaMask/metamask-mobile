import type { Hex } from '@metamask/utils';

type UpgradeAccount = (address: Hex) => Promise<void>;

const upgradesInFlight = new Map<string, Promise<void>>();

export interface MoneyAccountUpgradeRunResult {
  promise: Promise<void>;
  reused: boolean;
}

/**
 * Runs the Money Account upgrade sequence once per address at a time.
 */
export function runMoneyAccountUpgrade({
  address,
  upgradeAccount,
}: {
  address: Hex;
  upgradeAccount: UpgradeAccount;
}): MoneyAccountUpgradeRunResult {
  const key = address.toLowerCase();
  const existing = upgradesInFlight.get(key);

  if (existing) {
    return { promise: existing, reused: true };
  }

  const promise = Promise.resolve()
    .then(() => upgradeAccount(address))
    .finally(() => {
      upgradesInFlight.delete(key);
    });

  upgradesInFlight.set(key, promise);

  return { promise, reused: false };
}

/** @internal For test use only. */
export function __resetMoneyAccountUpgradeRunnerForTesting() {
  upgradesInFlight.clear();
}
