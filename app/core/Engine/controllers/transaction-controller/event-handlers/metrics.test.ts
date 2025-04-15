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
import { selectTransactionsTxHashInAnalyticsEnabled } from '../../../../../selectors/featureFlagController';

jest.mock('../../../../../selectors/featureFlagController', () => ({
  selectTransactionsTxHashInAnalyticsEnabled: jest.fn().mockReturnValue(false),
}));
jest.mock('../../../../../util/smart-transactions');

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

describe('Transaction Metric Event Handlers', () => {
  const mockGetSmartTransactionMetricsProperties = jest.mocked(
    getSmartTransactionMetricsProperties,
  );
  const mockGetState = jest.fn();
  const mockInitMessenger = jest.fn();
  const mockSmartTransactionsController = jest.fn();

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

  it('handles missing transaction metrics properties', () => {
    mockGetState.mockReturnValueOnce({
      confirmationMetrics: {
        metricsById: {},
      },
    });

    handleTransactionApprovedEventForMetrics(
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
      await handleTransactionFinalizedEventForMetrics(
        mockTransactionMeta,
        mockTransactionMetricRequest,
      );

      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining(mockSmartTransactionMetricsProperties),
      );
    });

    it('does not add STX metrics properties if smart transactions are not enabled', async () => {
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

    describe('transaction hash in analytics', () => {
      // Mock for testing the transaction hash feature
      const mockTransactionMetaWithHash = {
        ...mockTransactionMeta,
        hash: 'test-tx-hash',
      } as unknown as TransactionMeta;

      // Mock for isEnabled
      const mockIsEnabled = jest.fn().mockReturnValue(false);

      beforeEach(() => {
        jest.clearAllMocks();

        // Setup MetaMetrics instance with isEnabled method
        const mockMetaMetricsInstance = {
          trackEvent: mockTrackEvent,
          isEnabled: mockIsEnabled,
          getMetaMetricsId: jest.fn().mockResolvedValue('mock-metrics-id'),
        };

        (MetaMetrics.getInstance as jest.Mock).mockReturnValue(mockMetaMetricsInstance);
      });

      it('includes transaction hash when feature flag is enabled and user is opted in', async () => {
        // Setup
        mockIsEnabled.mockReturnValue(true);
        (selectTransactionsTxHashInAnalyticsEnabled as unknown as jest.Mock).mockReturnValue(true);

        // Execute
        await handleTransactionFinalizedEventForMetrics(
          mockTransactionMetaWithHash,
          mockTransactionMetricRequest
        );

        // Verify
        expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
          expect.objectContaining({
            transaction_hash: 'test-tx-hash',
            user_id: 'mock-metrics-id',
          })
        );
      });

      it('does not include transaction hash when feature flag is disabled', async () => {
        // Setup
        mockIsEnabled.mockReturnValue(true);
        (selectTransactionsTxHashInAnalyticsEnabled as unknown as jest.Mock).mockReturnValue(false);

        // Execute
        await handleTransactionFinalizedEventForMetrics(
          mockTransactionMetaWithHash,
          mockTransactionMetricRequest
        );

        // Verify
        expect(mockEventBuilder.addProperties).not.toHaveBeenCalledWith(
          expect.objectContaining({
            transaction_hash: 'test-tx-hash',
          })
        );
      });

      it('does not include transaction hash when user is not opted in', async () => {
        // Setup
        mockIsEnabled.mockReturnValue(false);
        (selectTransactionsTxHashInAnalyticsEnabled as unknown as jest.Mock).mockReturnValue(true);

        // Execute
        await handleTransactionFinalizedEventForMetrics(
          mockTransactionMetaWithHash,
          mockTransactionMetricRequest
        );

        // Verify
        expect(mockEventBuilder.addProperties).not.toHaveBeenCalledWith(
          expect.objectContaining({
            transaction_hash: 'test-tx-hash',
          })
        );
      });

      it('handles errors when checking if metrics are enabled', async () => {
        // Setup
        mockIsEnabled.mockImplementation(() => {
          throw new Error('Test error');
        });
        (selectTransactionsTxHashInAnalyticsEnabled as unknown as jest.Mock).mockReturnValue(true);

        // Execute
        await handleTransactionFinalizedEventForMetrics(
          mockTransactionMetaWithHash,
          mockTransactionMetricRequest
        );

        // Verify no crash and no hash added
        expect(mockEventBuilder.addProperties).not.toHaveBeenCalledWith(
          expect.objectContaining({
            transaction_hash: 'test-tx-hash',
          })
        );
      });
    });
  });
});
