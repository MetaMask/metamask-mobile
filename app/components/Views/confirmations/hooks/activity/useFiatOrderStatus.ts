import { useEffect, useRef, useState } from 'react';
import { TransactionStatus } from '@metamask/transaction-controller';
import { RampsOrderStatus } from '@metamask/ramps-controller';

import Engine from '../../../../../core/Engine';
import type { Severity } from '../../components/status-icon';

const POLL_INTERVAL_MS = 5000;

const TERMINAL_STATUSES = new Set([
  RampsOrderStatus.Completed,
  RampsOrderStatus.Failed,
  RampsOrderStatus.Cancelled,
  RampsOrderStatus.IdExpired,
]);

export interface FiatOrderStatusResult {
  severity: Severity;
  statusText: string;
  cryptoSymbol: string | undefined;
  paymentMethodName: string | undefined;
}

export function useFiatOrderStatus(
  fiatOrderId: string | undefined,
  fiatProvider: string | undefined,
  walletAddress: string | undefined,
  parentTransactionStatus: TransactionStatus,
): FiatOrderStatusResult {
  const [orderStatus, setOrderStatus] = useState<
    RampsOrderStatus | undefined
  >();
  const [cryptoSymbol, setCryptoSymbol] = useState<string | undefined>();
  const [paymentMethodName, setPaymentMethodName] = useState<
    string | undefined
  >();
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (!fiatOrderId || !fiatProvider || !walletAddress) {
      return undefined;
    }

    const poll = () => {
      Engine.context.RampsController.getOrder(
        fiatProvider,
        fiatOrderId,
        walletAddress,
      )
        .then((order) => {
          setOrderStatus(order.status);
          setCryptoSymbol(order.cryptoCurrency?.symbol);
          setPaymentMethodName(order.paymentMethod?.name);

          if (TERMINAL_STATUSES.has(order.status)) {
            clearInterval(intervalRef.current);
          }
        })
        .catch(() => undefined);
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [fiatOrderId, fiatProvider, walletAddress]);

  const resolvedStatus =
    orderStatus ?? deriveFromTransactionStatus(parentTransactionStatus);

  return {
    severity: getSeverityFromOrderStatus(resolvedStatus),
    statusText: getStatusText(resolvedStatus),
    cryptoSymbol,
    paymentMethodName,
  };
}

function deriveFromTransactionStatus(
  txStatus: TransactionStatus,
): RampsOrderStatus {
  switch (txStatus) {
    case TransactionStatus.confirmed:
      return RampsOrderStatus.Completed;
    case TransactionStatus.failed:
    case TransactionStatus.dropped:
      return RampsOrderStatus.Failed;
    default:
      return RampsOrderStatus.Pending;
  }
}

function getSeverityFromOrderStatus(
  status: RampsOrderStatus | undefined,
): Severity {
  switch (status) {
    case RampsOrderStatus.Completed:
      return 'success';
    case RampsOrderStatus.Failed:
    case RampsOrderStatus.Cancelled:
    case RampsOrderStatus.IdExpired:
      return 'error';
    default:
      return 'warning';
  }
}

function getStatusText(status: RampsOrderStatus | undefined): string {
  switch (status) {
    case RampsOrderStatus.Completed:
      return 'Completed';
    case RampsOrderStatus.Failed:
      return 'Failed';
    case RampsOrderStatus.Cancelled:
      return 'Cancelled';
    case RampsOrderStatus.IdExpired:
      return 'Expired';
    default:
      return 'Pending';
  }
}
