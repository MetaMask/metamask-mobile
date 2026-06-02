import type { Hex } from '@metamask/utils';
import {
  __resetMoneyAccountUpgradeRunnerForTesting,
  runMoneyAccountUpgrade,
} from './money-account-upgrade-controller-runner';

const ADDRESS = '0x000000000000000000000000000000000000dEaD' as Hex;
const ADDRESS_LOWER = ADDRESS.toLowerCase() as Hex;
const OTHER_ADDRESS = '0x000000000000000000000000000000000000bEEF' as Hex;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

function createDeferredUpgrade() {
  let resolveUpgrade: (() => void) | undefined;
  let rejectUpgrade: ((error: Error) => void) | undefined;

  const upgradeAccount = jest.fn(
    () =>
      new Promise<void>((resolve, reject) => {
        resolveUpgrade = resolve;
        rejectUpgrade = reject;
      }),
  );

  return {
    upgradeAccount,
    resolveUpgrade: () => resolveUpgrade?.(),
    rejectUpgrade: (error: Error) => rejectUpgrade?.(error),
  };
}

describe('runMoneyAccountUpgrade', () => {
  beforeEach(() => {
    __resetMoneyAccountUpgradeRunnerForTesting();
  });

  it('runs a fresh upgrade and returns reused=false', async () => {
    const upgradeAccount = jest.fn().mockResolvedValue(undefined);

    const { promise, reused } = runMoneyAccountUpgrade({
      address: ADDRESS,
      upgradeAccount,
    });

    expect(reused).toBe(false);
    await promise;

    expect(upgradeAccount).toHaveBeenCalledTimes(1);
    expect(upgradeAccount).toHaveBeenCalledWith(ADDRESS);
  });

  it('shares the in-flight promise for the same address', async () => {
    const deferred = createDeferredUpgrade();

    const first = runMoneyAccountUpgrade({
      address: ADDRESS,
      upgradeAccount: deferred.upgradeAccount,
    });
    const second = runMoneyAccountUpgrade({
      address: ADDRESS,
      upgradeAccount: jest.fn().mockResolvedValue(undefined),
    });

    expect(first.reused).toBe(false);
    expect(second.reused).toBe(true);
    expect(second.promise).toBe(first.promise);

    await flushPromises();
    deferred.resolveUpgrade();
    await Promise.all([first.promise, second.promise]);

    expect(deferred.upgradeAccount).toHaveBeenCalledTimes(1);
  });

  it('runs separate upgrades for different addresses', async () => {
    const firstUpgrade = jest.fn().mockResolvedValue(undefined);
    const secondUpgrade = jest.fn().mockResolvedValue(undefined);

    const first = runMoneyAccountUpgrade({
      address: ADDRESS,
      upgradeAccount: firstUpgrade,
    });
    const second = runMoneyAccountUpgrade({
      address: OTHER_ADDRESS,
      upgradeAccount: secondUpgrade,
    });

    expect(first.reused).toBe(false);
    expect(second.reused).toBe(false);

    await Promise.all([first.promise, second.promise]);

    expect(firstUpgrade).toHaveBeenCalledTimes(1);
    expect(firstUpgrade).toHaveBeenCalledWith(ADDRESS);
    expect(secondUpgrade).toHaveBeenCalledTimes(1);
    expect(secondUpgrade).toHaveBeenCalledWith(OTHER_ADDRESS);
  });

  it('coalesces upgrades for the same address regardless of casing', async () => {
    const deferred = createDeferredUpgrade();

    const first = runMoneyAccountUpgrade({
      address: ADDRESS,
      upgradeAccount: deferred.upgradeAccount,
    });
    const second = runMoneyAccountUpgrade({
      address: ADDRESS_LOWER,
      upgradeAccount: jest.fn().mockResolvedValue(undefined),
    });

    expect(first.reused).toBe(false);
    expect(second.reused).toBe(true);

    await flushPromises();
    deferred.resolveUpgrade();
    await Promise.all([first.promise, second.promise]);

    expect(deferred.upgradeAccount).toHaveBeenCalledTimes(1);
  });

  it('starts a fresh upgrade after the previous one resolves', async () => {
    const upgradeAccount = jest.fn().mockResolvedValue(undefined);

    const first = runMoneyAccountUpgrade({
      address: ADDRESS,
      upgradeAccount,
    });
    await first.promise;

    const second = runMoneyAccountUpgrade({
      address: ADDRESS,
      upgradeAccount,
    });
    await second.promise;

    expect(first.reused).toBe(false);
    expect(second.reused).toBe(false);
    expect(upgradeAccount).toHaveBeenCalledTimes(2);
  });

  it('clears the in-flight entry after rejection so a retry can start', async () => {
    const failingUpgrade = jest
      .fn()
      .mockRejectedValue(new Error('upgrade failed'));
    const retryUpgrade = jest.fn().mockResolvedValue(undefined);

    const first = runMoneyAccountUpgrade({
      address: ADDRESS,
      upgradeAccount: failingUpgrade,
    });

    await expect(first.promise).rejects.toThrow('upgrade failed');

    const second = runMoneyAccountUpgrade({
      address: ADDRESS,
      upgradeAccount: retryUpgrade,
    });

    expect(second.reused).toBe(false);
    await second.promise;

    expect(failingUpgrade).toHaveBeenCalledTimes(1);
    expect(retryUpgrade).toHaveBeenCalledTimes(1);
  });

  it('clears in-flight state when reset for testing', async () => {
    const deferred = createDeferredUpgrade();

    runMoneyAccountUpgrade({
      address: ADDRESS,
      upgradeAccount: deferred.upgradeAccount,
    });

    __resetMoneyAccountUpgradeRunnerForTesting();

    const retryUpgrade = jest.fn().mockResolvedValue(undefined);
    const retry = runMoneyAccountUpgrade({
      address: ADDRESS,
      upgradeAccount: retryUpgrade,
    });

    expect(retry.reused).toBe(false);
    await retry.promise;

    expect(retryUpgrade).toHaveBeenCalledTimes(1);
  });
});
