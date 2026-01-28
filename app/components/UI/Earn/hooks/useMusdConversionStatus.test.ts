import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { renderHook } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine';
import { useMusdConversionStatus } from './useMusdConversionStatus';
import useEarnToasts, { EarnToastOptionsConfig } from './useEarnToasts';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { NotificationFeedbackType } from 'expo-haptics';

// Mock all external dependencies
jest.mock('../../../../core/Engine');
jest.mock('./useEarnToasts');
jest.mock('../../../hooks/useMetrics');
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('../../../../selectors/tokenListController', () => ({
  selectERC20TokensByChain: jest.fn(),
}));
jest.mock('../../../../util/transactions', () => {
  const actual = jest.requireActual('../../../../util/transactions');
  return {
    ...actual,
    decodeTransferData: jest.fn(),
  };
});
jest.mock('../../../../util/networks', () => ({}));
jest.mock('../../../../selectors/networkController', () => ({
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));
jest.mock('../../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    MusdConversionConfirm: 'mUSD Conversion Confirm',
  },
  TraceOperation: {
    MusdConversionOperation: 'musd.conversion.operation',
  },
}));
jest.mock('../../../../store', () => ({
  store: {
    getState: jest.fn(() => ({})),
  },
}));
jest.mock('../../../../selectors/transactionPayController', () => ({
  selectTransactionPayQuotesByTransactionId: jest.fn(),
}));

import { useSelector } from 'react-redux';
import { selectERC20TokensByChain } from '../../../../selectors/tokenListController';
import { useMetrics, MetaMetricsEvents } from '../../../hooks/useMetrics';
import { decodeTransferData } from '../../../../util/transactions';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { selectTransactionPayQuotesByTransactionId } from '../../../../selectors/transactionPayController';
import { TransactionPayStrategy } from '@metamask/transaction-pay-controller';

const mockTrace = trace as jest.MockedFunction<typeof trace>;
const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;
const mockSelectTransactionPayQuotesByTransactionId = jest.mocked(
  selectTransactionPayQuotesByTransactionId,
);

const mockUseSelector = jest.mocked(useSelector);
const mockSelectERC20TokensByChain = jest.mocked(selectERC20TokensByChain);
const mockUseMetrics = jest.mocked(useMetrics);
const mockDecodeTransferData = jest.mocked(decodeTransferData);
const mockSelectEvmNetworkConfigurationsByChainId = jest.mocked(
  selectEvmNetworkConfigurationsByChainId,
);

type TransactionStatusUpdatedHandler = (event: {
  transactionMeta: TransactionMeta;
}) => void;

const mockSubscribe = jest.fn<
  void,
  [string, TransactionStatusUpdatedHandler]
>();
const mockUnsubscribe = jest.fn<
  void,
  [string, TransactionStatusUpdatedHandler]
>();
const mockUseEarnToasts = jest.mocked(useEarnToasts);

Object.defineProperty(Engine, 'controllerMessenger', {
  value: {
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
  },
  writable: true,
  configurable: true,
});

describe('useMusdConversionStatus', () => {
  const FIXED_NOW_MS = 1730000000000;
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockAddProperties = jest.fn();
  const mockBuild = jest.fn();

  const mockShowToast = jest.fn();
  const mockInProgressToast = {
    variant: ToastVariants.Icon as const,
    iconName: IconName.Loading,
    hasNoTimeout: true,
    iconColor: '#000000',
    backgroundColor: '#FFFFFF',
    hapticsType: NotificationFeedbackType.Warning,
    labelOptions: [{ label: 'In Progress', isBold: true }],
  };
  const mockInProgressFn = jest.fn(() => mockInProgressToast);
  const mockEarnToastOptions: EarnToastOptionsConfig = {
    mUsdConversion: {
      inProgress: mockInProgressFn,
      success: {
        variant: ToastVariants.Icon as const,
        iconName: IconName.CheckBold,
        hasNoTimeout: false,
        iconColor: '#000000',
        backgroundColor: '#FFFFFF',
        hapticsType: NotificationFeedbackType.Success,
        labelOptions: [{ label: 'Success', isBold: true }],
      },
      failed: {
        variant: ToastVariants.Icon as const,
        iconName: IconName.Danger,
        hasNoTimeout: false,
        iconColor: '#000000',
        backgroundColor: '#FFFFFF',
        hapticsType: NotificationFeedbackType.Error,
        labelOptions: [{ label: 'Failed', isBold: true }],
      },
    },
    bonusClaim: {
      inProgress: {
        variant: ToastVariants.Icon as const,
        iconName: IconName.Loading,
        hasNoTimeout: true,
        iconColor: '#000000',
        backgroundColor: '#FFFFFF',
        hapticsType: NotificationFeedbackType.Warning,
        labelOptions: [{ label: 'Claiming bonus', isBold: true }],
      },
      success: {
        variant: ToastVariants.Icon as const,
        iconName: IconName.CheckBold,
        hasNoTimeout: false,
        iconColor: '#000000',
        backgroundColor: '#FFFFFF',
        hapticsType: NotificationFeedbackType.Success,
        labelOptions: [{ label: 'Success', isBold: true }],
      },
      failed: {
        variant: ToastVariants.Icon as const,
        iconName: IconName.Danger,
        hasNoTimeout: false,
        iconColor: '#000000',
        backgroundColor: '#FFFFFF',
        hapticsType: NotificationFeedbackType.Error,
        labelOptions: [{ label: 'Bonus claim failed', isBold: true }],
      },
    },
  };

  // Default mock data
  const defaultTokensChainsCache = {};

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockInProgressFn.mockClear();

    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW_MS);

    mockBuild.mockReturnValue({ name: 'mock-built-event' });
    mockAddProperties.mockImplementation(() => ({ build: mockBuild }));
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: mockAddProperties,
    }));
    mockUseMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as unknown as ReturnType<typeof useMetrics>);

    mockDecodeTransferData.mockReturnValue([
      '',
      '1.23',
      '0x1234',
    ] as unknown as ReturnType<typeof decodeTransferData>);

    mockUseEarnToasts.mockReturnValue({
      showToast: mockShowToast,
      EarnToastOptions: mockEarnToastOptions,
    });

    // Setup useSelector to return different values based on selector
    mockUseSelector.mockImplementation((selector) => {
      if (selector === mockSelectERC20TokensByChain) {
        return defaultTokensChainsCache;
      }
      if (selector === mockSelectEvmNetworkConfigurationsByChainId) {
        return { '0x1': { name: 'Ethereum Mainnet' } };
      }
      return {};
    });
  });

  // Helper to setup token cache mock
  const setupTokensCacheMock = (tokenData: Record<string, unknown>) => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === mockSelectERC20TokensByChain) {
        return tokenData;
      }
      if (selector === mockSelectEvmNetworkConfigurationsByChainId) {
        return { '0x1': { name: 'Ethereum Mainnet' } };
      }
      return {};
    });
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const createTransactionMeta = (
    status: TransactionStatus,
    transactionId = 'test-transaction-1',
    type = TransactionType.musdConversion,
    metamaskPay?: { chainId?: string; tokenAddress?: string },
  ): TransactionMeta =>
    ({
      id: transactionId,
      status,
      type,
      chainId: '0x1',
      networkClientId: 'mainnet',
      time: Date.now(),
      txParams: {
        from: '0x123',
        to: '0x456',
      },
      ...(metamaskPay && { metamaskPay }),
    }) as TransactionMeta;

  const getSubscribedHandler = (): TransactionStatusUpdatedHandler => {
    const subscribeCalls = mockSubscribe.mock.calls;
    const lastCall = subscribeCalls.at(-1);
    if (!lastCall) {
      throw new Error('No subscription found');
    }
    return lastCall[1];
  };

  describe('subscription lifecycle', () => {
    it('subscribes to TransactionController:transactionStatusUpdated on mount', () => {
      renderHook(() => useMusdConversionStatus());

      expect(mockSubscribe).toHaveBeenCalledTimes(1);
      const handler = getSubscribedHandler();
      expect(typeof handler).toBe('function');
      expect(mockSubscribe.mock.calls[0][0]).toBe(
        'TransactionController:transactionStatusUpdated',
      );
    });

    it('unsubscribes from TransactionController:transactionStatusUpdated on unmount', () => {
      const { unmount } = renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      expect(mockUnsubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        handler,
      );
    });
  });

  describe('approved transaction status', () => {
    it('shows in-progress toast when transaction status is approved', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(TransactionStatus.approved);

      handler({ transactionMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(mockInProgressToast);
    });

    it('prevents duplicate in-progress toast for same transaction', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(TransactionStatus.approved);

      handler({ transactionMeta });
      handler({ transactionMeta });
      handler({ transactionMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('passes token symbol from metamaskPay data to in-progress toast', () => {
      const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const chainId = '0x89';
      const mockTokenData = {
        [chainId]: {
          data: {
            [tokenAddress]: { symbol: 'USDC' },
          },
        },
      };
      setupTokensCacheMock(mockTokenData);

      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.approved,
        'test-tx-with-token',
        TransactionType.musdConversion,
        { chainId, tokenAddress },
      );

      handler({ transactionMeta });

      expect(mockInProgressFn).toHaveBeenCalledWith({
        tokenSymbol: 'USDC',
      });
    });

    it('uses lowercase token address as fallback for symbol lookup', () => {
      const tokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
      const chainId = '0x1';
      const mockTokenData = {
        [chainId]: {
          data: {
            [tokenAddress.toLowerCase()]: { symbol: 'DAI' },
          },
        },
      };
      setupTokensCacheMock(mockTokenData);

      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.approved,
        'test-tx-lowercase',
        TransactionType.musdConversion,
        { chainId, tokenAddress },
      );

      handler({ transactionMeta });

      expect(mockInProgressFn).toHaveBeenCalledWith(
        expect.objectContaining({ tokenSymbol: 'DAI' }),
      );
    });

    it('uses "Token" as fallback when token symbol is not found', () => {
      const tokenAddress = '0x1111111111111111111111111111111111111111';
      const chainId = '0x1';
      setupTokensCacheMock({
        [chainId]: { data: {} },
      });

      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.approved,
        'test-tx-unknown',
        TransactionType.musdConversion,
        { chainId, tokenAddress },
      );

      handler({ transactionMeta });

      expect(mockInProgressFn).toHaveBeenCalledWith(
        expect.objectContaining({ tokenSymbol: 'Token' }),
      );
    });

    it('passes empty tokenSymbol when payTokenAddress is missing', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.approved,
        'test-tx-no-token',
        TransactionType.musdConversion,
        { chainId: '0x1' },
      );

      handler({ transactionMeta });

      expect(mockInProgressFn).toHaveBeenCalledWith({
        tokenSymbol: 'Token',
      });
    });

    it('passes empty tokenSymbol when metamaskPay is missing', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(TransactionStatus.approved);

      handler({ transactionMeta });

      expect(mockInProgressFn).toHaveBeenCalledWith({
        tokenSymbol: 'Token',
      });
    });
  });

  describe('confirmed transaction status', () => {
    it('shows success toast when transaction status is confirmed', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.confirmed,
      );

      handler({ transactionMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        mockEarnToastOptions.mUsdConversion.success,
      );
    });

    it('prevents duplicate success toast for same transaction', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.confirmed,
      );

      handler({ transactionMeta });
      handler({ transactionMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('cleans up toast tracking entries after 5 seconds for confirmed status', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionId = 'test-transaction-1';
      const approvedMeta = createTransactionMeta(
        TransactionStatus.approved,
        transactionId,
      );
      const confirmedMeta = createTransactionMeta(
        TransactionStatus.confirmed,
        transactionId,
      );

      handler({ transactionMeta: approvedMeta });
      handler({ transactionMeta: confirmedMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(5000);

      // After cleanup, should be able to show toasts again for same transaction
      handler({ transactionMeta: approvedMeta });
      handler({ transactionMeta: confirmedMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(4);
    });
  });

  describe('failed transaction status', () => {
    it('shows failed toast when transaction status is failed', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(TransactionStatus.failed);

      handler({ transactionMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        mockEarnToastOptions.mUsdConversion.failed,
      );
    });

    it('prevents duplicate failed toast for same transaction', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(TransactionStatus.failed);

      handler({ transactionMeta });
      handler({ transactionMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('cleans up toast tracking entries after 5 seconds for failed status', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionId = 'test-transaction-2';
      const approvedMeta = createTransactionMeta(
        TransactionStatus.approved,
        transactionId,
      );
      const failedMeta = createTransactionMeta(
        TransactionStatus.failed,
        transactionId,
      );

      handler({ transactionMeta: approvedMeta });
      handler({ transactionMeta: failedMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(5000);

      // After cleanup, should be able to show toasts again for same transaction
      handler({ transactionMeta: approvedMeta });
      handler({ transactionMeta: failedMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(4);
    });
  });

  describe('transaction flow from approved to final status', () => {
    it('shows both in-progress and success toasts for transaction flow', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionId = 'test-transaction-3';
      const approvedMeta = createTransactionMeta(
        TransactionStatus.approved,
        transactionId,
      );
      const confirmedMeta = createTransactionMeta(
        TransactionStatus.confirmed,
        transactionId,
      );

      handler({ transactionMeta: approvedMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(mockInProgressToast);

      handler({ transactionMeta: confirmedMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(2);
      expect(mockShowToast).toHaveBeenCalledWith(
        mockEarnToastOptions.mUsdConversion.success,
      );
    });

    it('shows both in-progress and failed toasts for transaction flow', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionId = 'test-transaction-4';
      const approvedMeta = createTransactionMeta(
        TransactionStatus.approved,
        transactionId,
      );
      const failedMeta = createTransactionMeta(
        TransactionStatus.failed,
        transactionId,
      );

      handler({ transactionMeta: approvedMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(mockInProgressToast);

      handler({ transactionMeta: failedMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(2);
      expect(mockShowToast).toHaveBeenCalledWith(
        mockEarnToastOptions.mUsdConversion.failed,
      );
    });
  });

  describe('non-mUSD conversion transactions', () => {
    it('ignores transaction when type is not mUSD conversion', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.approved,
        'test-transaction-5',
        'contractInteraction' as typeof TransactionType.musdConversion,
      );

      handler({ transactionMeta });

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('ignores transaction when type is swap', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.confirmed,
        'test-transaction-6',
        'swap' as typeof TransactionType.musdConversion,
      );

      handler({ transactionMeta });

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('ignores transaction when type is simpleSend', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.failed,
        'test-transaction-7',
        'simpleSend' as typeof TransactionType.musdConversion,
      );

      handler({ transactionMeta });

      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('other transaction statuses', () => {
    it('ignores transaction when status is unapproved', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.unapproved,
      );

      handler({ transactionMeta });

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('ignores transaction when status is submitted', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.submitted,
      );

      handler({ transactionMeta });

      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('ignores transaction when status is signed', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(TransactionStatus.signed);

      handler({ transactionMeta });

      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('multiple concurrent transactions', () => {
    it('tracks and shows toasts for different transactions independently', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transaction1Approved = createTransactionMeta(
        TransactionStatus.approved,
        'transaction-1',
      );
      const transaction2Approved = createTransactionMeta(
        TransactionStatus.approved,
        'transaction-2',
      );
      const transaction1Confirmed = createTransactionMeta(
        TransactionStatus.confirmed,
        'transaction-1',
      );
      const transaction2Failed = createTransactionMeta(
        TransactionStatus.failed,
        'transaction-2',
      );

      handler({ transactionMeta: transaction1Approved });
      handler({ transactionMeta: transaction2Approved });
      handler({ transactionMeta: transaction1Confirmed });
      handler({ transactionMeta: transaction2Failed });

      expect(mockShowToast).toHaveBeenCalledTimes(4);
      expect(mockShowToast).toHaveBeenNthCalledWith(1, mockInProgressToast);
      expect(mockShowToast).toHaveBeenNthCalledWith(2, mockInProgressToast);
      expect(mockShowToast).toHaveBeenNthCalledWith(
        3,
        mockEarnToastOptions.mUsdConversion.success,
      );
      expect(mockShowToast).toHaveBeenNthCalledWith(
        4,
        mockEarnToastOptions.mUsdConversion.failed,
      );
    });

    it('cleans up only entries for specific transaction after timeout', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transaction1Confirmed = createTransactionMeta(
        TransactionStatus.confirmed,
        'transaction-1',
      );
      const transaction2Confirmed = createTransactionMeta(
        TransactionStatus.confirmed,
        'transaction-2',
      );

      handler({ transactionMeta: transaction1Confirmed });
      handler({ transactionMeta: transaction2Confirmed });

      expect(mockShowToast).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(5000);

      // Both transactions should be cleaned up after 5 seconds
      handler({ transactionMeta: transaction1Confirmed });
      handler({ transactionMeta: transaction2Confirmed });

      expect(mockShowToast).toHaveBeenCalledTimes(4);
    });
  });

  describe('hook dependencies', () => {
    it('uses showToast function from useEarnToasts hook', () => {
      renderHook(() => useMusdConversionStatus());

      expect(mockUseEarnToasts).toHaveBeenCalledTimes(1);

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(TransactionStatus.approved);

      handler({ transactionMeta });

      expect(mockShowToast).toHaveBeenCalled();
    });

    it('uses EarnToastOptions from useEarnToasts hook', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.confirmed,
      );

      handler({ transactionMeta });

      expect(mockShowToast).toHaveBeenCalledWith(
        mockEarnToastOptions.mUsdConversion.success,
      );
    });
  });

  describe('MetaMetrics', () => {
    it('tracks status updated event when transaction status is approved', () => {
      const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const chainId = '0x1';
      setupTokensCacheMock({
        [chainId]: {
          data: {
            [tokenAddress]: { symbol: 'USDC', name: 'USD Coin' },
          },
        },
      });

      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.approved,
        'test-tx-metrics-approved',
        TransactionType.musdConversion,
        { chainId, tokenAddress },
      );

      handler({ transactionMeta });

      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_CONVERSION_STATUS_UPDATED,
      );

      expect(mockAddProperties).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith({
        transaction_id: 'test-tx-metrics-approved',
        transaction_status: TransactionStatus.approved,
        transaction_type: TransactionType.musdConversion,
        asset_symbol: 'USDC',
        network_chain_id: '0x1',
        network_name: 'Ethereum Mainnet',
        amount_decimal: '1.23',
        amount_hex: '0x1234',
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });

    it('tracks status updated event when transaction status is confirmed', () => {
      const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const chainId = '0x1';
      setupTokensCacheMock({
        [chainId]: {
          data: {
            [tokenAddress]: { symbol: 'USDC', name: 'USD Coin' },
          },
        },
      });

      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.confirmed,
        'test-tx-metrics-confirmed',
        TransactionType.musdConversion,
        { chainId, tokenAddress },
      );

      handler({ transactionMeta });

      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_CONVERSION_STATUS_UPDATED,
      );

      expect(mockAddProperties).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith({
        transaction_id: 'test-tx-metrics-confirmed',
        transaction_status: TransactionStatus.confirmed,
        transaction_type: TransactionType.musdConversion,
        asset_symbol: 'USDC',
        network_chain_id: '0x1',
        network_name: 'Ethereum Mainnet',
        amount_decimal: '1.23',
        amount_hex: '0x1234',
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });

    it('tracks status updated event when transaction status is failed', () => {
      const tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const chainId = '0x1';
      setupTokensCacheMock({
        [chainId]: {
          data: {
            [tokenAddress]: { symbol: 'USDC', name: 'USD Coin' },
          },
        },
      });

      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.failed,
        'test-tx-metrics-failed',
        TransactionType.musdConversion,
        { chainId, tokenAddress },
      );

      handler({ transactionMeta });

      expect(mockCreateEventBuilder).toHaveBeenCalledTimes(1);
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.MUSD_CONVERSION_STATUS_UPDATED,
      );

      expect(mockAddProperties).toHaveBeenCalledTimes(1);
      expect(mockAddProperties).toHaveBeenCalledWith({
        transaction_id: 'test-tx-metrics-failed',
        transaction_status: TransactionStatus.failed,
        transaction_type: TransactionType.musdConversion,
        asset_symbol: 'USDC',
        network_chain_id: '0x1',
        network_name: 'Ethereum Mainnet',
        amount_decimal: '1.23',
        amount_hex: '0x1234',
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith({ name: 'mock-built-event' });
    });

    it('does not track status updated event when transaction type is not musdConversion', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.approved,
        'test-tx-metrics-ignored',
        'swap' as typeof TransactionType.musdConversion,
      );

      handler({ transactionMeta });

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(mockCreateEventBuilder).not.toHaveBeenCalled();
      expect(mockAddProperties).not.toHaveBeenCalled();
    });
  });

  describe('Sentry traces', () => {
    beforeEach(() => {
      mockSelectTransactionPayQuotesByTransactionId.mockReturnValue([
        { strategy: TransactionPayStrategy.Relay },
      ] as ReturnType<typeof mockSelectTransactionPayQuotesByTransactionId>);
    });

    it('starts confirmation trace when transaction status is approved', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.approved,
        'test-trace-approved',
      );

      handler({ transactionMeta });

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.MusdConversionConfirm,
        op: TraceOperation.MusdConversionOperation,
        id: 'test-trace-approved',
        tags: {
          transactionId: 'test-trace-approved',
          chainId: '0x1',
          strategy: 'relay',
        },
      });
    });

    it('includes bridge strategy when quote uses Bridge', () => {
      mockSelectTransactionPayQuotesByTransactionId.mockReturnValue([
        { strategy: TransactionPayStrategy.Bridge },
      ] as ReturnType<typeof mockSelectTransactionPayQuotesByTransactionId>);

      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.approved,
        'test-trace-bridge',
      );

      handler({ transactionMeta });

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({
            strategy: 'bridge',
          }),
        }),
      );
    });

    it('includes unknown strategy when no quotes exist', () => {
      mockSelectTransactionPayQuotesByTransactionId.mockReturnValue(undefined);

      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.approved,
        'test-trace-no-quotes',
      );

      handler({ transactionMeta });

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.objectContaining({
            strategy: 'unknown',
          }),
        }),
      );
    });

    it('ends confirmation trace with success when transaction is confirmed', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.confirmed,
        'test-trace-confirmed',
      );

      handler({ transactionMeta });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.MusdConversionConfirm,
        id: 'test-trace-confirmed',
        data: {
          success: true,
          status: TransactionStatus.confirmed,
        },
      });
    });

    it('ends confirmation trace with failure when transaction fails', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.failed,
        'test-trace-failed',
      );

      handler({ transactionMeta });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.MusdConversionConfirm,
        id: 'test-trace-failed',
        data: {
          success: false,
          status: TransactionStatus.failed,
        },
      });
    });

    it('does not start trace for non-mUSD conversion transactions', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.approved,
        'test-trace-non-musd',
        'swap' as typeof TransactionType.musdConversion,
      );

      handler({ transactionMeta });

      expect(mockTrace).not.toHaveBeenCalled();
    });

    it('does not end trace for non-mUSD conversion transactions', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.confirmed,
        'test-trace-non-musd-confirm',
        'swap' as typeof TransactionType.musdConversion,
      );

      handler({ transactionMeta });

      expect(mockEndTrace).not.toHaveBeenCalled();
    });

    it('ends confirmation trace when transaction is rejected', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.rejected,
        'test-trace-rejected',
      );

      handler({ transactionMeta });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.MusdConversionConfirm,
        id: 'test-trace-rejected',
        data: {
          success: false,
          status: TransactionStatus.rejected,
        },
      });
    });

    it('ends confirmation trace when transaction is dropped', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.dropped,
        'test-trace-dropped',
      );

      handler({ transactionMeta });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.MusdConversionConfirm,
        id: 'test-trace-dropped',
        data: {
          success: false,
          status: TransactionStatus.dropped,
        },
      });
    });

    it('ends confirmation trace when transaction is cancelled', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.cancelled,
        'test-trace-cancelled',
      );

      handler({ transactionMeta });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.MusdConversionConfirm,
        id: 'test-trace-cancelled',
        data: {
          success: false,
          status: TransactionStatus.cancelled,
        },
      });
    });

    it('completes full trace lifecycle from approved to confirmed', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionId = 'test-lifecycle-tx';

      // Transaction approved - starts trace
      handler({
        transactionMeta: createTransactionMeta(
          TransactionStatus.approved,
          transactionId,
        ),
      });

      expect(mockTrace).toHaveBeenCalledWith(
        expect.objectContaining({
          name: TraceName.MusdConversionConfirm,
          id: transactionId,
        }),
      );

      // Transaction confirmed - ends trace
      handler({
        transactionMeta: createTransactionMeta(
          TransactionStatus.confirmed,
          transactionId,
        ),
      });

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.MusdConversionConfirm,
        id: transactionId,
        data: {
          success: true,
          status: TransactionStatus.confirmed,
        },
      });
    });
  });
});
