import { useEffect, useRef, type MutableRefObject } from 'react';
import { toHex } from '@metamask/controller-utils';
import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionType,
  generateEIP7702BatchTransaction,
  updateEIP7702BatchData,
} from '@metamask/transaction-controller';
import {
  PaymentOverride,
  type TransactionConfig,
} from '@metamask/transaction-pay-controller';
import { Hex, isAddress } from 'viem';
import { BigNumber } from 'bignumber.js';

import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { generateTransferData } from '../../../../../util/transactions';
import type { PerpsReceiveDestination } from '../../components/rows/perps-receive-to-row';
import type { PerpsWithdrawSource } from '../../components/rows/perps-withdraw-from-row';
import {
  LIGHTER_USDC_DECIMALS,
  buildLighterUsdcDepositTransaction,
  userHasLighterAccount,
} from '../../utils/lighter-usdc-deposit';
import { perpsTransactionTypeForSelection } from '../../utils/perps-lighter-transaction-type';
import { parseStandardTokenTransactionData } from '../../utils/transaction';
import { getTokenTransferData } from '../../utils/transaction-pay';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

interface ConfirmationSnapshot {
  chainId: TransactionMeta['chainId'];
  networkClientId: string;
  nestedTransactions: TransactionMeta['nestedTransactions'];
  requiredAssets: TransactionMeta['requiredAssets'];
  txParams: TransactionMeta['txParams'];
}

function isLighterPerpsDeposit(type: TransactionType | undefined): boolean {
  return (
    type === TransactionType.perpsLighterDeposit ||
    type === TransactionType.perpsLighterDepositAndOrder
  );
}

function releaseAppliedKey(
  appliedKeyRef: MutableRefObject<string | undefined>,
  requestKey: string,
): void {
  if (appliedKeyRef.current === requestKey) {
    appliedKeyRef.current = undefined;
  }
}

/**
 * Logs whether the address has a Lighter account, except while a Lighter
 * deposit lookup owns that log.
 *
 * @param options - Selector values and the open confirmation.
 * @param options.currentType - Type on the open confirmation.
 * @param options.destination - Receive-to choice.
 * @param options.from - Address being checked.
 * @param options.lookupKeyRef - Last address and selector pair already logged.
 * @param options.source - Withdraw-from choice.
 */
function logLighterAccountUnlessDepositOwnsIt({
  currentType,
  destination,
  from,
  lookupKeyRef,
  source,
}: {
  currentType: string | undefined;
  destination: PerpsReceiveDestination;
  from: string | undefined;
  lookupKeyRef: MutableRefObject<string | undefined>;
  source: PerpsWithdrawSource;
}): void {
  const checkingLighter = destination === 'lighter' || source === 'lighter';
  if (!checkingLighter || !from || !isAddress(from) || !currentType) {
    return;
  }

  const nextType = perpsTransactionTypeForSelection({
    currentType,
    destination,
    source,
  });
  if (isLighterPerpsDeposit(nextType)) {
    return;
  }

  const lookupKey = `${from}:${destination}:${source}`;
  if (lookupKeyRef.current === lookupKey) {
    return;
  }
  lookupKeyRef.current = lookupKey;

  userHasLighterAccount(from)
    .then((exists) => {
      Logger.log('Lighter account lookup', { address: from, exists });
    })
    .catch((error: unknown) => {
      Logger.error(error as Error, 'Failed to look up the Lighter account');
    });
}

/**
 * Writes the mainnet USDC deposit for a Lighter selection when the address has
 * no Lighter account yet. This PR only handles the first deposit. An existing
 * account keeps the Hyperliquid confirmation.
 *
 * @param options - Deposit request for the open confirmation.
 * @param options.appliedKeyRef - Key of the write already started.
 * @param options.from - Address credited by the deposit.
 * @param options.generation - Lookup generation that owns this request.
 * @param options.lookupGenerationRef - Latest lookup generation.
 * @param options.nextType - Lighter deposit type to store.
 * @param options.requestKey - Key cleared when this write fails.
 * @param options.snapshotRef - Hyperliquid confirmation to restore later.
 * @param options.transactionId - Open confirmation.
 * @param options.transactionMeta - Confirmation before the write.
 */
function depositMainnetUsdcWhenUnregistered({
  appliedKeyRef,
  from,
  generation,
  lookupGenerationRef,
  nextType,
  requestKey,
  snapshotRef,
  transactionId,
  transactionMeta,
}: {
  appliedKeyRef: MutableRefObject<string | undefined>;
  from: string | undefined;
  generation: number;
  lookupGenerationRef: MutableRefObject<number>;
  nextType: TransactionType;
  requestKey: string;
  snapshotRef: MutableRefObject<ConfirmationSnapshot | undefined>;
  transactionId: string;
  transactionMeta: TransactionMeta;
}): void {
  if (!from || !isAddress(from)) {
    appliedKeyRef.current = undefined;
    return;
  }

  userHasLighterAccount(from)
    .then((exists) => {
      Logger.log('Lighter account lookup', { address: from, exists });
      if (lookupGenerationRef.current !== generation || exists) {
        return;
      }
      try {
        writeLighterUsdcDeposit({
          amount: readEnteredUsdcAmount(transactionId),
          from,
          nextType,
          snapshotRef,
          transactionId,
          transactionMeta,
        });
      } catch (error: unknown) {
        releaseAppliedKey(appliedKeyRef, requestKey);
        Logger.error(
          error as Error,
          'Failed to update the Perps confirmation for the selected provider',
        );
      }
    })
    .catch((error: unknown) => {
      if (lookupGenerationRef.current !== generation) {
        return;
      }
      releaseAppliedKey(appliedKeyRef, requestKey);
      Logger.error(error as Error, 'Failed to look up the Lighter account');
    });
}

/**
 * Updates the open Perps confirmation when the user changes From or To.
 *
 * The type and payment override are written on the current transaction.
 * A Lighter deposit replaces the Hyperliquid bridge call with a mainnet USDC
 * approve and deposit, including when the address already has a Lighter
 * account. Pay reads the quote target from that confirmation and reloads the
 * quote when the call data or required asset changes.
 *
 * @param options - Current selector values from the amount screen.
 * @param options.destination - Receive-to choice.
 * @param options.source - Withdraw-from choice.
 */
export function useSyncPerpsLighterTransactionType({
  destination,
  source,
}: {
  destination: PerpsReceiveDestination;
  source: PerpsWithdrawSource;
}): void {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id;
  const currentType = transactionMeta?.type;
  const appliedKeyRef = useRef<string | undefined>(undefined);
  const lookupKeyRef = useRef<string | undefined>(undefined);
  const lookupGenerationRef = useRef(0);
  const hyperliquidConfirmationRef = useRef<ConfirmationSnapshot | undefined>(
    undefined,
  );

  useEffect(() => {
    logLighterAccountUnlessDepositOwnsIt({
      currentType,
      destination,
      from: transactionMeta?.txParams?.from,
      lookupKeyRef,
      source,
    });
  }, [currentType, destination, source, transactionMeta?.txParams?.from]);

  useEffect(() => {
    if (!transactionId || !currentType || !transactionMeta) {
      return;
    }

    const nextType = perpsTransactionTypeForSelection({
      currentType,
      destination,
      source,
    });
    if (!nextType) {
      return;
    }
    if (nextType === currentType) {
      // Drop a Lighter lookup still in flight so it cannot write after the user chose the current type.
      appliedKeyRef.current = undefined;
      lookupGenerationRef.current += 1;
      return;
    }

    const requestKey = `${transactionId}:${nextType}`;
    if (appliedKeyRef.current === requestKey) {
      return;
    }
    appliedKeyRef.current = requestKey;
    const generation = ++lookupGenerationRef.current;

    if (isLighterPerpsDeposit(nextType)) {
      depositMainnetUsdcWhenUnregistered({
        appliedKeyRef,
        from: transactionMeta.txParams?.from,
        generation,
        lookupGenerationRef,
        nextType,
        requestKey,
        snapshotRef: hyperliquidConfirmationRef,
        transactionId,
        transactionMeta,
      });
      return;
    }

    try {
      setPaymentOverride(transactionId, undefined);

      const snapshot = hyperliquidConfirmationRef.current;
      const amount = snapshot ? readEnteredUsdcAmount(transactionId) : 0n;
      Engine.context.TransactionController.updateTransactionMetadata({
        transactionId,
        skipResimulate: true,
        callback: (meta) => {
          meta.type = nextType;
          if (!snapshot) {
            return;
          }
          meta.chainId = snapshot.chainId;
          meta.networkClientId = snapshot.networkClientId;
          meta.txParams = { ...snapshot.txParams };
          meta.nestedTransactions = snapshot.nestedTransactions?.map(
            (nested) => ({ ...nested }),
          );
          meta.requiredAssets = snapshot.requiredAssets?.map((asset) => ({
            ...asset,
          }));
          applyHyperliquidUsdcAmount(meta, amount);
        },
      });
    } catch (error: unknown) {
      releaseAppliedKey(appliedKeyRef, requestKey);
      Logger.error(
        error as Error,
        'Failed to update the Perps confirmation for the selected provider',
      );
    }
  }, [currentType, destination, source, transactionId, transactionMeta]);
}

/**
 * Points the confirmation at mainnet USDC.
 *
 * Pay builds `targetChainId` and `targetTokenAddress` from the confirmation
 * chain and required asset. Writing those here is what the quote uses. The
 * first deposit is a plain mainnet USDC quote, so any override is cleared
 * before that refresh. `PaymentOverride.PerpsLighter` is reserved for a later
 * direct Lighter target.
 *
 * @param request - Deposit to write.
 * @param request.amount - USDC amount in base units.
 * @param request.from - Logged-in user credited by the deposit.
 * @param request.nextType - Lighter deposit type to store.
 * @param request.snapshotRef - Hyperliquid confirmation to restore later.
 * @param request.transactionId - Open confirmation.
 * @param request.transactionMeta - Confirmation before the write.
 */
function writeLighterUsdcDeposit({
  amount,
  from,
  nextType,
  snapshotRef,
  transactionId,
  transactionMeta,
}: {
  amount: bigint;
  from: Hex;
  nextType: TransactionType;
  snapshotRef: { current: ConfirmationSnapshot | undefined };
  transactionId: string;
  transactionMeta: TransactionMeta;
}): void {
  const mainnetNetworkClientId =
    Engine.context.NetworkController.findNetworkClientIdByChainId(
      CHAIN_IDS.MAINNET,
    );
  if (!mainnetNetworkClientId) {
    throw new Error(
      'No Ethereum mainnet network client for the Lighter USDC deposit',
    );
  }

  if (!snapshotRef.current) {
    snapshotRef.current = {
      chainId: transactionMeta.chainId,
      networkClientId: transactionMeta.networkClientId,
      nestedTransactions: transactionMeta.nestedTransactions?.map((nested) => ({
        ...nested,
      })),
      requiredAssets: transactionMeta.requiredAssets?.map((asset) => ({
        ...asset,
      })),
      txParams: { ...transactionMeta.txParams },
    };
  }

  setPaymentOverride(transactionId, undefined);
  Engine.context.TransactionController.updateTransactionMetadata({
    transactionId,
    skipResimulate: true,
    callback: (meta) => {
      applyLighterUsdcDeposit(
        meta,
        from,
        amount,
        mainnetNetworkClientId,
        nextType,
      );
    },
  });
}

function setPaymentOverride(
  transactionId: string,
  paymentOverride: PaymentOverride | undefined,
): void {
  Engine.context.TransactionPayController.setTransactionConfig(
    transactionId,
    (config: TransactionConfig) => {
      config.paymentOverride = paymentOverride;
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
function readEnteredUsdcAmount(transactionId: string): bigint {
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

/**
 * Re-encodes the restored Hyperliquid transfer with the amount committed while
 * Lighter was selected, since the snapshot holds the amount from when Lighter
 * was first chosen.
 *
 * @param meta - Restored Hyperliquid confirmation.
 * @param amount - USDC amount in base units.
 */
function applyHyperliquidUsdcAmount(
  meta: TransactionMeta,
  amount: bigint,
): void {
  const transfer = getTokenTransferData(meta);
  const recipient = parseStandardTokenTransactionData(transfer?.data)?.args
    ?._to;

  if (transfer && recipient) {
    const data = generateTransferData('transfer', {
      toAddress: recipient,
      amount: amount.toString(16),
    }) as Hex;

    if (transfer.index === undefined) {
      meta.txParams.data = data;
      if (meta.nestedTransactions?.length === 1) {
        meta.nestedTransactions = [{ ...meta.nestedTransactions[0], data }];
      }
    } else {
      const batch = updateEIP7702BatchData({
        from: meta.txParams.from as Hex,
        transactions: meta.nestedTransactions ?? [],
        updates: [{ transactionIndex: transfer.index, transactionData: data }],
      });
      meta.nestedTransactions = batch.nestedTransactions;
      meta.txParams.data = batch.transactionData;
    }
  }

  if (meta.requiredAssets?.length) {
    meta.requiredAssets = [
      { ...meta.requiredAssets[0], amount: toHex(amount) },
      ...meta.requiredAssets.slice(1),
    ];
  }

  meta.txParams.gas = undefined;
  meta.gasLimitNoBuffer = undefined;
  meta.gasUsed = undefined;
  meta.simulationData = undefined;
  meta.simulationFails = undefined;
}

/**
 * Points the confirmation at a mainnet USDC approve plus Lighter deposit.
 *
 * @param meta - Confirmation to update.
 * @param from - Logged-in user credited by the deposit.
 * @param amount - USDC amount in base units.
 * @param networkClientId - Ethereum mainnet client.
 * @param nextType - Lighter deposit type to store.
 */
function applyLighterUsdcDeposit(
  meta: TransactionMeta,
  from: Hex,
  amount: bigint,
  networkClientId: string,
  nextType: TransactionType,
): void {
  const built = buildLighterUsdcDepositTransaction(from, amount);
  const batch = generateEIP7702BatchTransaction(from, [
    built.approve,
    built.deposit,
  ]);

  meta.type = nextType;
  meta.chainId = CHAIN_IDS.MAINNET;
  meta.networkClientId = networkClientId;
  meta.txParams = {
    ...meta.txParams,
    data: batch.data,
    to: batch.to,
    value: '0x0',
    gas: undefined,
  };
  meta.nestedTransactions = [built.approve, built.deposit];
  meta.requiredAssets = [built.requiredAsset];
  meta.gasLimitNoBuffer = undefined;
  meta.gasUsed = undefined;
  meta.simulationData = undefined;
  meta.simulationFails = undefined;
}
