import type {
  IsAtomicBatchSupportedResult,
  IsAtomicBatchSupportedResultEntry,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { whenMoneyAccountUpgradeReady } from '../../money-account-upgrade-controller-init';
import { runMoneyAccountUpgrade } from '../../money-account-upgrade-controller-runner';
import type { CardControllerMessenger } from '../types';
import { CardProviderError, CardProviderErrorCode } from '../provider-types';

export const MONEY_ACCOUNT_7702_READY_TIMEOUT_MS = 60_000;
export const MONEY_ACCOUNT_7702_READY_POLL_INTERVAL_MS = 1_000;

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function findChainSupport(
  result: IsAtomicBatchSupportedResult,
  chainId: Hex,
): IsAtomicBatchSupportedResultEntry | undefined {
  return result.find(
    (entry) => entry.chainId.toLowerCase() === chainId.toLowerCase(),
  );
}

async function isMoneyAccount7702Ready({
  messenger,
  address,
  chainId,
}: {
  messenger: CardControllerMessenger;
  address: Hex;
  chainId: Hex;
}): Promise<boolean> {
  const atomicBatchSupport = await messenger.call(
    'TransactionController:isAtomicBatchSupported',
    { address, chainIds: [chainId] },
  );
  const chainEntry = findChainSupport(atomicBatchSupport, chainId);

  return Boolean(chainEntry?.isSupported);
}

function toCardProviderError(
  error: unknown,
  message: string,
): CardProviderError {
  if (error instanceof CardProviderError) {
    return error;
  }

  return new CardProviderError(CardProviderErrorCode.Unknown, message);
}

export async function ensureMoneyAccount7702Ready({
  messenger,
  address,
  chainId,
  timeoutMs = MONEY_ACCOUNT_7702_READY_TIMEOUT_MS,
  pollIntervalMs = MONEY_ACCOUNT_7702_READY_POLL_INTERVAL_MS,
}: {
  messenger: CardControllerMessenger;
  address: Hex;
  chainId: Hex;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<void> {
  try {
    if (await isMoneyAccount7702Ready({ messenger, address, chainId })) {
      return;
    }
  } catch (error) {
    throw toCardProviderError(
      error,
      'Unable to check Money Account 7702 readiness',
    );
  }

  try {
    const { promise } = runMoneyAccountUpgrade({
      address,
      upgradeAccount: async (upgradeAddress) => {
        await whenMoneyAccountUpgradeReady();
        await messenger.call(
          'MoneyAccountUpgradeController:upgradeAccount',
          upgradeAddress,
        );
      },
    });

    await promise;
  } catch (error) {
    throw toCardProviderError(error, 'Money Account 7702 upgrade failed');
  }

  try {
    if (await isMoneyAccount7702Ready({ messenger, address, chainId })) {
      return;
    }

    for (
      let elapsedMs = 0;
      elapsedMs < timeoutMs;
      elapsedMs += pollIntervalMs
    ) {
      await wait(Math.min(pollIntervalMs, timeoutMs - elapsedMs));

      if (await isMoneyAccount7702Ready({ messenger, address, chainId })) {
        return;
      }
    }
  } catch (error) {
    throw toCardProviderError(
      error,
      'Unable to check Money Account 7702 readiness',
    );
  }

  throw new CardProviderError(
    CardProviderErrorCode.Timeout,
    `Money Account 7702 readiness timed out after ${timeoutMs}ms`,
  );
}
