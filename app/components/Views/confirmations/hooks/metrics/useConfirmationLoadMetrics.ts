import { useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';

import { updateConfirmationMetric } from '../../../../../core/redux/slices/confirmationMetrics';
import { TraceName, endTrace, trace } from '../../../../../util/trace';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { getTransactionTypeValue } from '../../../../../core/Engine/controllers/transaction-controller/metrics_properties/base';
import { createProjectLogger } from '@metamask/utils';

const log = createProjectLogger('confirmation-load-metrics');

/**
 * Records how long a transaction confirmation took to become visible, spanning
 * transaction creation to the confirmation body's first paint.
 *
 * Reports the duration twice: as the `confirmation_time_to_open_ms` metric
 * property, and as a standalone `Transaction Confirmation Load` Sentry
 * transaction.
 *
 * This is generic to every redesigned confirmation. It lives on the shared
 * `Confirm` component rather than on any feature-specific surface, so sends,
 * swaps, approvals, dapp transactions, stake, earn, predict and MetaMask Pay
 * all report the same span.
 *
 * Non-transaction confirmations (for example signature requests) have no
 * creation timestamp to anchor against and are skipped.
 *
 * @returns An object with an `onFirstPaint` callback, to be passed to the root
 * confirmation container's `onLayout`.
 */
export function useConfirmationLoadMetrics() {
  const dispatch = useDispatch();
  const transactionMeta = useTransactionMetadataRequest();
  const didRecord = useRef(false);

  const transactionId = transactionMeta?.id;
  const createdAtMs = transactionMeta?.time;
  const singleTransactionType = transactionMeta?.type;

  const canMeasure =
    Boolean(transactionId) &&
    typeof createdAtMs === 'number' &&
    createdAtMs > 0;

  const transactionType = useMemo(
    () => getTransactionTypeValue(singleTransactionType, transactionMeta),
    [singleTransactionType, transactionMeta],
  );

  const onFirstPaint = useCallback(() => {
    if (didRecord.current || !canMeasure) {
      return;
    }

    didRecord.current = true;

    const paintedAtMs = Date.now();
    const durationMs = Math.round(paintedAtMs - createdAtMs);

    dispatch(
      updateConfirmationMetric({
        id: transactionId as string,
        params: {
          properties: {
            confirmation_time_to_open_ms: durationMs,
          },
        },
      }),
    );

    // Started with a backdated start time and ended immediately at the paint
    // timestamp, so no trace is left pending for confirmations that are
    // dismissed before they ever paint.
    trace({
      name: TraceName.TransactionConfirmationLoad,
      id: transactionId as string,
      startTime: createdAtMs,
      forceTransaction: true,
      tags: { transaction_type: transactionType },
    });

    endTrace({
      name: TraceName.TransactionConfirmationLoad,
      id: transactionId as string,
      timestamp: paintedAtMs,
    });

    log('First paint', durationMs, {
      transactionId,
      transactionType,
    });
  }, [canMeasure, createdAtMs, dispatch, transactionId, transactionType]);

  return { onFirstPaint };
}
