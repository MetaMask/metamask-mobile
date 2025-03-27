import type { TransactionMeta } from '@metamask/transaction-controller';
import { MetaMetrics } from '../../../Analytics';
import { TRANSACTION_EVENTS } from '../../../Analytics/events/confirmations';
import { MetricsEventBuilder } from '../../../Analytics/MetricsEventBuilder';
import {
  handleTransactionAdded,
  handleTransactionApproved,
  handleTransactionConfirmed,
  handleTransactionDropped,
  handleTransactionFailed,
  handleTransactionRejected,
  handleTransactionSubmitted,
} from './transaction-event-handlers';

// Mock dependencies
jest.mock('../../../Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn(),
  },
}));

jest.mock('../../../Analytics/MetricsEventBuilder', () => ({
  MetricsEventBuilder: {
    createEventBuilder: jest.fn(),
  },
}));

describe('Transaction Event Handlers', () => {
  const mockTransactionMeta = {
    id: 'test-id',
    chainId: '0x1',
    type: 'standard',
    networkClientId: 'test-network',
    time: 1234567890,
    txParams: {},
  } as unknown as TransactionMeta;

  const mockTransactionMetrics = {
    properties: { test_property: 'test_value' },
    sensitiveProperties: { sensitive_property: 'sensitive_value' },
  };

  const mockTransactionMetricRequest = {
    getTransactionMetricProperties: jest
      .fn()
      .mockReturnValue(mockTransactionMetrics),
  };

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
  });

  const handlerTestCases = [
    {
      handlerName: 'handleTransactionAdded',
      handler: handleTransactionAdded,
      event: TRANSACTION_EVENTS.TRANSACTION_ADDED,
    },
    {
      handlerName: 'handleTransactionApproved',
      handler: handleTransactionApproved,
      event: TRANSACTION_EVENTS.TRANSACTION_APPROVED,
      extraAssertions: (
        eventBuilder: jest.Mocked<MetricsEventBuilder>,
        _transactionMeta: TransactionMeta,
      ) => {
        const expectedProperties = {
          chain_id: '0x1',
          transaction_internal_id: 'test-id',
          transaction_type: 'unknown',
          test_property: 'test_value',
        };

        expect(eventBuilder.addProperties).toHaveBeenCalledWith(
          expect.objectContaining(expectedProperties),
        );
        expect(eventBuilder.addSensitiveProperties).toHaveBeenCalledWith(
          expect.objectContaining({ sensitive_property: 'sensitive_value' }),
        );
      },
    },
    {
      handlerName: 'handleTransactionConfirmed',
      handler: handleTransactionConfirmed,
      event: TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
    },
    {
      handlerName: 'handleTransactionDropped',
      handler: handleTransactionDropped,
      event: TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
    },
    {
      handlerName: 'handleTransactionFailed',
      handler: handleTransactionFailed,
      event: TRANSACTION_EVENTS.TRANSACTION_FINALIZED,
    },
    {
      handlerName: 'handleTransactionRejected',
      handler: handleTransactionRejected,
      event: TRANSACTION_EVENTS.TRANSACTION_REJECTED,
    },
    {
      handlerName: 'handleTransactionSubmitted',
      handler: handleTransactionSubmitted,
      event: TRANSACTION_EVENTS.TRANSACTION_SUBMITTED,
    },
  ];

  it.each(handlerTestCases)(
    '$handlerName should generate and track event with correct properties',
    ({ handler, event, extraAssertions }) => {
      handler(mockTransactionMeta, mockTransactionMetricRequest);

      expect(
        mockTransactionMetricRequest.getTransactionMetricProperties,
      ).toHaveBeenCalledWith('test-id');
      expect(MetricsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        event,
      );

      if (extraAssertions) {
        extraAssertions(
          mockEventBuilder as unknown as jest.Mocked<MetricsEventBuilder>,
          mockTransactionMeta,
        );
      }

      expect(mockEventBuilder.build).toHaveBeenCalled();
    },
  );

  it('handles missing transaction metrics properties', () => {
    mockTransactionMetricRequest.getTransactionMetricProperties.mockReturnValueOnce(
      {
        properties: {},
        sensitiveProperties: {},
      },
    );

    handleTransactionApproved(
      mockTransactionMeta,
      mockTransactionMetricRequest,
    );

    expect(mockEventBuilder.addProperties).toHaveBeenCalled();
    expect(mockEventBuilder.addSensitiveProperties).toHaveBeenCalled();
  });

  it('handles undefined transaction metrics', () => {
    mockTransactionMetricRequest.getTransactionMetricProperties.mockReturnValueOnce(
      undefined,
    );

    expect(() => {
      handleTransactionApproved(
        mockTransactionMeta,
        mockTransactionMetricRequest,
      );
    }).not.toThrow();
  });
});
