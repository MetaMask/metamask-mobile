import { merge } from 'lodash';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { TRANSACTION_EVENTS } from '../../../Analytics/events/confirmations';

import { MetaMetrics } from '../../../Analytics';
import { generateDefaultTransactionMetrics, generateEvent } from './utils';
import type { TransactionMetricRequest } from './types';

export const handleTransactionAdded = (
  transactionMeta: TransactionMeta,
  transactionMetricRequest: TransactionMetricRequest,
) => {
  const defaultTransactionMetricProperties = generateDefaultTransactionMetrics(
    TRANSACTION_EVENTS.TRANSACTION_ADDED,
    transactionMeta,
    transactionMetricRequest,
  );

  const mergedEventProperties = merge({}, defaultTransactionMetricProperties);

  const event = generateEvent(mergedEventProperties);

  MetaMetrics.getInstance().trackEvent(event);
};

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
  // Intentionally using TRANSACTION_FINALIZED for confirmed transactions
  // as unified type for all finalized transactions
  const defaultTransactionMetricProperties = generateDefaultTransactionMetrics(
    TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
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
  // Intentionally using TRANSACTION_FINALIZED for dropped transactions
  // as unified type for all finalized transactions
  const defaultTransactionMetricProperties = generateDefaultTransactionMetrics(
    TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
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
  // Intentionally using TRANSACTION_FINALIZED for failed transactions
  // as unified type for all finalized transactions
  const defaultTransactionMetricProperties = generateDefaultTransactionMetrics(
    TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
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
