import type { TransactionMeta } from '@metamask/transaction-controller';
import { merge } from 'lodash';

import { MetaMetrics } from '../../../../Analytics';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { MetricsEventBuilder } from '../../../../Analytics/MetricsEventBuilder';
import { getSmartTransactionMetricsProperties } from '../../../../../util/smart-transactions';
import {
  handleTransactionAddedEventForMetrics,
  handleTransactionApprovedEventForMetrics,
  handleTransactionFinalizedEventForMetrics,
  handleTransactionRejectedEventForMetrics,
  handleTransactionSubmittedEventForMetrics,
} from './metrics';
import { TransactionEventHandlerRequest } from '../types';
import {
  disabledSmartTransactionsState,
  enabledSmartTransactionsState,
} from '../data-helpers';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';

jest.mock('../../../../../util/smart-transactions', () => {
  const actual = jest.requireActual('../../../../../util/smart-transactions');
  return {
    ...actual,
    getSmartTransactionMetricsProperties: jest.fn(),
  };
});

jest.mock('../../../../../selectors/smartTransactionsController', () => ({
  selectShouldUseSmartTransaction: jest.fn().mockReturnValue(true),
}));

// Mock dependencies
jest.mock('../../../../Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../../../Analytics/MetricsEventBuilder', () => ({
  MetricsEventBuilder: {
    createEventBuilder: jest.fn(),
  },
}));

jest.mock('../../../Engine', () => ({
  context: {},
}));

describe('Transaction Metric Event Handlers', () => {
  const mockGetSmartTransactionMetricsProperties = jest.mocked(
    getSmartTransactionMetricsProperties,
  );
  const mockGetState = jest.fn();
  const mockInitMessenger = jest.fn();
  const mockSmartTransactionsController = jest.fn();
  const mockSelectShouldUseSmartTransaction = jest.mocked(
    selectShouldUseSmartTransaction,
  );

  const mockTransactionMeta = {
    id: 'test-id',
    chainId: '0x1',
    type: 'standard',
    networkClientId: 'test-network',
    time: 1234567890,
    txParams: {},
  } as unknown as TransactionMeta;

  const mockSmartTransactionMetricsProperties = {
    smart_transaction_timed_out: false,
    smart_transaction_proxied: false,
  };

  const mockTransactionMetricRequest = {
    getState: mockGetState,
    initMessenger: mockInitMessenger,
    smartTransactionsController: mockSmartTransactionsController,
  } as unknown as TransactionEventHandlerRequest;

  const mockEventBuilder = {
    addProperties: jest.fn().mockReturnThis(),
    addSensitiveProperties: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue('built-event'),
  };
  const mockTrackEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (MetricsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
      mockEventBuilder,
    );

    const mockMetaMetricsInstance = {
      trackEvent: mockTrackEvent,
    };

    (MetaMetrics.getInstance as jest.Mock).mockReturnValue(
      mockMetaMetricsInstance,
    );

    mockGetSmartTransactionMetricsProperties.mockResolvedValue(
      mockSmartTransactionMetricsProperties,
    );

    mockGetState.mockReturnValue(
      merge({}, enabledSmartTransactionsState, {
        confirmationMetrics: {
          metricsById: {
            [mockTransactionMeta.id]: {
              properties: { test_property: 'test_value' },
              sensitiveProperties: { sensitive_property: 'sensitive_value' },
            },
          },
        },
      }),
    );
  });

  const handlerTestCases = [
    {
      handlerName: 'handleTransactionAddedEventForMetrics',
      handler: handleTransactionAddedEventForMetrics,
      event: TRANSACTION_EVENTS.TRANSACTION_ADDED,
    },
    {
      handlerName: 'handleTransactionApprovedEventForMetrics',
      handler: handleTransactionApprovedEventForMetrics,
      event: TRANSACTION_EVENTS.TRANSACTION_APPROVED,
    },
    {
      handlerName: 'handleTransactionFinalizedEventForMetrics',
      handler: handleTransactionFinalizedEventForMetrics,
      event: TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
    },
    {
      handlerName: 'handleTransactionRejectedEventForMetrics',
      handler: handleTransactionRejectedEventForMetrics,
      event: TRANSACTION_EVENTS.TRANSACTION_REJECTED,
    },
    {
      handlerName: 'handleTransactionSubmittedEventForMetrics',
      handler: handleTransactionSubmittedEventForMetrics,
      event: TRANSACTION_EVENTS.TRANSACTION_SUBMITTED,
    },
  ];

  it.each(handlerTestCases)(
    '$handlerName should generate and track event with correct properties',
    async ({ handler, event }) => {
      await handler(mockTransactionMeta, mockTransactionMetricRequest);

      expect(MetricsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        event,
      );

      expect(mockEventBuilder.build).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    },
  );

  it('handles missing transaction metrics properties', async () => {
    mockGetState.mockReturnValueOnce({
      confirmationMetrics: {
        metricsById: {},
      },
    });

    await handleTransactionApprovedEventForMetrics(
      mockTransactionMeta,
      mockTransactionMetricRequest,
    );

    expect(mockEventBuilder.addProperties).toHaveBeenCalled();
    expect(mockEventBuilder.addSensitiveProperties).toHaveBeenCalled();
  });

  it('handles undefined transaction metrics', () => {
    mockGetState.mockReturnValueOnce({
      confirmationMetrics: {
        metricsById: {},
      },
    });

    expect(() => {
      handleTransactionApprovedEventForMetrics(
        mockTransactionMeta,
        mockTransactionMetricRequest,
      );
    }).not.toThrow();
  });

  describe('handleTransactionFinalized', () => {
    it('adds STX metrics properties if smart transactions are enabled', async () => {
      // Force the selector to return true
      mockSelectShouldUseSmartTransaction.mockReturnValue(true);

      // Force the mock to return the expected properties
      mockGetSmartTransactionMetricsProperties.mockResolvedValue({
        smart_transaction_timed_out: false,
        smart_transaction_proxied: false,
      });

      await handleTransactionFinalizedEventForMetrics(
        mockTransactionMeta,
        mockTransactionMetricRequest,
      );

      // Check if the mock was called
      expect(mockGetSmartTransactionMetricsProperties).toHaveBeenCalled();

      // Check if addProperties was called with the STX properties
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          smart_transaction_timed_out: false,
          smart_transaction_proxied: false,
        }),
      );
    });

    it('does not add STX metrics properties if smart transactions are not enabled', async () => {
      // Force the selector to return false for this test
      mockSelectShouldUseSmartTransaction.mockReturnValue(false);

      mockGetState.mockReturnValue(
        merge({}, disabledSmartTransactionsState, {
          confirmationMetrics: {
            metricsById: {
              [mockTransactionMeta.id]: {
                properties: { test_property: 'test_value' },
                sensitiveProperties: { sensitive_property: 'sensitive_value' },
              },
            },
          },
        }),
      );

      await handleTransactionFinalizedEventForMetrics(
        mockTransactionMeta,
        mockTransactionMetricRequest,
      );

      expect(mockEventBuilder.addProperties).toHaveBeenCalled();
      expect(mockEventBuilder.addProperties).not.toHaveBeenCalledWith(
        expect.objectContaining(mockSmartTransactionMetricsProperties),
      );
    });
  });
});
