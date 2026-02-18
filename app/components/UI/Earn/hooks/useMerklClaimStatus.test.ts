import {
  TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import { renderHook, act } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine';
import { useMerklClaimStatus } from './useMerklClaimStatus';
import useEarnToasts, { EarnToastOptionsConfig } from './useEarnToasts';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { NotificationFeedbackType } from 'expo-haptics';
import { MERKL_CLAIM_ORIGIN } from '../components/MerklRewards/constants';
import Logger from '../../../../util/Logger';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { getUnclaimedAmountForMerklClaimTx } from '../utils/musd';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import { useSelector } from 'react-redux';

// Mock all external dependencies
jest.mock('../../../../core/Engine');
jest.mock('./useEarnToasts');
jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));
jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));
jest.mock('../utils/musd', () => ({
  getUnclaimedAmountForMerklClaimTx: jest.fn(),
}));
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

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
const mockUseAnalytics = jest.mocked(useAnalytics);
const mockGetUnclaimedAmountForMerklClaimTx = jest.mocked(
  getUnclaimedAmountForMerklClaimTx,
);
const mockLoggerError = jest.mocked(Logger.error);
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockUseSelector = jest.mocked(useSelector);

// Mock controller methods
const mockUpdateBalances = jest.fn().mockResolvedValue(undefined);
const mockDetectTokens = jest.fn().mockResolvedValue(undefined);
const mockRefresh = jest.fn().mockResolvedValue(undefined);

Object.defineProperty(Engine, 'controllerMessenger', {
  value: {
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(Engine, 'context', {
  value: {
    TokenBalancesController: {
      updateBalances: mockUpdateBalances,
    },
    TokenDetectionController: {
      detectTokens: mockDetectTokens,
    },
    AccountTrackerController: {
      refresh: mockRefresh,
    },
    NetworkController: {
      state: {
        networkConfigurationsByChainId: {
          '0x1': {
            rpcEndpoints: [{ networkClientId: 'mainnet' }],
            defaultRpcEndpointIndex: 0,
          },
        },
      },
    },
  },
  writable: true,
  configurable: true,
});

describe('useMerklClaimStatus', () => {
  const mockShowToast = jest.fn();
  const mockInProgressToast = {
    variant: ToastVariants.Icon as const,
    iconName: IconName.Loading,
    hasNoTimeout: true,
    iconColor: '#000000',
    backgroundColor: '#FFFFFF',
    hapticsType: NotificationFeedbackType.Warning,
    labelOptions: [{ label: 'Claiming bonus', isBold: true }],
  };
  const mockSuccessToast = {
    variant: ToastVariants.Icon as const,
    iconName: IconName.CheckBold,
    hasNoTimeout: false,
    iconColor: '#00FF00',
    backgroundColor: '#FFFFFF',
    hapticsType: NotificationFeedbackType.Success,
    labelOptions: [{ label: 'Your mUSD is here!', isBold: true }],
  };
  const mockFailedToast = {
    variant: ToastVariants.Icon as const,
    iconName: IconName.CircleX,
    hasNoTimeout: false,
    iconColor: '#FF0000',
    backgroundColor: '#FFFFFF',
    hapticsType: NotificationFeedbackType.Error,
    labelOptions: [{ label: 'Bonus claim failed', isBold: true }],
  };
  const mockEarnToastOptions: EarnToastOptionsConfig = {
    mUsdConversion: {
      inProgress: jest.fn(),
      success: mockSuccessToast,
      failed: mockFailedToast,
    },
    bonusClaim: {
      inProgress: mockInProgressToast,
      success: mockSuccessToast,
      failed: mockFailedToast,
    },
  };

  const createMockEventBuilder = () => {
    const builder = {
      addProperties: jest.fn(),
      build: jest.fn(),
    };

    builder.addProperties.mockImplementation((properties) => {
      builder.build.mockReturnValue({
        event: MetaMetricsEvents.MUSD_CLAIM_BONUS_STATUS_UPDATED,
        properties,
      });
      return builder;
    });

    return builder;
  };

  const flushAsyncWork = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  const getTrackedProperties = (callIndex: number): Record<string, unknown> => {
    const trackedEvent = mockTrackEvent.mock.calls[callIndex]?.[0] as {
      properties?: Record<string, unknown>;
    };
    return trackedEvent?.properties ?? {};
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEarnToasts.mockReturnValue({
      showToast: mockShowToast,
      EarnToastOptions: mockEarnToastOptions,
    });
    mockUpdateBalances.mockResolvedValue(undefined);
    mockDetectTokens.mockResolvedValue(undefined);
    mockRefresh.mockResolvedValue(undefined);
    mockUseSelector.mockReturnValue({
      '0x1': { name: 'Ethereum Mainnet' },
      '0xe708': { name: 'Linea Mainnet' },
    } as unknown as ReturnType<typeof useSelector>);
    mockCreateEventBuilder.mockImplementation(createMockEventBuilder);
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as unknown as ReturnType<typeof useAnalytics>);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const createMockTransactionMeta = (
    overrides: Partial<TransactionMeta>,
  ): TransactionMeta =>
    ({
      id: 'tx-123',
      origin: MERKL_CLAIM_ORIGIN,
      status: TransactionStatus.approved,
      time: Date.now(),
      txParams: {
        from: '0x1234567890abcdef1234567890abcdef12345678',
        to: '0xabcdef1234567890abcdef1234567890abcdef12',
        value: '0x0',
        data: '0x',
      },
      chainId: '0x1',
      ...overrides,
    }) as TransactionMeta;

  it('subscribes to transactionStatusUpdated on mount', () => {
    renderHook(() => useMerklClaimStatus());

    expect(mockSubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionStatusUpdated',
      expect.any(Function),
    );
  });

  it('unsubscribes from transactionStatusUpdated on unmount', () => {
    const { unmount } = renderHook(() => useMerklClaimStatus());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionStatusUpdated',
      expect.any(Function),
    );
  });

  it('ignores transactions with non-merkl-claim origin', () => {
    renderHook(() => useMerklClaimStatus());

    const handler = mockSubscribe.mock.calls[0][1];
    const transactionMeta = createMockTransactionMeta({
      origin: 'other-origin',
      status: TransactionStatus.approved,
    });

    handler({ transactionMeta });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('shows in-progress toast when transaction status is approved', () => {
    renderHook(() => useMerklClaimStatus());

    const handler = mockSubscribe.mock.calls[0][1];
    const transactionMeta = createMockTransactionMeta({
      status: TransactionStatus.approved,
    });

    handler({ transactionMeta });

    expect(mockShowToast).toHaveBeenCalledWith(mockInProgressToast);
  });

  it('shows success toast when transaction status is confirmed', () => {
    renderHook(() => useMerklClaimStatus());

    const handler = mockSubscribe.mock.calls[0][1];
    const transactionMeta = createMockTransactionMeta({
      status: TransactionStatus.confirmed,
    });

    handler({ transactionMeta });

    expect(mockShowToast).toHaveBeenCalledWith(mockSuccessToast);
  });

  it('shows failed toast when transaction status is failed', () => {
    renderHook(() => useMerklClaimStatus());

    const handler = mockSubscribe.mock.calls[0][1];
    const transactionMeta = createMockTransactionMeta({
      status: TransactionStatus.failed,
    });

    handler({ transactionMeta });

    expect(mockShowToast).toHaveBeenCalledWith(mockFailedToast);
  });

  it('prevents duplicate toasts for the same transaction status', () => {
    renderHook(() => useMerklClaimStatus());

    const handler = mockSubscribe.mock.calls[0][1];
    const transactionMeta = createMockTransactionMeta({
      id: 'tx-duplicate-test',
      status: TransactionStatus.approved,
    });

    handler({ transactionMeta });
    handler({ transactionMeta });

    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });

  it('allows different toasts for different transaction statuses', () => {
    renderHook(() => useMerklClaimStatus());

    const handler = mockSubscribe.mock.calls[0][1];
    const approvedTx = createMockTransactionMeta({
      id: 'tx-multi-status',
      status: TransactionStatus.approved,
    });
    const confirmedTx = createMockTransactionMeta({
      id: 'tx-multi-status',
      status: TransactionStatus.confirmed,
    });

    handler({ transactionMeta: approvedTx });
    handler({ transactionMeta: confirmedTx });

    expect(mockShowToast).toHaveBeenCalledTimes(2);
    expect(mockShowToast).toHaveBeenNthCalledWith(1, mockInProgressToast);
    expect(mockShowToast).toHaveBeenNthCalledWith(2, mockSuccessToast);
  });

  it('does not show toast for other transaction statuses', () => {
    renderHook(() => useMerklClaimStatus());

    const handler = mockSubscribe.mock.calls[0][1];
    const transactionMeta = createMockTransactionMeta({
      status: TransactionStatus.submitted,
    });

    handler({ transactionMeta });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('refreshes token balances when transaction is confirmed', async () => {
    renderHook(() => useMerklClaimStatus());

    const handler = mockSubscribe.mock.calls[0][1];
    const transactionMeta = createMockTransactionMeta({
      status: TransactionStatus.confirmed,
      chainId: '0x1',
    });

    await act(async () => {
      handler({ transactionMeta });
    });

    expect(mockUpdateBalances).toHaveBeenCalledWith({ chainIds: ['0x1'] });
    expect(mockDetectTokens).toHaveBeenCalledWith({ chainIds: ['0x1'] });
    expect(mockRefresh).toHaveBeenCalledWith(['mainnet']);
  });

  it('does not refresh token balances when transaction is dropped', async () => {
    renderHook(() => useMerklClaimStatus());

    const handler = mockSubscribe.mock.calls[0][1];
    const transactionMeta = createMockTransactionMeta({
      status: TransactionStatus.dropped,
      chainId: '0x1',
    });

    await act(async () => {
      handler({ transactionMeta });
    });

    expect(mockUpdateBalances).not.toHaveBeenCalled();
    expect(mockDetectTokens).not.toHaveBeenCalled();
  });

  it('does not refresh token balances when transaction fails', async () => {
    renderHook(() => useMerklClaimStatus());

    const handler = mockSubscribe.mock.calls[0][1];
    const transactionMeta = createMockTransactionMeta({
      status: TransactionStatus.failed,
      chainId: '0x1',
    });

    await act(async () => {
      handler({ transactionMeta });
    });

    expect(mockUpdateBalances).not.toHaveBeenCalled();
    expect(mockDetectTokens).not.toHaveBeenCalled();
  });

  it('shows failed toast when transaction is dropped', () => {
    renderHook(() => useMerklClaimStatus());

    const handler = mockSubscribe.mock.calls[0][1];
    const transactionMeta = createMockTransactionMeta({
      status: TransactionStatus.dropped,
    });

    handler({ transactionMeta });

    expect(mockShowToast).toHaveBeenCalledWith(mockFailedToast);
  });

  it('tracks approved bonus claim event with amount_claimed_decimal', async () => {
    const transactionMeta = createMockTransactionMeta({
      id: 'tx-analytics-approved',
      status: TransactionStatus.approved,
    });
    mockGetUnclaimedAmountForMerklClaimTx.mockResolvedValue({
      totalAmountRaw: '100000',
      unclaimedRaw: '100000',
      contractCallSucceeded: true,
    });
    renderHook(() => useMerklClaimStatus());
    const handler = mockSubscribe.mock.calls[0][1];

    handler({ transactionMeta });
    await flushAsyncWork();

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.MUSD_CLAIM_BONUS_STATUS_UPDATED,
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(getTrackedProperties(0)).toMatchObject({
      transaction_id: 'tx-analytics-approved',
      transaction_status: TransactionStatus.approved,
      amount_claimed_decimal: '0.1',
    });
  });

  it('tracks confirmed bonus claim event with cached amount_claimed_decimal', async () => {
    const transactionId = 'tx-analytics-cached';
    const approvedTransactionMeta = createMockTransactionMeta({
      id: transactionId,
      status: TransactionStatus.approved,
    });
    const confirmedTransactionMeta = createMockTransactionMeta({
      id: transactionId,
      status: TransactionStatus.confirmed,
    });
    mockGetUnclaimedAmountForMerklClaimTx.mockResolvedValue({
      totalAmountRaw: '100000',
      unclaimedRaw: '100000',
      contractCallSucceeded: true,
    });
    renderHook(() => useMerklClaimStatus());
    const handler = mockSubscribe.mock.calls[0][1];

    handler({ transactionMeta: approvedTransactionMeta });
    await flushAsyncWork();
    handler({ transactionMeta: confirmedTransactionMeta });
    await flushAsyncWork();

    expect(mockGetUnclaimedAmountForMerklClaimTx).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(getTrackedProperties(1)).toMatchObject({
      transaction_id: transactionId,
      transaction_status: TransactionStatus.confirmed,
      amount_claimed_decimal: '0.1',
    });
  });

  it('tracks bonus claim event without amount_claimed_decimal when contract call fails', async () => {
    const transactionMeta = createMockTransactionMeta({
      id: 'tx-analytics-partial',
      status: TransactionStatus.approved,
    });
    mockGetUnclaimedAmountForMerklClaimTx.mockResolvedValue({
      totalAmountRaw: '100000',
      unclaimedRaw: '100000',
      contractCallSucceeded: false,
      error: new Error('contract call failed'),
    });
    renderHook(() => useMerklClaimStatus());
    const handler = mockSubscribe.mock.calls[0][1];

    handler({ transactionMeta });
    await flushAsyncWork();

    expect(mockLoggerError).toHaveBeenCalled();
    expect(getTrackedProperties(0)).toMatchObject({
      transaction_id: 'tx-analytics-partial',
      transaction_status: TransactionStatus.approved,
    });
    expect(getTrackedProperties(0)).not.toHaveProperty(
      'amount_claimed_decimal',
    );
  });
});
