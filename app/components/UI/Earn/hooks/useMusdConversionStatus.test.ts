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
  const mockShowToast = jest.fn();
  const mockEarnToastOptions: EarnToastOptionsConfig = {
    mUsdConversion: {
      inProgress: {
        variant: ToastVariants.Icon,
        iconName: IconName.Loading,
        hasNoTimeout: false,
        iconColor: '#000000',
        backgroundColor: '#FFFFFF',
        hapticsType: NotificationFeedbackType.Success,
        labelOptions: [{ label: 'In Progress', isBold: true }],
      },
      success: {
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        hasNoTimeout: false,
        iconColor: '#000000',
        backgroundColor: '#FFFFFF',
        hapticsType: NotificationFeedbackType.Success,
        labelOptions: [{ label: 'Success', isBold: true }],
      },
      failed: {
        variant: ToastVariants.Icon,
        iconName: IconName.Danger,
        hasNoTimeout: false,
        iconColor: '#000000',
        backgroundColor: '#FFFFFF',
        hapticsType: NotificationFeedbackType.Error,
        labelOptions: [{ label: 'Failed', isBold: true }],
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseEarnToasts.mockReturnValue({
      showToast: mockShowToast,
      EarnToastOptions: mockEarnToastOptions,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  const createTransactionMeta = (
    status: TransactionStatus,
    transactionId = 'test-transaction-1',
    type = TransactionType.musdConversion,
  ): TransactionMeta => ({
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
  });

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
      expect(mockSubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionStatusUpdated',
        expect.any(Function),
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

  describe('submitted transaction status', () => {
    it('shows in-progress toast when transaction status is submitted', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.submitted,
      );

      handler({ transactionMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        mockEarnToastOptions.mUsdConversion.inProgress,
      );
    });

    it('prevents duplicate in-progress toast for same transaction', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(
        TransactionStatus.submitted,
      );

      handler({ transactionMeta });
      handler({ transactionMeta });
      handler({ transactionMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
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
      const submittedMeta = createTransactionMeta(
        TransactionStatus.submitted,
        transactionId,
      );
      const confirmedMeta = createTransactionMeta(
        TransactionStatus.confirmed,
        transactionId,
      );

      handler({ transactionMeta: submittedMeta });
      handler({ transactionMeta: confirmedMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(5000);

      // After cleanup, should be able to show toasts again for same transaction
      handler({ transactionMeta: submittedMeta });
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
      const submittedMeta = createTransactionMeta(
        TransactionStatus.submitted,
        transactionId,
      );
      const failedMeta = createTransactionMeta(
        TransactionStatus.failed,
        transactionId,
      );

      handler({ transactionMeta: submittedMeta });
      handler({ transactionMeta: failedMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(5000);

      // After cleanup, should be able to show toasts again for same transaction
      handler({ transactionMeta: submittedMeta });
      handler({ transactionMeta: failedMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(4);
    });
  });

  describe('transaction flow from submitted to final status', () => {
    it('shows both in-progress and success toasts for transaction flow', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionId = 'test-transaction-3';
      const submittedMeta = createTransactionMeta(
        TransactionStatus.submitted,
        transactionId,
      );
      const confirmedMeta = createTransactionMeta(
        TransactionStatus.confirmed,
        transactionId,
      );

      handler({ transactionMeta: submittedMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        mockEarnToastOptions.mUsdConversion.inProgress,
      );

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
      const submittedMeta = createTransactionMeta(
        TransactionStatus.submitted,
        transactionId,
      );
      const failedMeta = createTransactionMeta(
        TransactionStatus.failed,
        transactionId,
      );

      handler({ transactionMeta: submittedMeta });

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        mockEarnToastOptions.mUsdConversion.inProgress,
      );

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
        TransactionStatus.submitted,
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

    it('ignores transaction when status is approved', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(TransactionStatus.approved);

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

    it('ignores transaction when status is rejected', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transactionMeta = createTransactionMeta(TransactionStatus.rejected);

      handler({ transactionMeta });

      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('multiple concurrent transactions', () => {
    it('tracks and shows toasts for different transactions independently', () => {
      renderHook(() => useMusdConversionStatus());

      const handler = getSubscribedHandler();
      const transaction1Submitted = createTransactionMeta(
        TransactionStatus.submitted,
        'transaction-1',
      );
      const transaction2Submitted = createTransactionMeta(
        TransactionStatus.submitted,
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

      handler({ transactionMeta: transaction1Submitted });
      handler({ transactionMeta: transaction2Submitted });
      handler({ transactionMeta: transaction1Confirmed });
      handler({ transactionMeta: transaction2Failed });

      expect(mockShowToast).toHaveBeenCalledTimes(4);
      expect(mockShowToast).toHaveBeenNthCalledWith(
        1,
        mockEarnToastOptions.mUsdConversion.inProgress,
      );
      expect(mockShowToast).toHaveBeenNthCalledWith(
        2,
        mockEarnToastOptions.mUsdConversion.inProgress,
      );
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
      const transactionMeta = createTransactionMeta(
        TransactionStatus.submitted,
      );

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
});
