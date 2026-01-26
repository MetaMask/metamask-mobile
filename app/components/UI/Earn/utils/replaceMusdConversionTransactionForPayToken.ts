import { providerErrors } from '@metamask/rpc-errors';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import EngineService from '../../../../core/EngineService';
import { getTokenTransferData } from '../../../Views/confirmations/utils/transaction-pay';
import { parseStandardTokenTransactionData } from '../../../Views/confirmations/utils/transaction';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';
import { createMusdConversionTransaction } from './createMusdConversionTransaction';

export interface PayTokenSelection {
  address: Hex;
  chainId: Hex;
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
    console.error(
      '[mUSD Conversion] Missing transaction metadata for replacement',
      { transactionMeta },
    );
    return undefined;
  }

  const newChainId = newPayToken.chainId;

  const musdTokenAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[newChainId];
  if (!musdTokenAddress) {
    console.error('[mUSD Conversion] mUSD not supported on selected chain', {
      newChainId,
    });
    return undefined;
  }

  const tokenTransferData = getTokenTransferData(transactionMeta);

  const parsedTokenTransferData = parseStandardTokenTransactionData(
    tokenTransferData?.data,
  );

  const recipientAddress =
    (parsedTokenTransferData?.args?._to?.toString() as Hex | undefined) ??
    (transactionMeta.txParams.from as Hex);

  const amountHex =
    getHexFromEthersBigNumberLike(parsedTokenTransferData?.args?._value) ??
    '0x0';

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

    ApprovalController.reject(
      transactionMeta.id,
      providerErrors.userRejectedRequest(),
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
