import { TransactionMeta } from '@metamask/transaction-controller';

import { ResultType } from '../../../../../components/Views/confirmations/constants/signatures';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { TransactionMetricsBuilderRequest } from '../types';
import { EMPTY_METRICS } from '../constants';
import { getSecurityAlertResponseProperties } from './security-alert-response';

const createMockRequest = (
  securityAlertResponse?: Record<string, unknown>,
  overrides: Partial<TransactionMetricsBuilderRequest> = {},
): TransactionMetricsBuilderRequest => ({
  eventType: TRANSACTION_EVENTS.TRANSACTION_ADDED,
  transactionMeta: { securityAlertResponse } as unknown as TransactionMeta,
  allTransactions: [],
  getUIMetrics: () => EMPTY_METRICS,
  getState: jest.fn() as TransactionMetricsBuilderRequest['getState'],
  initMessenger: {} as never,
  smartTransactionsController: {} as never,
  ...overrides,
});

describe('getSecurityAlertResponseProperties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty properties when securityAlertResponse is undefined', () => {
    const request = createMockRequest(undefined);

    const result = getSecurityAlertResponseProperties(request);

    expect(result).toEqual({
      properties: {},
      sensitiveProperties: {},
    });
  });

  it('returns security_alert_reason and security_alert_response', () => {
    const request = createMockRequest({
      result_type: ResultType.Benign,
      reason: 'raw_native_token_transfer',
    });

    const result = getSecurityAlertResponseProperties(request);

    expect(result).toEqual({
      properties: {
        security_alert_response: ResultType.Benign,
        security_alert_reason: 'raw_native_token_transfer',
      },
      sensitiveProperties: {},
    });
  });

  it('sets ui_customizations to flagged_as_malicious when result_type is Malicious', () => {
    const request = createMockRequest({
      result_type: ResultType.Malicious,
      reason: 'malicious_domain',
    });

    const result = getSecurityAlertResponseProperties(request);

    expect(result).toEqual({
      properties: {
        security_alert_response: ResultType.Malicious,
        security_alert_reason: 'malicious_domain',
        ui_customizations: ['flagged_as_malicious'],
      },
      sensitiveProperties: {},
    });
  });

  it('sets ui_customizations to security_alert_loading and overrides security_alert_response when result_type is RequestInProgress', () => {
    const request = createMockRequest({
      result_type: ResultType.RequestInProgress,
      reason: 'other',
    });

    const result = getSecurityAlertResponseProperties(request);

    expect(result).toEqual({
      properties: {
        security_alert_response: 'loading',
        security_alert_reason: 'other',
        ui_customizations: ['security_alert_loading'],
      },
      sensitiveProperties: {},
    });
  });

  it('includes ppom provider request counts', () => {
    const request = createMockRequest({
      result_type: ResultType.Benign,
      reason: 'other',
      providerRequestsCount: {
        eth_call: 5,
        eth_getCode: 3,
      },
    });

    const result = getSecurityAlertResponseProperties(request);

    expect(result).toEqual({
      properties: {
        security_alert_response: ResultType.Benign,
        security_alert_reason: 'other',
        ppom_eth_call_count: 5,
        ppom_eth_getCode_count: 3,
      },
      sensitiveProperties: {},
    });
  });

  it('handles securityAlertResponse with no providerRequestsCount', () => {
    const request = createMockRequest({
      result_type: ResultType.Warning,
      reason: 'approval_farming',
    });

    const result = getSecurityAlertResponseProperties(request);

    expect(result).toEqual({
      properties: {
        security_alert_response: ResultType.Warning,
        security_alert_reason: 'approval_farming',
      },
      sensitiveProperties: {},
    });
  });

  it('handles Malicious result_type with provider request counts', () => {
    const request = createMockRequest({
      result_type: ResultType.Malicious,
      reason: 'permit_farming',
      providerRequestsCount: {
        eth_call: 2,
      },
    });

    const result = getSecurityAlertResponseProperties(request);

    expect(result).toEqual({
      properties: {
        security_alert_response: ResultType.Malicious,
        security_alert_reason: 'permit_farming',
        ui_customizations: ['flagged_as_malicious'],
        ppom_eth_call_count: 2,
      },
      sensitiveProperties: {},
    });
  });
});
