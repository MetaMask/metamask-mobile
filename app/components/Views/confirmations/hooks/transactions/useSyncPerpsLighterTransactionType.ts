import { useEffect, useRef, type RefObject } from 'react';
import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex, isAddress } from 'viem';

import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import type { PerpsReceiveDestination } from '../../components/rows/perps-receive-to-row';
import type { PerpsWithdrawSource } from '../../components/rows/perps-withdraw-from-row';
import { userHasLighterAccount } from '../../temp-lighter/lighter-usdc-deposit';
import {
  buildHyperliquidRestoreRequest,
  buildLighterDepositRequest,
  buildRetypedRequest,
  readEnteredUsdcAmount,
  replacePerpsTransaction,
  snapshotHyperliquidConfirmation,
  type HyperliquidConfirmationSnapshot,
} from '../../temp-lighter/perps-lighter-transactions';
import { perpsTransactionTypeForSelection } from '../../utils/perps-lighter-transaction-type';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';

const RECREATE_ERROR = 'Failed to recreate the Perps transaction';

function isLighterPerpsDeposit(type: TransactionType | string | undefined) {
  return (
    type === TransactionType.perpsLighterDeposit ||
    type === TransactionType.perpsLighterDepositAndOrder
  );
}

function releaseAppliedKey(
  appliedKeyRef: RefObject<string | undefined>,
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
  lookupKeyRef: RefObject<string | undefined>;
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
 * Replaces the Hyperliquid deposit with a mainnet USDC deposit into Lighter.
 *
 * @param options - Deposit request for the open confirmation.
 * @param options.from - Address credited by the deposit.
 * @param options.nextType - Lighter deposit type to create.
 * @param options.snapshotRef - Where to save the Hyperliquid confirmation.
 * @param options.transactionMeta - Hyperliquid confirmation being replaced.
 */
async function replaceWithLighterDeposit({
  from,
  nextType,
  snapshotRef,
  transactionMeta,
}: {
  from: Hex;
  nextType: TransactionType;
  snapshotRef: RefObject<HyperliquidConfirmationSnapshot | undefined>;
  transactionMeta: TransactionMeta;
}): Promise<void> {
  const mainnetNetworkClientId =
    Engine.context.NetworkController.findNetworkClientIdByChainId(
      CHAIN_IDS.MAINNET,
    );
  if (!mainnetNetworkClientId) {
    throw new Error(
      'No Ethereum mainnet network client for the Lighter USDC deposit',
    );
  }

  const request = buildLighterDepositRequest({
    amount: readEnteredUsdcAmount(transactionMeta.id),
    from,
    mainnetNetworkClientId,
    origin: transactionMeta.origin,
    type: nextType,
  });

  // The open confirmation is the Hyperliquid one, so this is what to restore.
  snapshotRef.current = snapshotHyperliquidConfirmation(transactionMeta);
  await replacePerpsTransaction(request, transactionMeta.id);
}

/**
 * Looks the address up and replaces the deposit when it has no Lighter
 * account yet. This only handles the first deposit. An existing account keeps
 * the Hyperliquid confirmation.
 *
 * @param options - Deposit request for the open confirmation.
 * @param options.appliedKeyRef - Key of the request already started.
 * @param options.generation - Lookup generation that owns this request.
 * @param options.lookupGenerationRef - Latest lookup generation.
 * @param options.nextType - Lighter deposit type to create.
 * @param options.requestKey - Key cleared when this request fails.
 * @param options.snapshotRef - Where to save the Hyperliquid confirmation.
 * @param options.transactionMeta - Confirmation before the replacement.
 */
function depositMainnetUsdcWhenUnregistered({
  appliedKeyRef,
  generation,
  lookupGenerationRef,
  nextType,
  requestKey,
  snapshotRef,
  transactionMeta,
}: {
  appliedKeyRef: RefObject<string | undefined>;
  generation: number;
  lookupGenerationRef: RefObject<number>;
  nextType: TransactionType;
  requestKey: string;
  snapshotRef: RefObject<HyperliquidConfirmationSnapshot | undefined>;
  transactionMeta: TransactionMeta;
}): void {
  const from = transactionMeta.txParams?.from;
  if (!from || !isAddress(from)) {
    appliedKeyRef.current = undefined;
    return;
  }

  const onLookup = async (exists: boolean) => {
    Logger.log('Lighter account lookup', { address: from, exists });
    if (lookupGenerationRef.current !== generation || exists) {
      return undefined;
    }

    return await replaceWithLighterDeposit({
      from,
      nextType,
      snapshotRef,
      transactionMeta,
    }).catch((error: unknown) => {
      releaseAppliedKey(appliedKeyRef, requestKey);
      Logger.error(error as Error, RECREATE_ERROR);
    });
  };

  const onLookupError = (error: unknown) => {
    if (lookupGenerationRef.current !== generation) {
      return;
    }
    releaseAppliedKey(appliedKeyRef, requestKey);
    Logger.error(error as Error, 'Failed to look up the Lighter account');
  };

  userHasLighterAccount(from).then(onLookup, onLookupError);
}

/**
 * Replaces a Lighter deposit with the Hyperliquid deposit it came from, or
 * relabels another Perps confirmation such as a withdraw.
 *
 * @param options - Replacement for the open confirmation.
 * @param options.nextType - Type to create.
 * @param options.snapshot - Hyperliquid confirmation saved before Lighter.
 * @param options.transactionMeta - Confirmation being replaced.
 */
async function replaceWithSelectedType({
  nextType,
  snapshot,
  transactionMeta,
}: {
  nextType: TransactionType;
  snapshot: HyperliquidConfirmationSnapshot | undefined;
  transactionMeta: TransactionMeta;
}): Promise<void> {
  if (!isLighterPerpsDeposit(transactionMeta.type)) {
    await replacePerpsTransaction(
      buildRetypedRequest(transactionMeta, nextType),
      transactionMeta.id,
    );
    return;
  }

  if (!snapshot) {
    throw new Error('No Hyperliquid confirmation to restore');
  }

  await replacePerpsTransaction(
    buildHyperliquidRestoreRequest({
      amount: readEnteredUsdcAmount(transactionMeta.id),
      snapshot,
      type: nextType,
    }),
    transactionMeta.id,
  );
}

/**
 * Replaces the open Perps confirmation when the user changes From or To.
 *
 * The transaction type is not changed on the open confirmation. Each choice
 * creates a new transaction with the matching type, then rejects the previous
 * approval so the screen follows the new one. A Lighter deposit is a mainnet
 * USDC approve plus deposit. Switching back recreates the Hyperliquid deposit
 * with the amount entered since.
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
  const hyperliquidConfirmationRef = useRef<
    HyperliquidConfirmationSnapshot | undefined
  >(undefined);

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
        generation,
        lookupGenerationRef,
        nextType,
        requestKey,
        snapshotRef: hyperliquidConfirmationRef,
        transactionMeta,
      });
      return;
    }

    replaceWithSelectedType({
      nextType,
      snapshot: hyperliquidConfirmationRef.current,
      transactionMeta,
    }).catch((error: unknown) => {
      releaseAppliedKey(appliedKeyRef, requestKey);
      Logger.error(error as Error, RECREATE_ERROR);
    });
  }, [currentType, destination, source, transactionId, transactionMeta]);
}
