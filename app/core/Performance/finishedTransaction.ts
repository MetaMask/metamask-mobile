import {
  captureEvent,
  generateSpanId,
  generateTraceId,
  getClient,
  getDynamicSamplingContextFromClient,
  hasSpansEnabled,
  sampleSpan,
  SEMANTIC_ATTRIBUTE_SENTRY_OP,
  SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN,
  SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE,
  SEMANTIC_ATTRIBUTE_SENTRY_SOURCE,
} from '@sentry/core';
import { getCachedConsent, type TraceValue } from '../../util/trace';

/** A span that has already ended. Times are epoch ms. */
export interface FinishedSpan {
  name: string;
  op: string;
  startTime: number;
  endTime: number;
  tags?: Record<string, string | boolean>;
  data?: Record<string, TraceValue>;
}

export interface FinishedChildSpan extends FinishedSpan {
  /** Index of the parent span in the children. The transaction when unset. */
  parent?: number;
}

/**
 * The most a transaction sent here is sampled at, below the app's rate for
 * other transactions. An app rate of 1 is a build that keeps every
 * transaction, such as a dev build, and is not lowered.
 */
const MAX_SAMPLE_RATE = 0.01;

const getSampleRate = (appSampleRate: number): number =>
  appSampleRate < 1 ? Math.min(appSampleRate, MAX_SAMPLE_RATE) : appSampleRate;

const toSeconds = (ms: number) => ms / 1000;

const getAttributes = ({ op, tags, data }: FinishedSpan) => ({
  [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: 'manual',
  [SEMANTIC_ATTRIBUTE_SENTRY_OP]: op,
  ...tags,
  ...data,
});

/**
 * Sends spans that have already ended as one transaction, sampled the way a
 * transaction started now would be, but at no more than `MAX_SAMPLE_RATE`.
 * Tags and data become span attributes, as with `trace()`, and the tags are
 * also the transaction's tags. Like `trace()`, it sends nothing without
 * metrics consent.
 *
 * Starting live spans instead has side effects on the SDK: a new transaction
 * stops the profile of the one running, it can take the app start data
 * meant for the first transaction of the launch, and `trace()` writes its
 * tags to the scope that every later event reads.
 */
export const sendFinishedTransaction = (
  transaction: FinishedSpan,
  children: readonly FinishedChildSpan[] = [],
) => {
  const client = getClient();
  if (
    getCachedConsent() !== true ||
    !client ||
    !hasSpansEnabled(client.getOptions())
  ) {
    return;
  }
  const attributes = getAttributes(transaction);
  const sampleRand = Math.random(); // NOSONAR - a sampling roll, not security-sensitive
  const [appSampled, appSampleRate = 0, localSampleRateWasApplied] = sampleSpan(
    client.getOptions(),
    { name: transaction.name, attributes },
    sampleRand,
  );
  const sampleRate = getSampleRate(appSampleRate);
  if (!appSampled || sampleRand >= sampleRate) {
    client.recordDroppedEvent('sample_rate', 'transaction');
    return;
  }
  const localSampleRate = localSampleRateWasApplied ? sampleRate : undefined;
  const traceId = generateTraceId();
  const spanId = generateSpanId();
  const childSpanIds = children.map(() => generateSpanId());
  captureEvent({
    type: 'transaction',
    transaction: transaction.name,
    transaction_info: { source: 'custom' },
    start_timestamp: toSeconds(transaction.startTime),
    timestamp: toSeconds(transaction.endTime),
    tags: transaction.tags,
    contexts: {
      trace: {
        trace_id: traceId,
        span_id: spanId,
        op: transaction.op,
        origin: 'manual',
        data: {
          ...attributes,
          [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'custom',
          ...(localSampleRate === undefined
            ? {}
            : { [SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE]: localSampleRate }),
        },
      },
    },
    spans: children.map((child, index) => ({
      trace_id: traceId,
      span_id: childSpanIds[index],
      parent_span_id:
        child.parent === undefined ? spanId : childSpanIds[child.parent],
      description: child.name,
      op: child.op,
      origin: 'manual',
      start_timestamp: toSeconds(child.startTime),
      timestamp: toSeconds(child.endTime),
      data: getAttributes(child),
    })),
    sdkProcessingMetadata: {
      dynamicSamplingContext: {
        ...getDynamicSamplingContextFromClient(traceId, client),
        transaction: transaction.name,
        sampled: 'true',
        sample_rand: String(sampleRand),
        ...(localSampleRate === undefined
          ? {}
          : { sample_rate: String(localSampleRate) }),
      },
    },
  });
};
