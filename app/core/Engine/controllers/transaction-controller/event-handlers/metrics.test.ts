import type { TransactionMeta } from '@metamask/transaction-controller';
import { merge } from 'lodash';

import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { MetricsEventBuilder } from '../../../../Analytics/MetricsEventBuilder';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
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
import { selectIsPna25FlagEnabled } from '../../../../../selectors/featureFlagController/legalNotices';
import { selectIsPna25Acknowledged } from '../../../../../selectors/legalNotices';

jest.mock('../../../../../util/smart-transactions', () => {
  const actual = jest.requireActual('../../../../../util/smart-transactions');
  return {
    ...actual,
    getSmartTransactionMetricsProperties: jest.fn().mockResolvedValue({}),
  };
});

jest.mock('../../../../../selectors/smartTransactionsController', () => ({
  selectShouldUseSmartTransaction: jest.fn().mockReturnValue(false),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/legalNotices',
  () => ({
    selectIsPna25FlagEnabled: jest.fn().mockReturnValue(false),
  }),
);

jest.mock('../../../../../selectors/legalNotices', () => ({
  selectIsPna25Acknowledged: jest.fn().mockReturnValue(false),
}));

// Mock MetricsEventBuilder (used by generateEvent in utils.ts)
jest.mock('../../../../Analytics/MetricsEventBuilder', () => ({
  MetricsEventBuilder: {
    createEventBuilder: jest.fn(),
  },
}));

jest.mock('../../../../../util/analytics/AnalyticsEventBuilder');

jest.mock('../../../Engine', () => ({
  context: {},
}));

jest.mock('../metrics_properties/metamask-pay', () => ({
  getMetaMaskPayProperties: jest.fn().mockReturnValue({
    properties: {
      builder_test: true,
    },
    sensitiveProperties: {
      builder_sensitive_test: true,
    },
  }),
}));

const mockSmartTransactionMetricsProperties = {
  smart_transaction_timed_out: false,
  smart_transaction_proxied: false,
  is_smart_transaction: true,
};

describe('Transaction Metric Event Handlers', () => {
  const mockGetState = jest.fn();
  const mockInitMessengerCall = jest.fn();
  const mockSmartTransactionsController = jest.fn();

  // Mock variables for selectors
  const mockSelectShouldUseSmartTransaction = jest.mocked(
    selectShouldUseSmartTransaction,
  );
  const mockGetSmartTransactionMetricsProperties = jest.mocked(
    getSmartTransactionMetricsProperties,
  );
  const mockSelectIsPna25FlagEnabled = jest.mocked(selectIsPna25FlagEnabled);
  const mockSelectIsPna25Acknowledged = jest.mocked(selectIsPna25Acknowledged);

  const mockTransactionMeta = {
    id: 'test-id',
    chainId: '0x1',
    hash: '0x1234567890',
    type: 'standard',
    networkClientId: 'test-network',
    time: 1234567890,
    txParams: {},
  } as unknown as TransactionMeta;

  const mockTransactionMetricRequest = {
    getState: mockGetState,
    initMessenger: { call: mockInitMessengerCall },
    smartTransactionsController: mockSmartTransactionsController,
  } as unknown as TransactionEventHandlerRequest;

  // Mock for MetricsEventBuilder (used by generateEvent in utils.ts)
  const mockMetricsEventBuilder = {
    addProperties: jest.fn().mockReturnThis(),
    addSensitiveProperties: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      name: 'Transaction Added',
      properties: {},
      sensitiveProperties: {},
      saveDataRecording: false,
    }),
  };

  // Mock for AnalyticsEventBuilder (used by metrics.ts)
  const mockAnalyticsEventBuilder = {
    addProperties: jest.fn().mockReturnThis(),
    addSensitiveProperties: jest.fn().mockReturnThis(),
    setSaveDataRecording: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      name: 'Transaction Added',
      properties: {},
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock MetricsEventBuilder (used by generateEvent in utils.ts)
    (MetricsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
      mockMetricsEventBuilder,
    );

    // Mock AnalyticsEventBuilder (used by metrics.ts)
    (AnalyticsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
      mockAnalyticsEventBuilder,
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
    '$handlerName generates and tracks event with correct properties',
    async ({ handler, event }) => {
      await handler(mockTransactionMeta, mockTransactionMetricRequest);

      expect(MetricsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
        event,
      );

      expect(mockMetricsEventBuilder.build).toHaveBeenCalled();
      expect(mockInitMessengerCall).toHaveBeenCalledWith(
        'AnalyticsController:trackEvent',
        expect.any(Object),
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

    expect(mockMetricsEventBuilder.addProperties).toHaveBeenCalled();
    expect(mockMetricsEventBuilder.addSensitiveProperties).toHaveBeenCalled();
  });

  it('does not throw for undefined transaction metrics', () => {
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

  it('includes builder metrics in tracked event', async () => {
    await handleTransactionSubmittedEventForMetrics(
      mockTransactionMeta,
      mockTransactionMetricRequest,
    );

    expect(mockMetricsEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        builder_test: true,
      }),
    );

    expect(mockMetricsEventBuilder.addSensitiveProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        builder_sensitive_test: true,
      }),
    );
  });

  it('includes simulation receiving total value when assetsFiatValues is set', async () => {
    const transactionMetaWithFiatValues = {
      ...mockTransactionMeta,
      assetsFiatValues: {
        receiving: '123.45',
      },
    } as unknown as TransactionMeta;

    await handleTransactionApprovedEventForMetrics(
      transactionMetaWithFiatValues,
      mockTransactionMetricRequest,
    );

    expect(mockMetricsEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        simulation_receiving_assets_total_value: 123.45,
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

      // Check if addProperties was called with the STX properties
      expect(mockMetricsEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          smart_transaction_timed_out: false,
          smart_transaction_proxied: false,
          is_smart_transaction: true,
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

      expect(mockMetricsEventBuilder.addProperties).toHaveBeenCalled();
      expect(mockMetricsEventBuilder.addProperties).not.toHaveBeenCalledWith(
        expect.objectContaining(mockSmartTransactionMetricsProperties),
      );
    });

    it('includes builder metrics', async () => {
      await handleTransactionFinalizedEventForMetrics(
        mockTransactionMeta,
        mockTransactionMetricRequest,
      );

      expect(mockMetricsEventBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          builder_test: true,
        }),
      );

      expect(
        mockMetricsEventBuilder.addSensitiveProperties,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          builder_sensitive_test: true,
        }),
      );
    });

    describe('hash property', () => {
      it('included when extensionUxPna25 is enabled and pna25 is acknowledged', async () => {
        mockSelectIsPna25FlagEnabled.mockReturnValue(true);
        mockSelectIsPna25Acknowledged.mockReturnValue(true);

        await handleTransactionFinalizedEventForMetrics(
          mockTransactionMeta,
          mockTransactionMetricRequest,
        );

        expect(mockMetricsEventBuilder.addProperties).toHaveBeenCalledWith(
          expect.objectContaining({
            transaction_hash: mockTransactionMeta.hash,
          }),
        );
      });

      describe('not included', () => {
        it('extensionUxPna25 flag is disabled', async () => {
          mockSelectIsPna25FlagEnabled.mockReturnValue(false);
          mockSelectIsPna25Acknowledged.mockReturnValue(true);

          await handleTransactionFinalizedEventForMetrics(
            mockTransactionMeta,
            mockTransactionMetricRequest,
          );

          expect(
            mockMetricsEventBuilder.addProperties,
          ).not.toHaveBeenCalledWith(
            expect.objectContaining({
              transaction_hash: mockTransactionMeta.hash,
            }),
          );
        });
        it('pna25 is not acknowledged', async () => {
          mockSelectIsPna25FlagEnabled.mockReturnValue(true);
          mockSelectIsPna25Acknowledged.mockReturnValue(false);

          await handleTransactionFinalizedEventForMetrics(
            mockTransactionMeta,
            mockTransactionMetricRequest,
          );

          expect(
            mockMetricsEventBuilder.addProperties,
          ).not.toHaveBeenCalledWith(
            expect.objectContaining({
              transaction_hash: mockTransactionMeta.hash,
            }),
          );
        });
      });
    });
  });
});
