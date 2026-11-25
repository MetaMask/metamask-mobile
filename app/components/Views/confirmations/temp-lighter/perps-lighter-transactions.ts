import { toHex } from '@metamask/controller-utils';
import { providerErrors } from '@metamask/rpc-errors';
import {
  TransactionMeta,
  TransactionParams,
  TransactionType,
  generateEIP7702BatchTransaction,
  updateEIP7702BatchData,
} from '@metamask/transaction-controller';
import {
  PaymentOverride,
  type TransactionConfig,
} from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';

import Engine from '../../../../core/Engine';
import {
  addTransaction,
  addTransactionBatch,
} from '../../../../util/transaction-controller';
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
  isInternal?: boolean;
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
  /** Set on the new confirmation's pay config once it is added. */
  paymentOverride?: PaymentOverride.PerpsLighter;
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
      // The batch calls the user's own account with data, which the
      // controller rejects for a transaction it treats as external.
      isInternal: true,
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
 * Mainnet USDC deposit into an existing Lighter account, as a new
 * confirmation. It has no calldata. Pay quotes the required mainnet USDC into
 * Lighter because `paymentOverride` is set once the confirmation is added.
 *
 * @param request - Deposit to build.
 * @param request.amount - USDC amount in base units.
 * @param request.from - Logged-in user credited by the deposit.
 * @param request.mainnetNetworkClientId - Ethereum mainnet client.
 * @param request.origin - Origin of the confirmation being replaced.
 * @param request.type - Lighter deposit type to create.
 * @returns The transaction to add.
 */
export function buildLighterExistingAccountDepositRequest({
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
  const { requiredAsset } = buildLighterUsdcDepositTransaction(from, amount);

  return {
    params: { from, to: from, value: '0x0' },
    options: {
      networkClientId: mainnetNetworkClientId,
      origin,
      requiredAssets: [requiredAsset],
      requireApproval: true,
      skipInitialGasEstimate: true,
      type,
    },
    paymentOverride: PaymentOverride.PerpsLighter,
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
 * Required asset of a Lighter withdraw: the USDC the Perps withdraw transfers,
 * declared as the Lighter perps balance. Other types have no required assets,
 * so Pay reads them from the transfer.
 *
 * TODO: `assetId` is not on `RequiredAsset` until this app depends on a
 * `@metamask/transaction-controller` release with MetaMask/core#11730.
 *
 * @param meta - Withdraw confirmation being replaced.
 * @param type - Withdraw type for the selected provider.
 * @returns The required assets for the new confirmation, if any.
 */
export function buildLighterWithdrawRequiredAssets(
  meta: TransactionMeta,
  type: TransactionType,
): TransactionMeta['requiredAssets'] {
  if (type !== TransactionType.perpsLighterWithdraw) {
    return undefined;
  }

  const transfer = getTokenTransferData(meta);
  const amount = parseStandardTokenTransactionData(transfer?.data)?.args
    ?._value;

  if (!transfer || amount === undefined) {
    return undefined;
  }

  const requiredAsset = {
    address: transfer.to,
    amount: toHex(BigInt(amount.toString())),
    assetId: LIGHTER_USDC_ASSET_ID,
    standard: 'erc20',
  };

  return [requiredAsset];
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
  const requiredAssets = buildLighterWithdrawRequiredAssets(meta, type);

  return {
    params: { ...meta.txParams },
    options: {
      nestedTransactions: meta.nestedTransactions,
      networkClientId: meta.networkClientId,
      origin: meta.origin,
      ...(requiredAssets ? { requiredAssets } : {}),
      requireApproval: true,
      type,
    },
  };
}

/**
 * Replaces a Perps withdraw batch with the same batch typed for the other
 * provider. The Perps withdraw is a batch whose nested transaction carries the
 * type, so it cannot be recreated with `addTransaction`.
 *
 * @param meta - Withdraw confirmation being replaced.
 * @param type - Withdraw type for the selected provider.
 */
export async function replacePerpsWithdrawBatch(
  meta: TransactionMeta,
  type: TransactionType,
): Promise<void> {
  const { controllerMessenger } = Engine;
  const event = 'TransactionController:unapprovedTransactionAdded';

  const requiredAssets = buildLighterWithdrawRequiredAssets(meta, type);

  // `addTransactionBatch` resolves only once the batch is approved, so the
  // previous approval is rejected as soon as the new transaction appears.
  await new Promise<void>((resolve, reject) => {
    let isSubscribed = true;
    let onAdded: (added: TransactionMeta) => void = () => undefined;
    const unsubscribe = () => {
      // The batch can fail long after the new transaction appeared.
      if (isSubscribed) {
        isSubscribed = false;
        controllerMessenger.unsubscribe(event, onAdded);
      }
    };
    onAdded = (added: TransactionMeta) => {
      if (added.id === meta.id || added.type !== TransactionType.batch) {
        return;
      }
      unsubscribe();
      resolve();
    };
    controllerMessenger.subscribe(event, onAdded);

    addTransactionBatch({
      from: meta.txParams.from as Hex,
      origin: meta.origin,
      isInternal: true,
      networkClientId: meta.networkClientId,
      disableHook: true,
      disableSequential: true,
      overwriteUpgrade: true,
      ...(requiredAssets ? { requiredAssets } : {}),
      transactions: (meta.nestedTransactions ?? []).map(
        ({ to, data, value, type: nestedType }) => ({
          params: { to, data, value },
          type:
            nestedType === TransactionType.perpsWithdraw ||
            nestedType === TransactionType.perpsLighterWithdraw
              ? type
              : nestedType,
        }),
      ),
    }).catch((error: unknown) => {
      unsubscribe();
      reject(error);
    });
  });

  Engine.context.ApprovalController.rejectRequest(
    meta.id,
    providerErrors.userRejectedRequest(),
  );
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
  const { transactionMeta } = await addTransaction(
    request.params,
    request.options,
  );

  if (request.paymentOverride) {
    setPaymentOverride(transactionMeta.id, request.paymentOverride);
  }

  Engine.context.ApprovalController.rejectRequest(
    previousTransactionId,
    providerErrors.userRejectedRequest(),
  );
}

function setPaymentOverride(
  transactionId: string,
  paymentOverride: PaymentOverride.PerpsLighter,
): void {
  Engine.context.TransactionPayController.setTransactionConfig(
    transactionId,
    (config: TransactionConfig) => {
      config.paymentOverride = paymentOverride;
      // The pay token can be the required mainnet USDC itself, which Pay would
      // otherwise skip as a same-token no-op.
      config.isQuoteRequired = true;
    },
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
