import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { providerErrors } from '@metamask/rpc-errors';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';

import Engine from '../../../../core/Engine';
import EngineService from '../../../../core/EngineService';
import { generateTransferData } from '../../../../util/transactions';
import { getTokenTransferData } from '../../../Views/confirmations/utils/transaction-pay';
import { parseStandardTokenTransactionData } from '../../../Views/confirmations/utils/transaction';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';

interface PayTokenSelection {
  address: Hex;
  chainId: Hex;
}

interface CreateMusdConversionTransactionParams {
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

function getMusdTokenAddress(chainId: Hex): Hex {
  const musdTokenAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[chainId];
  if (!musdTokenAddress) {
    throw new Error(`mUSD token address not found for chain ID: ${chainId}`);
  }

  return musdTokenAddress;
}

function getHexFromEthersBigNumberLike(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const maybeHex = (value as { _hex?: unknown })._hex;
  if (typeof maybeHex === 'string') {
    return maybeHex;
  }

  const toHexString = (value as { toHexString?: unknown }).toHexString;
  if (typeof toHexString === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (toHexString as any).call(value) as string;
  }

  return undefined;
}

function extractMusdConversionTransferDetails(
  transactionMeta: TransactionMeta,
): { recipientAddress: Hex; amountHex: string } {
  const tokenTransferData = getTokenTransferData(transactionMeta);

  const parsedTokenTransferData = parseStandardTokenTransactionData(
    tokenTransferData?.data,
  );

  const fromAddress = transactionMeta?.txParams?.from as Hex | undefined;

  const recipientAddress =
    (parsedTokenTransferData?.args?._to?.toString() as Hex | undefined) ??
    fromAddress;

  const amountHex =
    getHexFromEthersBigNumberLike(parsedTokenTransferData?.args?._value) ??
    '0x0';

  if (!recipientAddress) {
    throw new Error('[mUSD Conversion] Missing transaction txParams.from');
  }

  return { recipientAddress, amountHex };
}

function buildMusdConversionTx(params: {
  outputChainId: Hex;
  fromAddress: Hex;
  recipientAddress: Hex;
  amountHex: string;
  networkClientId: string;
}): {
  txParams: { to: Hex; from: Hex; data: Hex; value: '0x0' };
  addTxOptions: {
    /**
     * Calculate gas estimate asynchronously to reduce first paint time.
     */
    skipInitialGasEstimate: true;
    networkClientId: string;
    origin: typeof ORIGIN_METAMASK;
    type: TransactionType.musdConversion;
  };
} {
  const {
    outputChainId,
    fromAddress,
    recipientAddress,
    amountHex,
    networkClientId,
  } = params;

  const musdTokenAddress = getMusdTokenAddress(outputChainId);

  const transferData = generateTransferData('transfer', {
    toAddress: recipientAddress,
    amount: amountHex,
  }) as Hex;

  return {
    txParams: {
      to: musdTokenAddress,
      from: fromAddress,
      data: transferData,
      value: '0x0',
    },
    addTxOptions: {
      skipInitialGasEstimate: true,
      networkClientId,
      origin: ORIGIN_METAMASK,
      type: TransactionType.musdConversion,
    },
  };
}

/* ============================================================
 * Controller integration (side-effects live here)
 * ============================================================
 */

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

  const { txParams, addTxOptions } = buildMusdConversionTx({
    outputChainId,
    fromAddress,
    recipientAddress,
    amountHex,
    networkClientId: resolvedNetworkClientId,
  });

  const { transactionMeta } = await TransactionController.addTransaction(
    txParams,
    addTxOptions,
  );

  return {
    transactionId: transactionMeta.id,
  };
}

/* ============================================================
 * Orchestrator (side-effects + ordering)
 * ============================================================
 */

function assertMusdSupportedOnChainForReplacement(chainId: Hex): void {
  const musdTokenAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[chainId];
  if (!musdTokenAddress) {
    throw new Error(
      `[mUSD Conversion] mUSD not supported on selected chain: ${chainId}`,
    );
  }
}

/**
 * Replaces an mUSD conversion transaction when the user selects a payment token
 * on a different chain. This ensures same-chain conversions (no bridging).
 *
 * @param transactionMeta - The current transaction to replace
 * @param newPayToken - The selected payment token (on a different chain)
 * @returns The new transaction ID, or undefined if replacement failed
 */
export async function replaceMusdConversionTransactionForPayToken(
  transactionMeta: TransactionMeta,
  newPayToken: PayTokenSelection,
): Promise<string | undefined> {
  if (!transactionMeta?.id || !transactionMeta?.txParams?.from) {
    throw new Error(
      '[mUSD Conversion] Missing transaction metadata for replacement',
    );
  }

  const newChainId = newPayToken.chainId;

  assertMusdSupportedOnChainForReplacement(newChainId);

  const { recipientAddress, amountHex } =
    extractMusdConversionTransferDetails(transactionMeta);

  try {
    const { transactionId: newTransactionId } =
      await createMusdConversionTransaction({
        outputChainId: newChainId,
        fromAddress: transactionMeta.txParams.from as Hex,
        recipientAddress,
        amountHex,
      });

    const {
      GasFeeController,
      TransactionPayController,
      ApprovalController,
      NetworkController,
    } = Engine.context;

    const networkClientId =
      NetworkController.findNetworkClientIdByChainId(newChainId);

    GasFeeController.fetchGasFeeEstimates({ networkClientId }).catch(
      () => undefined,
    );

    TransactionPayController.updatePaymentToken({
      transactionId: newTransactionId,
      tokenAddress: newPayToken.address,
      chainId: newPayToken.chainId,
    });

    EngineService.flushState();

    // This is an automatic rejection (not user-initiated)
    ApprovalController.reject(
      transactionMeta.id,
      providerErrors.userRejectedRequest({
        message:
          'Automatically rejected previous transaction due to same-chain enforcement for mUSD conversions',
        data: {
          cause: 'musdConversionSameChainEnforcement',
          previousTransactionId: transactionMeta.id,
          previousPayTokenChainId: transactionMeta.txParams.chainId,
          newTransactionId,
          newPayTokenChainId: newPayToken.chainId,
        },
      }),
    );

    return newTransactionId;
  } catch (error) {
    console.error(
      '[mUSD Conversion] Failed to replace transaction on chain change',
      error,
    );
    return undefined;
  }
}
