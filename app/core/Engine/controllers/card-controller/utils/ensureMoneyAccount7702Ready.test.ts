import type { IsAtomicBatchSupportedResult } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { __resetMoneyAccountUpgradeRunnerForTesting } from '../../money-account-upgrade-controller-runner';
import { whenMoneyAccountUpgradeReady } from '../../money-account-upgrade-controller-init';
import type { CardControllerMessenger } from '../types';
import { CardProviderErrorCode } from '../provider-types';
import { ensureMoneyAccount7702Ready } from './ensureMoneyAccount7702Ready';

jest.mock('../../money-account-upgrade-controller-init', () => ({
  whenMoneyAccountUpgradeReady: jest.fn(() => Promise.resolve()),
}));

const ADDRESS = '0x000000000000000000000000000000000000dEaD' as Hex;
const CHAIN_ID = '0x8f' as Hex;

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

function buildMessenger({
  results,
  upgradeAccount = jest.fn().mockResolvedValue(undefined),
}: {
  results: IsAtomicBatchSupportedResult[];
  upgradeAccount?: jest.Mock;
}) {
  const isAtomicBatchSupportedCalls: unknown[][] = [];
  const upgradeAccountCalls: unknown[][] = [];
  let resultIndex = 0;

  const messenger = {
    call: jest.fn((action: string, ...args: unknown[]) => {
      if (action === 'TransactionController:isAtomicBatchSupported') {
        isAtomicBatchSupportedCalls.push(args);
        const result = results[Math.min(resultIndex, results.length - 1)] ?? [];
        resultIndex += 1;
        return Promise.resolve(result);
      }

      if (action === 'MoneyAccountUpgradeController:upgradeAccount') {
        upgradeAccountCalls.push(args);
        return upgradeAccount(...args);
      }

      return undefined;
    }),
  } as unknown as jest.Mocked<CardControllerMessenger>;

  return {
    messenger,
    isAtomicBatchSupportedCalls,
    upgradeAccountCalls,
    upgradeAccount,
  };
}

describe('ensureMoneyAccount7702Ready', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetMoneyAccountUpgradeRunnerForTesting();
  });

  it('returns without upgrade when the account is already supported', async () => {
    const handle = buildMessenger({
      results: [[{ chainId: CHAIN_ID, isSupported: true }]],
    });

    await ensureMoneyAccount7702Ready({
      messenger: handle.messenger,
      address: ADDRESS,
      chainId: CHAIN_ID,
    });

    expect(handle.isAtomicBatchSupportedCalls).toHaveLength(1);
    expect(handle.upgradeAccountCalls).toHaveLength(0);
  });

  it('runs upgrade and returns when the immediate readiness check is supported', async () => {
    const handle = buildMessenger({
      results: [
        [{ chainId: CHAIN_ID, isSupported: false }],
        [{ chainId: CHAIN_ID, isSupported: true }],
      ],
    });

    await ensureMoneyAccount7702Ready({
      messenger: handle.messenger,
      address: ADDRESS,
      chainId: CHAIN_ID,
    });

    expect(whenMoneyAccountUpgradeReady).toHaveBeenCalledTimes(1);
    expect(handle.upgradeAccountCalls).toEqual([[ADDRESS]]);
    expect(handle.isAtomicBatchSupportedCalls).toHaveLength(2);
  });

  it('polls until the account reports supported', async () => {
    const handle = buildMessenger({
      results: [
        [{ chainId: CHAIN_ID, isSupported: false }],
        [{ chainId: CHAIN_ID, isSupported: false }],
        [{ chainId: CHAIN_ID, isSupported: true }],
      ],
    });

    await ensureMoneyAccount7702Ready({
      messenger: handle.messenger,
      address: ADDRESS,
      chainId: CHAIN_ID,
      timeoutMs: 5,
      pollIntervalMs: 1,
    });

    expect(handle.upgradeAccountCalls).toHaveLength(1);
    expect(handle.isAtomicBatchSupportedCalls).toHaveLength(3);
  });

  it('throws timeout when readiness never becomes supported', async () => {
    const handle = buildMessenger({
      results: [[{ chainId: CHAIN_ID, isSupported: false }]],
    });

    await expect(
      ensureMoneyAccount7702Ready({
        messenger: handle.messenger,
        address: ADDRESS,
        chainId: CHAIN_ID,
        timeoutMs: 2,
        pollIntervalMs: 1,
      }),
    ).rejects.toMatchObject({
      code: CardProviderErrorCode.Timeout,
    });
  });

  it('throws unknown error when the readiness check rejects', async () => {
    const messenger = {
      call: jest.fn((action: string) => {
        if (action === 'TransactionController:isAtomicBatchSupported') {
          return Promise.reject(new Error('RPC timeout'));
        }

        return undefined;
      }),
    } as unknown as jest.Mocked<CardControllerMessenger>;

    await expect(
      ensureMoneyAccount7702Ready({
        messenger,
        address: ADDRESS,
        chainId: CHAIN_ID,
      }),
    ).rejects.toMatchObject({
      code: CardProviderErrorCode.Unknown,
      message: 'Unable to check Money Account 7702 readiness',
    });
  });

  it('throws unknown error when the upgrade rejects', async () => {
    const handle = buildMessenger({
      results: [[{ chainId: CHAIN_ID, isSupported: false }]],
      upgradeAccount: jest.fn().mockRejectedValue(new Error('upgrade failed')),
    });

    await expect(
      ensureMoneyAccount7702Ready({
        messenger: handle.messenger,
        address: ADDRESS,
        chainId: CHAIN_ID,
      }),
    ).rejects.toMatchObject({
      code: CardProviderErrorCode.Unknown,
      message: 'Money Account 7702 upgrade failed',
    });
  });

  it('shares a concurrent upgrade for the same address', async () => {
    let resolveUpgrade: (() => void) | undefined;
    const upgradeAccount = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveUpgrade = resolve;
        }),
    );
    const handle = buildMessenger({
      results: [
        [{ chainId: CHAIN_ID, isSupported: false }],
        [{ chainId: CHAIN_ID, isSupported: false }],
        [{ chainId: CHAIN_ID, isSupported: true }],
      ],
      upgradeAccount,
    });

    const firstPromise = ensureMoneyAccount7702Ready({
      messenger: handle.messenger,
      address: ADDRESS,
      chainId: CHAIN_ID,
    });
    const secondPromise = ensureMoneyAccount7702Ready({
      messenger: handle.messenger,
      address: ADDRESS,
      chainId: CHAIN_ID,
    });
    await flushPromises();
    resolveUpgrade?.();

    await Promise.all([firstPromise, secondPromise]);

    expect(upgradeAccount).toHaveBeenCalledTimes(1);
    expect(handle.upgradeAccountCalls).toHaveLength(1);
  });
});
