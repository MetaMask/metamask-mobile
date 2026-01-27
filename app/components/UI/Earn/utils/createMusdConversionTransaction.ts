import { TransactionType } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { generateTransferData } from '../../../../util/transactions';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';

export interface CreateMusdConversionTransactionParams {
  outputChainId: Hex;
  fromAddress: Hex;
  recipientAddress: Hex;
  /**
   * ERC-20 transfer amount in hex.
   *
   * Note: Can be either prefixed (`0x...`) or unprefixed (`...`).
   * `generateTransferData` normalizes via `addHexPrefix`.
   */
  amountHex: string;
  /**
   * Optional optimization to avoid re-looking up the network client.
   */
  networkClientId?: string;
}

export async function createMusdConversionTransaction({
  outputChainId,
  fromAddress,
  recipientAddress,
  amountHex,
  networkClientId,
}: CreateMusdConversionTransactionParams): Promise<{ transactionId: string }> {
  const { NetworkController, TransactionController } = Engine.context;

  const resolvedNetworkClientId =
    networkClientId ??
    NetworkController.findNetworkClientIdByChainId(outputChainId);

  if (!resolvedNetworkClientId) {
    throw new Error(`Network client not found for chain ID: ${outputChainId}`);
  }

  const musdTokenAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[outputChainId];

  if (!musdTokenAddress) {
    throw new Error(
      `mUSD token address not found for chain ID: ${outputChainId}`,
    );
  }

  const transferData = generateTransferData('transfer', {
    toAddress: recipientAddress,
    amount: amountHex,
  }) as Hex;

  const { transactionMeta } = await TransactionController.addTransaction(
    {
      to: musdTokenAddress,
      from: fromAddress,
      data: transferData,
      value: '0x0',
    },
    {
      /**
       * Calculate gas estimate asynchronously to reduce first paint time.
       */
      skipInitialGasEstimate: true,
      networkClientId: resolvedNetworkClientId,
      origin: ORIGIN_METAMASK,
      type: TransactionType.musdConversion,
    },
  );

  return {
    transactionId: transactionMeta.id,
  };
}
