import type {
  PersonalMessageParams,
  TypedMessageParams,
} from '@metamask/keyring-controller';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import type { PolymarketCallbacks } from '@metamask/transaction-pay-controller';
import type { Hex } from '@metamask/utils';

import {
  deriveDepositWalletAddress,
  executeDepositWalletBatchAndWaitForCompletion,
} from '../../../../components/UI/Predict/providers/polymarket/depositWallet';
import type { Signer } from '../../../../components/UI/Predict/providers/types';
import type { TransactionPayControllerInitMessenger } from '../../messengers/transaction-pay-controller-messenger';

const WALLET_BUSY_RETRY_ATTEMPTS = 5;
const WALLET_BUSY_RETRY_DELAY_MS = 3000;
const WALLET_BUSY_ERROR_MARKER = 'wallet action';

export function createPolymarketCallbacks(
  initMessenger: TransactionPayControllerInitMessenger,
): PolymarketCallbacks {
  return {
    getDepositWalletAddress: ({ eoa }) => getDepositWalletAddress(eoa),

    submitDepositWalletBatch: ({ eoa, depositWallet, calls }) =>
      submitDepositWalletBatch(initMessenger, { eoa, depositWallet, calls }),
  };
}

async function getDepositWalletAddress(eoa: Hex): Promise<Hex> {
  return deriveDepositWalletAddress(eoa) as Hex;
}

async function submitDepositWalletBatch(
  initMessenger: TransactionPayControllerInitMessenger,
  {
    eoa,
    depositWallet,
    calls,
  }: {
    eoa: Hex;
    depositWallet: Hex;
    calls: { target: Hex; data: Hex; value: string }[];
  },
): Promise<{ sourceHash: Hex }> {
  return withWalletBusyRetry(async () => {
    const sourceHash = await executeDepositWalletBatchAndWaitForCompletion({
      signer: createSigner(initMessenger, eoa),
      walletAddress: depositWallet,
      calls,
    });
    return { sourceHash };
  });
}

function createSigner(
  initMessenger: TransactionPayControllerInitMessenger,
  address: Hex,
): Signer {
  return {
    address,
    signTypedMessage: (
      params: TypedMessageParams,
      version: SignTypedDataVersion,
    ) =>
      initMessenger.call(
        'KeyringController:signTypedMessage',
        params,
        version,
      ),
    signPersonalMessage: (params: PersonalMessageParams) =>
      initMessenger.call('KeyringController:signPersonalMessage', params),
  };
}

async function withWalletBusyRetry<T>(action: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < WALLET_BUSY_RETRY_ATTEMPTS; attempt++) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (
        !isWalletBusyError(error) ||
        attempt === WALLET_BUSY_RETRY_ATTEMPTS - 1
      ) {
        throw error;
      }
      await sleep(WALLET_BUSY_RETRY_DELAY_MS);
    }
  }
  throw lastError;
}

function isWalletBusyError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.toLowerCase().includes(WALLET_BUSY_ERROR_MARKER);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
