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

import { useSelector } from 'react-redux';
import { selectERC20TokensByChain } from '../../../../selectors/tokenListController';
import { useMetrics, MetaMetricsEvents } from '../../../hooks/useMetrics';
import { decodeTransferData } from '../../../../util/transactions';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';

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

type TransactionConfirmedHandler = (transactionMeta: TransactionMeta) => void;

const mockSubscribe = jest.fn<
  void,
  [string, TransactionStatusUpdatedHandler | TransactionConfirmedHandler]
>();
const mockUnsubscribe = jest.fn<
  void,
  [string, TransactionStatusUpdatedHandler | TransactionConfirmedHandler]
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
    const statusUpdatedCall = mockSubscribe.mock.calls.find(
      (call) => call[0] === 'TransactionController:transactionStatusUpdated',
    );
    if (!statusUpdatedCall) {
      throw new Error('No transactionStatusUpdated subscription found');
    }
    return statusUpdatedCall[1] as TransactionStatusUpdatedHandler;
  };

  const getConfirmedHandler = (): TransactionConfirmedHandler => {
    const confirmedCall = mockSubscribe.mock.calls.find(
      (call) => call[0] === 'TransactionController:transactionConfirmed',
    );
    if (!confirmedCall) {
      throw new Error('No transactionConfirmed subscription found');
    }
    return confirmedCall[1] as TransactionConfirmedHandler;
  };

  describe('subscription lifecycle', () => {
    it('subscribes to TransactionController:transactionStatusUpdated and transactionConfirmed on mount', () => {
      renderHook(() => useMusdConversionStatus());

      expect(mockSubscribe).toHaveBeenCalledTimes(2);

      const statusHandler = getSubscribedHandler();
      expect(typeof statusHandler).toBe('function');
      expect(mockSubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
      );

      const confirmedHandler = getConfirmedHandler();
      expect(typeof confirmedHandler).toBe('function');
      expect(mockSubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionConfirmed',
        expect.any(Function),
      );
    });

    it('unsubscribes from TransactionController:transactionStatusUpdated and transactionConfirmed on unmount', () => {
      const { unmount } = renderHook(() => useMusdConversionStatus());

      const statusHandler = getSubscribedHandler();
      const confirmedHandler = getConfirmedHandler();

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
      expect(mockUnsubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        statusHandler,
      );
      expect(mockUnsubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionConfirmed',
        confirmedHandler,
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
    it('shows success toast when transactionConfirmed event fires', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getConfirmedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.confirmed,
      );

      // transactionConfirmed event receives transactionMeta directly (not wrapped)
      handler(transactionMeta);

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        mockEarnToastOptions.mUsdConversion.success,
      );
    });

    it('prevents duplicate success toast for same transaction', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getConfirmedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.confirmed,
      );

      handler(transactionMeta);
      handler(transactionMeta);

      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('cleans up toast tracking entries after 5 seconds for confirmed status', () => {
      renderHook(() => useMusdConversionStatus());

      const statusHandler = getSubscribedHandler();
      const confirmedHandler = getConfirmedHandler();
      const transactionId = 'test-transaction-1';
      const approvedMeta = createTransactionMeta(
        TransactionStatus.approved,
        transactionId,
      );
      const confirmedMeta = createTransactionMeta(
        TransactionStatus.confirmed,
        transactionId,
      );

      statusHandler({ transactionMeta: approvedMeta });
      confirmedHandler(confirmedMeta);

      expect(mockShowToast).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(5000);

      // After cleanup, should be able to show toasts again for same transaction
      statusHandler({ transactionMeta: approvedMeta });
      confirmedHandler(confirmedMeta);

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

      const statusHandler = getSubscribedHandler();
      const confirmedHandler = getConfirmedHandler();
      const transactionId = 'test-transaction-3';
      const approvedMeta = createTransactionMeta(
        TransactionStatus.approved,
        transactionId,
      );
      const confirmedMeta = createTransactionMeta(
        TransactionStatus.confirmed,
        transactionId,
      );

      statusHandler({ transactionMeta: approvedMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(mockInProgressToast);

      confirmedHandler(confirmedMeta);

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

    it('ignores transaction when type is swap (via transactionConfirmed)', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getConfirmedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.confirmed,
        'test-transaction-6',
        'swap' as typeof TransactionType.musdConversion,
      );

      handler(transactionMeta);

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

      const statusHandler = getSubscribedHandler();
      const confirmedHandler = getConfirmedHandler();
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

      statusHandler({ transactionMeta: transaction1Approved });
      statusHandler({ transactionMeta: transaction2Approved });
      confirmedHandler(transaction1Confirmed);
      statusHandler({ transactionMeta: transaction2Failed });

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

      const handler = getConfirmedHandler();
      const transaction1Confirmed = createTransactionMeta(
        TransactionStatus.confirmed,
        'transaction-1',
      );
      const transaction2Confirmed = createTransactionMeta(
        TransactionStatus.confirmed,
        'transaction-2',
      );

      handler(transaction1Confirmed);
      handler(transaction2Confirmed);

      expect(mockShowToast).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(5000);

      // Both transactions should be cleaned up after 5 seconds
      handler(transaction1Confirmed);
      handler(transaction2Confirmed);

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

      const handler = getConfirmedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.confirmed,
      );

      handler(transactionMeta);

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

      const handler = getConfirmedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.confirmed,
        'test-tx-metrics-confirmed',
        TransactionType.musdConversion,
        { chainId, tokenAddress },
      );

      handler(transactionMeta);

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
});
