import { useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';

import { updateConfirmationMetric } from '../../../../../core/redux/slices/confirmationMetrics';
import { TraceName, endTrace, trace } from '../../../../../util/trace';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { getTransactionTypeValue } from '../../../../../core/Engine/controllers/transaction-controller/metrics_properties/base';
import { createProjectLogger } from '@metamask/utils';

const log = createProjectLogger('confirmation-load-metrics');

const meansByTransactionType = new Map<
  string,
  {
    sampleCount: number;
    totalDurationMs: number;
    warmSampleCount: number;
    warmTotalDurationMs: number;
  }
>();

/**
 * Records how long a transaction confirmation took to become visible, spanning
 * transaction creation to the confirmation body's first paint.
 *
 * Non-transaction confirmations (for example signature requests) have no
 * creation timestamp to anchor against and are skipped.
 *
 * Running means are logged per transaction type for diagnostics only, and are
 * never dispatched as metric properties.
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

    const stats = meansByTransactionType.get(transactionType) ?? {
      sampleCount: 0,
      totalDurationMs: 0,
      warmSampleCount: 0,
      warmTotalDurationMs: 0,
    };

    // Counted before the increment below, so the first sample of each type is
    // treated as cold and excluded from the warm mean.
    const isWarmSample = stats.sampleCount > 0;

    stats.sampleCount += 1;
    stats.totalDurationMs += durationMs;

    if (isWarmSample) {
      stats.warmSampleCount += 1;
      stats.warmTotalDurationMs += durationMs;
    }

    meansByTransactionType.set(transactionType, stats);

    log('First paint', durationMs, {
      averageMs: Math.round(stats.totalDurationMs / stats.sampleCount),
      sampleCount: stats.sampleCount,
      transactionId,
      transactionType,
      warmAverageMs: stats.warmSampleCount
        ? Math.round(stats.warmTotalDurationMs / stats.warmSampleCount)
        : undefined,
      warmSampleCount: stats.warmSampleCount,
    });
  }, [canMeasure, createdAtMs, dispatch, transactionId, transactionType]);

  return { onFirstPaint };
}
