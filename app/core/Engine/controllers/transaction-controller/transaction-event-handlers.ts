import { merge } from 'lodash';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { TRANSACTION_EVENTS } from '../../../Analytics/events/confirmations';
import { MetricsEventBuilder } from '../../../Analytics/MetricsEventBuilder';
import { MetaMetrics } from '../../../Analytics';
import {
  JsonMap,
  IMetaMetricsEvent,
} from '../../../Analytics/MetaMetrics.types';

// In order to not import from redux slice, type is defined here
export interface TransactionMetrics {
  properties: JsonMap;
  sensitiveProperties: JsonMap;
}

interface TransactionMetricRequest {
  getTransactionMetricProperties: (id: string) => TransactionMetrics;
}

function generateEvent({
  metametricsEvent,
  properties,
  sensitiveProperties,
}: {
  metametricsEvent: IMetaMetricsEvent;
  properties?: JsonMap;
  sensitiveProperties?: JsonMap;
}) {
  return MetricsEventBuilder.createEventBuilder(metametricsEvent)
    .addProperties(properties ?? {})
    .addSensitiveProperties(sensitiveProperties ?? {})
    .build();
}

function generateDefaultTransactionMetrics(
  metametricsEvent: IMetaMetricsEvent,
  transactionMeta: TransactionMeta,
  { getTransactionMetricProperties }: TransactionMetricRequest,
) {
  const { chainId, id, type } = transactionMeta;

  const mergedDefaultProperties = merge(
    {
      metametricsEvent,
      properties: {
        chain_id: chainId,
        transaction_internal_id: id,
        transaction_type: type,
      },
    },
    getTransactionMetricProperties(id),
  );

  return mergedDefaultProperties;
}

export const handleTransactionApproved = (
  transactionMeta: TransactionMeta,
  transactionMetricRequest: TransactionMetricRequest,
) => {
  const defaultTransactionMetricProperties = generateDefaultTransactionMetrics(
    TRANSACTION_EVENTS.TRANSACTION_APPROVED,
    transactionMeta,
    transactionMetricRequest,
  );

  const mergedEventProperties = merge({}, defaultTransactionMetricProperties);

  const event = generateEvent(mergedEventProperties);

  MetaMetrics.getInstance().trackEvent(event);
};

export const handleTransactionConfirmed = (
  transactionMeta: TransactionMeta,
  transactionMetricRequest: TransactionMetricRequest,
) => {
  const defaultTransactionMetricProperties = generateDefaultTransactionMetrics(
    TRANSACTION_EVENTS.TRANSACTION_CONFIRMED,
    transactionMeta,
    transactionMetricRequest,
  );

  const mergedEventProperties = merge({}, defaultTransactionMetricProperties);

  const event = generateEvent(mergedEventProperties);

  MetaMetrics.getInstance().trackEvent(event);
};

export const handleTransactionDropped = (
  transactionMeta: TransactionMeta,
  transactionMetricRequest: TransactionMetricRequest,
) => {
  const defaultTransactionMetricProperties = generateDefaultTransactionMetrics(
    TRANSACTION_EVENTS.TRANSACTION_DROPPED,
    transactionMeta,
    transactionMetricRequest,
  );

  const mergedEventProperties = merge({}, defaultTransactionMetricProperties);

  const event = generateEvent(mergedEventProperties);

  MetaMetrics.getInstance().trackEvent(event);
};

export const handleTransactionFailed = (
  transactionMeta: TransactionMeta,
  transactionMetricRequest: TransactionMetricRequest,
) => {
  const defaultTransactionMetricProperties = generateDefaultTransactionMetrics(
    TRANSACTION_EVENTS.TRANSACTION_FAILED,
    transactionMeta,
    transactionMetricRequest,
  );

  const mergedEventProperties = merge({}, defaultTransactionMetricProperties);

  const event = generateEvent(mergedEventProperties);

  MetaMetrics.getInstance().trackEvent(event);
};

export const handleTransactionRejected = (
  transactionMeta: TransactionMeta,
  transactionMetricRequest: TransactionMetricRequest,
) => {
  const defaultTransactionMetricProperties = generateDefaultTransactionMetrics(
    TRANSACTION_EVENTS.TRANSACTION_REJECTED,
    transactionMeta,
    transactionMetricRequest,
  );

  const mergedEventProperties = merge({}, defaultTransactionMetricProperties);

  const event = generateEvent(mergedEventProperties);

  MetaMetrics.getInstance().trackEvent(event);
};

export const handleTransactionSubmitted = (
  transactionMeta: TransactionMeta,
  transactionMetricRequest: TransactionMetricRequest,
) => {
  const defaultTransactionMetricProperties = generateDefaultTransactionMetrics(
    TRANSACTION_EVENTS.TRANSACTION_SUBMITTED,
    transactionMeta,
    transactionMetricRequest,
  );

  const mergedEventProperties = merge({}, defaultTransactionMetricProperties);

  const event = generateEvent(mergedEventProperties);

  MetaMetrics.getInstance().trackEvent(event);
};

export const handleUnapprovedTransactionAdded = (
  transactionMeta: TransactionMeta,
  transactionMetricRequest: TransactionMetricRequest,
) => {
  const defaultTransactionMetricProperties = generateDefaultTransactionMetrics(
    TRANSACTION_EVENTS.UNAPPROVED_TRANSACTION_ADDED,
    transactionMeta,
    transactionMetricRequest,
  );

  const mergedEventProperties = merge({}, defaultTransactionMetricProperties);

  const event = generateEvent(mergedEventProperties);

  MetaMetrics.getInstance().trackEvent(event);
};
