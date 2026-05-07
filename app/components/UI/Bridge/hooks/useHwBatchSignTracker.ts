import { useEffect, useRef } from 'react';
import {
  type TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useDispatch } from 'react-redux';
import Engine from '../../../../core/Engine';
import { updateHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import { HardwareWalletsSwapsStepKind } from '../Views/HardwareWalletsSwaps/HardwareWalletsSwaps.state';

const APPROVAL_TYPES: Set<TransactionType> = new Set([
  TransactionType.bridgeApproval,
  TransactionType.swapApproval,
]);

const TRADE_TYPES: Set<TransactionType> = new Set([
  TransactionType.bridge,
  TransactionType.swap,
]);

const ALL_BATCH_TYPES: Set<TransactionType> = new Set([
  ...APPROVAL_TYPES,
  ...TRADE_TYPES,
]);

function matchesTx(
  transactionMeta: TransactionMeta,
  targetFrom: string,
): boolean {
  const normalizedFrom = transactionMeta.txParams.from?.toLowerCase();
  if (normalizedFrom !== targetFrom) return false;
  return ALL_BATCH_TYPES.has(transactionMeta.type as TransactionType);
}

function getStepKind(txType: TransactionType): HardwareWalletsSwapsStepKind {
  return APPROVAL_TYPES.has(txType)
    ? HardwareWalletsSwapsStepKind.Approval
    : HardwareWalletsSwapsStepKind.Transaction;
}

interface UseHwBatchSignTrackerOptions {
  fromAddress: string | undefined;
  isEnabled: boolean;
}

export function useHwBatchSignTracker({
  fromAddress,
  isEnabled,
}: UseHwBatchSignTrackerOptions) {
  const dispatch = useDispatch();
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    if (!fromAddress || !isEnabled) {
      return undefined;
    }

    const targetFrom = fromAddress.toLowerCase();
    const handledTxIds = new Set<string>();

    const handleStatusUpdated = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (!matchesTx(transactionMeta, targetFrom)) return;

      const { status, type } = transactionMeta;
      const stepKind = getStepKind(type as TransactionType);

      if (status === TransactionStatus.approved) {
        dispatchRef.current(
          updateHardwareWalletsSwaps({
            type: 'SIGNING',
            payload: { stepKind },
          }),
        );
      } else if (status === TransactionStatus.signed) {
        dispatchRef.current(
          updateHardwareWalletsSwaps({
            type: 'SIGNED',
            payload: { stepKind },
          }),
        );
        handledTxIds.add(transactionMeta.id);
      }
    };

    const handleRejected = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (!matchesTx(transactionMeta, targetFrom)) return;
      if (handledTxIds.has(transactionMeta.id)) return;

      const stepKind = getStepKind(transactionMeta.type as TransactionType);
      dispatchRef.current(
        updateHardwareWalletsSwaps({
          type: 'REJECTED',
          payload: { stepKind },
        }),
      );
      handledTxIds.add(transactionMeta.id);
    };

    const handleFailed = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      if (!matchesTx(transactionMeta, targetFrom)) return;
      if (handledTxIds.has(transactionMeta.id)) return;

      dispatchRef.current(
        updateHardwareWalletsSwaps({ type: 'TRANSACTION_FAILED' }),
      );
      handledTxIds.add(transactionMeta.id);
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handleStatusUpdated,
    );
    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionRejected',
      handleRejected,
    );
    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionFailed',
      handleFailed,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handleStatusUpdated,
      );
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionRejected',
        handleRejected,
      );
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionFailed',
        handleFailed,
      );
    };
  }, [fromAddress, isEnabled]);
}
