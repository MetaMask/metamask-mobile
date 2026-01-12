import type { TransactionMeta } from '@metamask/transaction-controller';
import { merge } from 'lodash';

import { MetaMetrics } from '../../../../Analytics';
import { TRANSACTION_EVENTS } from '../../../../Analytics/events/confirmations';
import { MetricsEventBuilder } from '../../../../Analytics/MetricsEventBuilder';
import {
  handleTransactionAddedEventForMetrics,
  handleTransactionApprovedEventForMetrics,
  handleTransactionFinalizedEventForMetrics,
  handleTransactionRejectedEventForMetrics,
  handleTransactionSubmittedEventForMetrics,
} from './metrics';
import { TransactionEventHandlerRequest } from '../types';
import { enabledSmartTransactionsState } from '../data-helpers';

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

describe('Transaction Metric Event Handlers', () => {
  const mockGetState = jest.fn();
  const mockInitMessenger = jest.fn();
  const mockSmartTransactionsController = jest.fn();

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
});
