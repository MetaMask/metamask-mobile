import { Alert } from 'react-native';
import { waitFor } from '@testing-library/react-native';
import { errorCodes } from '@metamask/rpc-errors';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  ACCOUNT_ADDRESS_MOCK_1,
  ACCOUNT_ADDRESS_MOCK_2,
  evmSendStateMock,
  solanaSendStateMock,
  SOLANA_ASSET,
} from '../../__mocks__/send.mock';
import { useSendContext } from '../../context/send-context';
// eslint-disable-next-line import-x/no-namespace
import * as SendUtils from '../../utils/send';
// eslint-disable-next-line import-x/no-namespace
import * as SendExitMetrics from './metrics/useSendExitMetrics';
// eslint-disable-next-line import-x/no-namespace
import * as MultichainSnaps from '../../utils/multichain-snaps';
// eslint-disable-next-line import-x/no-namespace
import * as SendType from './useSendType';
import { useSendMetricsContext } from '../../context/send-context/send-metrics-context';
import { NonEvmSendUnknownValue } from './metrics/useNonEvmSendMetrics';
import { useMaxAmount } from './usePercentageAmount';
import { useSendActions } from './useSendActions';

jest.mock('../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

const mockUseSendMetricsContext = useSendMetricsContext as jest.MockedFunction<
  typeof useSendMetricsContext
>;

const mockTrackEvent = jest.fn();
jest.mock('../../context/send-context/send-metrics-context', () => ({
  useSendMetricsContext: jest.fn(() => ({
    chainIdCaip: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  })),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => {
  const { AnalyticsEventBuilder } = jest.requireActual(
    '../../../../../util/analytics/AnalyticsEventBuilder',
  );
  return {
    useAnalytics: () => ({
      trackEvent: mockTrackEvent,
      createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
    }),
  };
});

const trackedEventNames = () =>
  mockTrackEvent.mock.calls.map(([event]) => event.name);

const trackedEventProperties = (eventName: string) =>
  mockTrackEvent.mock.calls.find(([event]) => event.name === eventName)?.[0]
    .properties;

jest.mock('./usePercentageAmount', () => ({
  useMaxAmount: jest.fn(),
}));

const mockUseSendContext = useSendContext as jest.MockedFunction<
  typeof useSendContext
>;
const mockUseMaxAmount = jest.mocked(useMaxAmount);

const mockGoBack = jest.fn();
const mockParentGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    getParent: () => ({
      goBack: mockParentGoBack,
    }),
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {
      asset: {
        chainId: '0x1',
      },
    },
    name: 'send_route',
  }),
}));

const mockAlert = jest.fn();
Alert.alert = mockAlert;

const mockState = {
  state: evmSendStateMock,
};

describe('useSendActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackEvent.mockClear();
    mockUseMaxAmount.mockReturnValue({
      getMaxAmount: jest.fn().mockResolvedValue('1'),
    } as unknown as ReturnType<typeof useMaxAmount>);
    mockUseSendContext.mockReturnValue({
      asset: {
        chainId: '0x1',
        address: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        decimals: 2,
        isNative: true,
      },
      chainId: '0x1',
      from: ACCOUNT_ADDRESS_MOCK_1,
    } as unknown as ReturnType<typeof useSendContext>);
  });

  it('return function submitSend, cancelSend', () => {
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    expect(result.current.handleSubmitPress).toBeDefined();
    expect(result.current.handleCancelPress).toBeDefined();
  });

  it('calls navigation.navigate with correct params when evm ', async () => {
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    jest.spyOn(SendUtils, 'submitEvmTransaction').mockImplementation(jest.fn());
    await result.current.handleSubmitPress();
    expect(mockNavigate).toHaveBeenCalledWith('RedesignedConfirmations', {
      params: { maxValueMode: undefined },
      loader: 'transfer',
    });
  });

  it('recalculates a native max send with the selected recipient before submitting', async () => {
    const getMaxAmount = jest.fn().mockResolvedValue('8.5');
    mockUseMaxAmount.mockReturnValue({
      getMaxAmount,
    } as unknown as ReturnType<typeof useMaxAmount>);
    mockUseSendContext.mockReturnValue({
      asset: {
        chainId: '0x1',
        address: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        decimals: 2,
        isNative: true,
      },
      chainId: '0x1',
      from: ACCOUNT_ADDRESS_MOCK_1,
      maxValueMode: true,
      value: '9',
    } as unknown as ReturnType<typeof useSendContext>);
    const submitSpy = jest
      .spyOn(SendUtils, 'submitEvmTransaction')
      .mockResolvedValue(undefined);
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );

    await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

    expect(getMaxAmount).toHaveBeenCalledWith(ACCOUNT_ADDRESS_MOCK_2);
    expect(submitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ACCOUNT_ADDRESS_MOCK_2,
        value: '8.5',
      }),
    );
  });

  it('does not submit a native max send when gas estimation is unavailable', async () => {
    mockUseMaxAmount.mockReturnValue({
      getMaxAmount: jest.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useMaxAmount>);
    mockUseSendContext.mockReturnValue({
      asset: {
        chainId: '0x1',
        address: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        decimals: 2,
        isNative: true,
      },
      chainId: '0x1',
      from: ACCOUNT_ADDRESS_MOCK_1,
      maxValueMode: true,
      value: '9',
    } as unknown as ReturnType<typeof useSendContext>);
    const submitSpy = jest
      .spyOn(SendUtils, 'submitEvmTransaction')
      .mockResolvedValue(undefined);
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );

    await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

    expect(submitSpy).not.toHaveBeenCalled();
    expect(mockAlert).toHaveBeenCalledWith('Transaction error');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('normalizes trailing dot values before submitting evm transaction', async () => {
    mockUseSendContext.mockReturnValue({
      asset: {
        chainId: '0x1',
        address: '0x935E73EDb9fF52E23BaC7F7e043A1ecD06d05477',
        decimals: 2,
        isNative: true,
      },
      chainId: '0x1',
      from: ACCOUNT_ADDRESS_MOCK_1,
      value: '0.',
    } as unknown as ReturnType<typeof useSendContext>);

    const submitSpy = jest
      .spyOn(SendUtils, 'submitEvmTransaction')
      .mockImplementation(jest.fn());

    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    await result.current.handleSubmitPress();

    expect(submitSpy).toHaveBeenCalledWith(
      expect.objectContaining({ value: '0' }),
    );
  });

  it('calls navigation.goBack when handleBackPress is invoked', () => {
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    result.current.handleBackPress();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls parent navigation.goBack when handleCancelPress is invoked', () => {
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    result.current.handleCancelPress();
    expect(mockParentGoBack).toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('capture metrics when handleCancelPress is invoked', () => {
    const mockCaptureSendExit = jest.fn();
    jest
      .spyOn(SendExitMetrics, 'useSendExitMetrics')
      .mockReturnValue({ captureSendExit: mockCaptureSendExit });
    const { result } = renderHookWithProvider(
      () => useSendActions(),
      mockState,
    );
    result.current.handleCancelPress();
    expect(mockCaptureSendExit).toHaveBeenCalled();
  });

  describe('non-EVM send error handling', () => {
    beforeEach(() => {
      jest.spyOn(SendType, 'useSendType').mockReturnValue({
        isEvmSendType: false,
        isPredefinedEvm: false,
        isEvmNativeSendType: false,
        isNonEvmNativeSendType: true,
        isNonEvmSendType: true,
        isSolanaSendType: true,
        isPredefinedSolana: false,
        isBitcoinSendType: false,
        isPredefinedBitcoin: false,
        isTronSendType: false,
        isPredefinedTron: false,
        isStellarSendType: false,
        isPredefinedStellar: false,
      });

      mockUseSendContext.mockReturnValue({
        asset: SOLANA_ASSET,
        chainId: SOLANA_ASSET.chainId,
        from: ACCOUNT_ADDRESS_MOCK_2,
        to: ACCOUNT_ADDRESS_MOCK_2,
        value: '10',
        fromAccount: {
          id: 'solana-account-id',
          address: ACCOUNT_ADDRESS_MOCK_2,
          metadata: {
            snap: {
              id: 'npm:@metamask/solana-wallet-snap',
            },
          },
        },
      } as unknown as ReturnType<typeof useSendContext>);
    });

    it('shows alert with translated error for snap validation errors with errors array', async () => {
      jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockResolvedValue({
          valid: false,
          errors: [{ code: 'InsufficientBalance' }],
        });

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Insufficient funds');
        expect(mockNavigate).not.toHaveBeenCalledWith('TransactionsView');
      });

      expect(trackedEventNames()).toStrictEqual(['Send Failed']);
      expect(trackedEventProperties('Send Failed')).toMatchObject({
        failure_phase: 'validation',
        error_code: 'InsufficientBalance',
        client: 'mobile',
      });
    });

    it('records an unknown sentinel rather than undefined when the account has no snap metadata', async () => {
      mockUseSendContext.mockReturnValue({
        asset: SOLANA_ASSET,
        chainId: SOLANA_ASSET.chainId,
        from: ACCOUNT_ADDRESS_MOCK_2,
        to: ACCOUNT_ADDRESS_MOCK_2,
        value: '10',
        fromAccount: {
          id: 'solana-account-id',
          address: ACCOUNT_ADDRESS_MOCK_2,
        },
      } as unknown as ReturnType<typeof useSendContext>);

      jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockResolvedValue({
          valid: false,
          errors: [{ code: 'InsufficientBalance' }],
        });

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Insufficient funds');
      });

      expect(trackedEventProperties('Send Failed')).toMatchObject({
        failure_phase: 'validation',
        error_code: 'InsufficientBalance',
        snap_id: NonEvmSendUnknownValue,
      });
      expect(trackedEventProperties('Send Failed')).not.toHaveProperty(
        'snap_id',
        undefined,
      );
    });

    it('falls back to the send chain id when the metrics context chain id is empty', async () => {
      mockUseSendMetricsContext.mockReturnValueOnce({
        chainIdCaip: '',
      } as unknown as ReturnType<typeof useSendMetricsContext>);

      jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockResolvedValue({
          valid: false,
          errors: [{ code: 'InsufficientBalance' }],
        });

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Insufficient funds');
      });

      // `''` is not nullish, so `??` would have degraded this to the sentinel.
      expect(trackedEventProperties('Send Failed')).toMatchObject({
        chain_id_caip: SOLANA_ASSET.chainId,
      });
    });

    it('shows alert with generic error when valid: false without errors array', async () => {
      jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockResolvedValue({
          valid: false,
          // No errors array - should still show generic error
        });

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Transaction error');
        expect(mockNavigate).not.toHaveBeenCalledWith('TransactionsView');
      });

      expect(trackedEventProperties('Send Failed')).toMatchObject({
        failure_phase: 'validation',
        error_code: 'unknown',
      });
    });

    it('shows alert with translated error for InsufficientBalanceToCoverFee error code', async () => {
      jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockResolvedValue({
          valid: false,
          errors: [{ code: 'InsufficientBalanceToCoverFee' }],
        });

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Insufficient balance to cover fees',
        );
      });
    });

    it('does not show alert on user rejection', async () => {
      const userRejectionError = Object.assign(new Error('User rejected'), {
        code: errorCodes.provider.userRejectedRequest,
      });
      jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockRejectedValue(userRejectionError);

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        expect(mockAlert).not.toHaveBeenCalled();
      });

      // User rejection is classified, not dropped, so the attempt stays countable
      expect(trackedEventNames()).toStrictEqual(['Send Failed']);
      expect(trackedEventProperties('Send Failed')).toMatchObject({
        failure_phase: 'confirmation',
        error_code: 'user_rejected',
      });
    });

    it('shows alert with generic error for snap/internal errors (non-user-rejection)', async () => {
      jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockRejectedValue(
          Object.assign(new Error('Snap execution failed'), { code: -32603 }),
        );

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Transaction error');
      });

      expect(trackedEventNames()).toStrictEqual(['Send Failed']);
      expect(trackedEventProperties('Send Failed')).toMatchObject({
        failure_phase: 'snap_rpc',
        error_code: '-32603',
      });
    });

    it('normalizes trailing dot values before submitting non-evm transaction', async () => {
      mockUseSendContext.mockReturnValue({
        asset: SOLANA_ASSET,
        chainId: SOLANA_ASSET.chainId,
        from: ACCOUNT_ADDRESS_MOCK_2,
        to: ACCOUNT_ADDRESS_MOCK_2,
        value: '0.',
        fromAccount: {
          id: 'solana-account-id',
          address: ACCOUNT_ADDRESS_MOCK_2,
          metadata: {
            snap: {
              id: 'npm:@metamask/solana-wallet-snap',
            },
          },
        },
      } as unknown as ReturnType<typeof useSendContext>);

      const submitSpy = jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockResolvedValue({
          transactionId: 'tx123',
          status: 'submitted',
        });

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        expect(submitSpy).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ amount: '0' }),
        );
      });
    });

    it('navigates to transactions view on successful submission', async () => {
      jest
        .spyOn(MultichainSnaps, 'sendMultichainTransactionForReview')
        .mockResolvedValue({
          transactionId: 'tx123',
          status: 'submitted',
        });

      const { result } = renderHookWithProvider(() => useSendActions(), {
        state: solanaSendStateMock,
      });

      await result.current.handleSubmitPress(ACCOUNT_ADDRESS_MOCK_2);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('TransactionsView');
        expect(mockAlert).not.toHaveBeenCalled();
      });

      // The Snap emits the post-submit lifecycle events itself, so the client
      // does not track a duplicate submit/complete event on success.
      expect(trackedEventNames()).toStrictEqual([]);
    });
  });
});
