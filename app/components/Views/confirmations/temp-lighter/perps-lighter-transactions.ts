import { toHex } from '@metamask/controller-utils';
import { providerErrors } from '@metamask/rpc-errors';
import {
  TransactionMeta,
  TransactionParams,
  TransactionType,
  generateEIP7702BatchTransaction,
  updateEIP7702BatchData,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';

import Engine from '../../../../core/Engine';
import { addTransaction } from '../../../../util/transaction-controller';
import { generateTransferData } from '../../../../util/transactions';
import { parseStandardTokenTransactionData } from '../utils/transaction';
import { getTokenTransferData } from '../utils/transaction-pay';
import {
  LIGHTER_USDC_DECIMALS,
  buildLighterUsdcDepositTransaction,
} from './lighter-usdc-deposit';

/**
 * Temporary. Perps should own creating both the Hyperliquid and Lighter
 * confirmations. Move this next to the Perps deposit flow once the perps
 * package exports it, and delete this file.
 */

/** Options passed to `TransactionController.addTransaction`. */
export interface PerpsTransactionOptions {
  nestedTransactions?: TransactionMeta['nestedTransactions'];
  networkClientId: string;
  origin?: string;
  requiredAssets?: TransactionMeta['requiredAssets'];
  requireApproval: true;
  skipInitialGasEstimate?: boolean;
  type: TransactionType;
}

export interface PerpsTransactionRequest {
  params: TransactionParams;
  options: PerpsTransactionOptions;
}

/** The Hyperliquid confirmation to recreate when the user switches back. */
export interface HyperliquidConfirmationSnapshot {
  nestedTransactions: TransactionMeta['nestedTransactions'];
  networkClientId: string;
  origin: string | undefined;
  requiredAssets: TransactionMeta['requiredAssets'];
  txParams: TransactionMeta['txParams'];
}

export function snapshotHyperliquidConfirmation(
  meta: TransactionMeta,
): HyperliquidConfirmationSnapshot {
  return {
    nestedTransactions: meta.nestedTransactions?.map((nested) => ({
      ...nested,
    })),
    networkClientId: meta.networkClientId,
    origin: meta.origin,
    requiredAssets: meta.requiredAssets?.map((asset) => ({ ...asset })),
    txParams: { ...meta.txParams },
  };
}

/**
 * Mainnet USDC approve plus Lighter deposit, as a new confirmation.
 *
 * Pay builds `targetChainId` and `targetTokenAddress` from the confirmation
 * chain and required asset, so the quote targets mainnet USDC.
 *
 * @param request - Deposit to build.
 * @param request.amount - USDC amount in base units.
 * @param request.from - Logged-in user credited by the deposit.
 * @param request.mainnetNetworkClientId - Ethereum mainnet client.
 * @param request.origin - Origin of the confirmation being replaced.
 * @param request.type - Lighter deposit type to create.
 * @returns The transaction to add.
 */
export function buildLighterDepositRequest({
  amount,
  from,
  mainnetNetworkClientId,
  origin,
  type,
}: {
  amount: bigint;
  from: Hex;
  mainnetNetworkClientId: string;
  origin: string | undefined;
  type: TransactionType;
}): PerpsTransactionRequest {
  const built = buildLighterUsdcDepositTransaction(from, amount);
  const batch = generateEIP7702BatchTransaction(from, [
    built.approve,
    built.deposit,
  ]);

  return {
    params: { from, to: batch.to, data: batch.data, value: '0x0' },
    options: {
      nestedTransactions: [built.approve, built.deposit],
      networkClientId: mainnetNetworkClientId,
      origin,
      requiredAssets: [built.requiredAsset],
      requireApproval: true,
      skipInitialGasEstimate: true,
      type,
    },
  };
}

/**
 * Hyperliquid deposit as it was before Lighter was selected, with the USDC
 * transfer and required asset re-encoded for `amount`. The snapshot holds the
 * amount from when Lighter was first chosen, which can differ from the amount
 * committed since.
 *
 * @param request - Deposit to rebuild.
 * @param request.amount - USDC amount in base units.
 * @param request.snapshot - Hyperliquid confirmation saved before Lighter.
 * @param request.type - Hyperliquid deposit type to create.
 * @returns The transaction to add.
 */
export function buildHyperliquidRestoreRequest({
  amount,
  snapshot,
  type,
}: {
  amount: bigint;
  snapshot: HyperliquidConfirmationSnapshot;
  type: TransactionType;
}): PerpsTransactionRequest {
  const txParams = { ...snapshot.txParams };
  let nestedTransactions = snapshot.nestedTransactions?.map((nested) => ({
    ...nested,
  }));

  const transfer = getTokenTransferData({
    nestedTransactions,
    txParams,
  } as TransactionMeta);
  const recipient = parseStandardTokenTransactionData(transfer?.data)?.args
    ?._to;

  if (transfer && recipient) {
    const data = generateTransferData('transfer', {
      toAddress: recipient,
      amount: amount.toString(16),
    }) as Hex;

    if (transfer.index === undefined) {
      txParams.data = data;
      if (nestedTransactions?.length === 1) {
        nestedTransactions = [{ ...nestedTransactions[0], data }];
      }
    } else {
      const batch = updateEIP7702BatchData({
        from: txParams.from as Hex,
        transactions: nestedTransactions ?? [],
        updates: [{ transactionIndex: transfer.index, transactionData: data }],
      });
      nestedTransactions = batch.nestedTransactions;
      txParams.data = batch.transactionData;
    }
  }

  const [firstAsset, ...otherAssets] = snapshot.requiredAssets ?? [];

  return {
    params: txParams,
    options: {
      nestedTransactions,
      networkClientId: snapshot.networkClientId,
      origin: snapshot.origin,
      requiredAssets: firstAsset
        ? [{ ...firstAsset, amount: toHex(amount) }, ...otherAssets]
        : undefined,
      requireApproval: true,
      skipInitialGasEstimate: true,
      type,
    },
  };
}

/**
 * The open confirmation again, with a different type. Used when only the
 * label changes, such as a withdraw.
 *
 * @param meta - Open confirmation.
 * @param type - Type for the new confirmation.
 * @returns The transaction to add.
 */
export function buildRetypedRequest(
  meta: TransactionMeta,
  type: TransactionType,
): PerpsTransactionRequest {
  return {
    params: { ...meta.txParams },
    options: {
      nestedTransactions: meta.nestedTransactions,
      networkClientId: meta.networkClientId,
      origin: meta.origin,
      requireApproval: true,
      type,
    },
  };
}

/**
 * Adds the new confirmation, then rejects the previous approval so the
 * confirmation screen follows the new transaction without ever being empty.
 *
 * @param request - New transaction to add.
 * @param previousTransactionId - Confirmation being replaced.
 */
export async function replacePerpsTransaction(
  request: PerpsTransactionRequest,
  previousTransactionId: string,
): Promise<void> {
  await addTransaction(request.params, request.options);

  Engine.context.ApprovalController.rejectRequest(
    previousTransactionId,
    providerErrors.userRejectedRequest(),
  );
}

/**
 * USDC amount already entered on this confirmation, in base units.
 * The pay token is 6-decimal USDC for both the Hyperliquid and Lighter legs.
 *
 * @param transactionId - Open confirmation.
 * @returns The entered amount, or 0 when the field is empty.
 */
export function readEnteredUsdcAmount(transactionId: string): bigint {
  const token =
    Engine.context.TransactionPayController.state.transactionData[transactionId]
      ?.tokens?.[0];

  if (token?.amountRaw) {
    try {
      const raw = BigInt(token.amountRaw);
      if (raw > 0n) {
        return raw;
      }
    } catch {
      // Fall through to the human amount.
    }
  }

  if (!token?.amountHuman || token.amountHuman === '0') {
    return 0n;
  }

  const parsed = new BigNumber(token.amountHuman)
    .shiftedBy(LIGHTER_USDC_DECIMALS)
    .decimalPlaces(0, BigNumber.ROUND_DOWN);
  if (!parsed.isFinite() || parsed.isNegative()) {
    return 0n;
  }

  return BigInt(parsed.toFixed(0));
}
