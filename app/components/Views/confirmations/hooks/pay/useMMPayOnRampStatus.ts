import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import { FIAT_ORDER_STATES } from '../../../../../constants/on-ramp';
import type { RootState } from '../../../../../reducers';
import type { FiatOrder } from '../../../../../reducers/fiatOrders/types';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  bindMMPayOnRampOrder,
  clearMMPayOnRampSession,
  MMPayOnRampSession,
  useMMPayOnRampSession,
} from './useMMPayOnRampLifecycle';

export enum MMPayOnRampStatus {
  Idle = 'idle',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
}

export interface UseMMPayOnRampStatusResult {
  status: MMPayOnRampStatus;
  inProgress: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  session: MMPayOnRampSession | null;
  order: FiatOrder | null;
  clearSession: () => void;
}

export function useMMPayOnRampStatus(): UseMMPayOnRampStatusResult {
  const isFocused = useIsFocused();
  const wasFocusedRef = useRef(isFocused);
  const lastFallbackBindKeyRef = useRef<string | null>(null);
  const transactionMeta = useTransactionMetadataRequest();
  const mmPayTransactionId = transactionMeta?.id;
  const session = useMMPayOnRampSession(mmPayTransactionId);
  const orders = useSelector((state: RootState) => state.fiatOrders.orders);

  const order = useMemo(() => {
    if (!session) {
      return null;
    }

    return findLatestOrderByMMPayTransactionId(
      orders,
      session.mmPayTransactionId,
    );
  }, [orders, session]);

  // Fallback-bind an order id into the session when callback binding was missed but a matching order is now available.
  useEffect(() => {
    if (!session || session.orderId || !order) {
      return;
    }

    const fallbackBindKey = `${session.mmPayTransactionId}:${session.startedAt}:${order.id}`;
    if (lastFallbackBindKeyRef.current === fallbackBindKey) {
      return;
    }

    lastFallbackBindKeyRef.current = fallbackBindKey;
    bindMMPayOnRampOrder(session.mmPayTransactionId, order.id);
  }, [order, session]);

  // Clear abandoned sessions when returning to confirmation if no order was ever created for the active MM-pay on-ramp attempt.
  useEffect(() => {
    const didRegainFocus = !wasFocusedRef.current && isFocused;
    wasFocusedRef.current = isFocused;

    if (!didRegainFocus || !session || session.orderId || order) {
      return;
    }

    clearMMPayOnRampSession(session.mmPayTransactionId);
  }, [order, isFocused, session]);

  const status = useMemo<MMPayOnRampStatus>(() => {
    if (!session) {
      return MMPayOnRampStatus.Idle;
    }

    if (!order) {
      return session.orderId
        ? MMPayOnRampStatus.InProgress
        : MMPayOnRampStatus.Idle;
    }

    switch (order.state) {
      case FIAT_ORDER_STATES.COMPLETED:
        return MMPayOnRampStatus.Completed;
      case FIAT_ORDER_STATES.FAILED:
      case FIAT_ORDER_STATES.CANCELLED:
        return MMPayOnRampStatus.Failed;
      case FIAT_ORDER_STATES.CREATED:
      case FIAT_ORDER_STATES.PENDING:
      default:
        return MMPayOnRampStatus.InProgress;
    }
  }, [order, session]);

  const clearSession = useCallback(() => {
    if (!session) {
      return;
    }

    clearMMPayOnRampSession(session.mmPayTransactionId);
  }, [session]);

  return {
    status,
    inProgress: status === MMPayOnRampStatus.InProgress,
    isCompleted: status === MMPayOnRampStatus.Completed,
    isFailed: status === MMPayOnRampStatus.Failed,
    session,
    order,
    clearSession,
  };
}

function findLatestOrderByMMPayTransactionId(
  orders: FiatOrder[],
  mmPayTransactionId: string,
) {
  const matches = orders.filter((order) => {
    if (order.mmPayTransactionId !== mmPayTransactionId) {
      return false;
    }

    return true;
  });

  return matches[0] ?? null;
}
