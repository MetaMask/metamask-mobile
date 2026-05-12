import type {
  PersonalMessageParams,
  TypedMessageParams,
} from '@metamask/keyring-controller';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import type { PolymarketCallbacks } from '@metamask/transaction-pay-controller';
import type { Hex } from '@metamask/utils';

import {
  deriveDepositWalletAddress,
  executeDepositWalletBatch,
  getDepositWalletRelayerTransactionId,
  waitForDepositWalletTransaction,
} from '../../../../components/UI/Predict/providers/polymarket/depositWallet';
import type { TransactionPayControllerInitMessenger } from '../../messengers/transaction-pay-controller-messenger';

const WALLET_BUSY_RETRY_ATTEMPTS = 5;
const WALLET_BUSY_RETRY_DELAY_MS = 3000;
const WALLET_BUSY_ERROR_MARKER = 'wallet action';

function isWalletBusyError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.toLowerCase().includes(WALLET_BUSY_ERROR_MARKER);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

export function createPolymarketCallbacks(
  initMessenger: TransactionPayControllerInitMessenger,
): PolymarketCallbacks {
  return {
    getDepositWalletAddress: async ({ eoa }) =>
      deriveDepositWalletAddress(eoa) as Hex,

    submitDepositWalletBatch: async ({ eoa, depositWallet, calls }) =>
      withWalletBusyRetry(async () => {
        const signer = {
          address: eoa,
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
            initMessenger.call(
              'KeyringController:signPersonalMessage',
              params,
            ),
        };

        const response = await executeDepositWalletBatch({
          signer,
          walletAddress: depositWallet,
          calls,
        });

        const transactionID = getDepositWalletRelayerTransactionId(response);
        if (!transactionID) {
          throw new Error(
            'Polymarket deposit wallet batch response missing transactionID',
          );
        }

        const sourceHash = await waitForDepositWalletTransaction({
          transactionID,
        });

        return { sourceHash };
      }),
  };
}
