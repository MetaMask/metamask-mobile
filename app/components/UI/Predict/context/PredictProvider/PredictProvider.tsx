import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { PredictTransactionToastHandler } from './PredictTransactionToastHandler';
import Engine from '../../../../../core/Engine';
import {
  PredictContextValue,
  PredictProviderProps,
  PredictTransactionEvent,
  PredictTransactionEventCallback,
  PredictTransactionType,
  PREDICT_TRANSACTION_TYPE_MAP,
  PREDICT_TRANSACTION_TYPES,
} from './PredictProvider.types';

export const PredictContext = React.createContext<PredictContextValue | null>(
  null,
);

const createSubscriptionManager = () => {
  const subscribers = new Set<PredictTransactionEventCallback>();

  const subscribe = (callback: PredictTransactionEventCallback) => {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  };

  const notify = (event: PredictTransactionEvent) => {
    subscribers.forEach((callback) => callback(event));
  };

  return { subscribe, notify };
};

const isPredictTransactionType = (
  type: TransactionType | undefined,
): type is TransactionType =>
  type !== undefined &&
  (PREDICT_TRANSACTION_TYPES as readonly TransactionType[]).includes(
    type as TransactionType,
  );

const findPredictTransactionType = (
  transactionMeta: TransactionMeta,
): TransactionType | undefined =>
  transactionMeta?.nestedTransactions?.find((tx) =>
    isPredictTransactionType(tx.type),
  )?.type;

const mapToPredictType = (
  txType: TransactionType | undefined,
): PredictTransactionType | undefined => {
  if (!txType) return undefined;
  return PREDICT_TRANSACTION_TYPE_MAP[txType];
};

export const PredictProvider: React.FC<PredictProviderProps> = ({
  children,
}) => {
  const depositManagerRef = useRef(createSubscriptionManager());
  const claimManagerRef = useRef(createSubscriptionManager());
  const withdrawManagerRef = useRef(createSubscriptionManager());

  useEffect(() => {
    const handleTransactionStatusUpdate = ({
      transactionMeta,
    }: {
      transactionMeta: TransactionMeta;
    }) => {
      const predictTxType = findPredictTransactionType(transactionMeta);
      if (!predictTxType) return;

      const predictType = mapToPredictType(predictTxType);
      if (!predictType) return;

      const event: PredictTransactionEvent = {
        transactionMeta,
        type: predictType,
        status: transactionMeta.status,
        timestamp: Date.now(),
      };

      switch (predictType) {
        case 'deposit':
          depositManagerRef.current.notify(event);
          break;
        case 'claim':
          claimManagerRef.current.notify(event);
          break;
        case 'withdraw':
          withdrawManagerRef.current.notify(event);
          break;
      }
    };

    Engine.controllerMessenger.subscribe(
      'TransactionController:transactionStatusUpdated',
      handleTransactionStatusUpdate,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'TransactionController:transactionStatusUpdated',
        handleTransactionStatusUpdate,
      );
    };
  }, []);

  const subscribeToDepositEvents = useCallback(
    (callback: PredictTransactionEventCallback) =>
      depositManagerRef.current.subscribe(callback),
    [],
  );

  const subscribeToClaimEvents = useCallback(
    (callback: PredictTransactionEventCallback) =>
      claimManagerRef.current.subscribe(callback),
    [],
  );

  const subscribeToWithdrawEvents = useCallback(
    (callback: PredictTransactionEventCallback) =>
      withdrawManagerRef.current.subscribe(callback),
    [],
  );

  const contextValue = useMemo<PredictContextValue>(
    () => ({
      subscribeToDepositEvents,
      subscribeToClaimEvents,
      subscribeToWithdrawEvents,
    }),
    [
      subscribeToDepositEvents,
      subscribeToClaimEvents,
      subscribeToWithdrawEvents,
    ],
  );

  return (
    <PredictContext.Provider value={contextValue}>
      <PredictTransactionToastHandler />
      {children}
    </PredictContext.Provider>
  );
};
