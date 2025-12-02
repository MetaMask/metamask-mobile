import type { TransactionMeta } from '@metamask/transaction-controller';
import { merge } from 'lodash';

import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { AnalyticsEventBuilder } from '../../../../Analytics/AnalyticsEventBuilder';
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
jest.mock('../../../../Analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: jest.fn(),
  },
}));

jest.mock('../event_properties/metamask-pay', () => ({
  getMetaMaskPayProperties: jest.fn().mockReturnValue({
    properties: {
      builder_test: true,
    },
    sensitiveProperties: {
      builder_sensitive_test: true,
    },
  }),
}));

describe('Transaction Metric Event Handlers', () => {
  const mockGetSmartTransactionMetricsProperties = jest.mocked(
    getSmartTransactionMetricsProperties,
  );
  const mockGetState = jest.fn();
  const mockInitMessenger = {
    call: jest.fn().mockResolvedValue(undefined),
  };
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
    is_smart_transaction: true,
  };

  const mockTransactionMetricRequest = {
    getState: mockGetState,
    initMessenger: mockInitMessenger,
    smartTransactionsController: mockSmartTransactionsController,
  } as unknown as TransactionEventHandlerRequest;

  const mockEventBuilder = {
    addProperties: jest.fn().mockReturnThis(),
    addSensitiveProperties: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      name: 'test-event',
      properties: { test: 'value' },
      sensitiveProperties: { sensitive: 'value' },
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
      mockEventBuilder,
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
    async ({ handler, event: _event }) => {
      await handler(mockTransactionMeta, mockTransactionMetricRequest);

      // For handleTransactionFinalizedEventForMetrics, generateEvent is called
      // which uses AnalyticsEventBuilder.createEventBuilder
      if (handler === handleTransactionFinalizedEventForMetrics) {
        expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalled();
      } else {
        // For other handlers, the event builder is called in generateDefaultTransactionMetrics
        expect(mockEventBuilder.build).toHaveBeenCalled();
      }
      expect(mockInitMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        expect.objectContaining({
          name: expect.any(String),
          properties: expect.any(Object),
          sensitiveProperties: expect.any(Object),
        }),
      );
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

  it('includes builder metrics', async () => {
    await handleTransactionSubmittedEventForMetrics(
      mockTransactionMeta,
      mockTransactionMetricRequest,
    );

    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        builder_test: true,
      }),
    );

    expect(mockEventBuilder.addSensitiveProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        builder_sensitive_test: true,
      }),
    );
  });

  describe('handleTransactionFinalized', () => {
    it('adds STX metrics properties if smart transactions are enabled', async () => {
      // Force the selector to return true
      mockSelectShouldUseSmartTransaction.mockReturnValue(true);

      // Force the mock to return the expected properties
      mockGetSmartTransactionMetricsProperties.mockResolvedValue({
        smart_transaction_timed_out: false,
        smart_transaction_proxied: false,
        is_smart_transaction: true,
      });

      await handleTransactionFinalizedEventForMetrics(
        mockTransactionMeta,
        mockTransactionMetricRequest,
      );

      // Check if the mock was called
      expect(mockGetSmartTransactionMetricsProperties).toHaveBeenCalled();

      // Check if AnalyticsEventBuilder was called (via generateEvent)
      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalled();

      // Check if initMessenger was called
      expect(mockInitMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        expect.any(Object),
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

      // Check if AnalyticsEventBuilder was called (via generateEvent)
      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalled();

      // Check that STX properties were not added
      expect(mockGetSmartTransactionMetricsProperties).not.toHaveBeenCalled();
    });

    it('includes builder metrics', async () => {
      await handleTransactionFinalizedEventForMetrics(
        mockTransactionMeta,
        mockTransactionMetricRequest,
      );

      // Check if AnalyticsEventBuilder was called (via generateEvent)
      expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalled();

      // Check if initMessenger was called with the event
      expect(mockInitMessenger.call).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        expect.objectContaining({
          name: expect.any(String),
          properties: expect.any(Object),
          sensitiveProperties: expect.any(Object),
        }),
      );
    });
  });
});
