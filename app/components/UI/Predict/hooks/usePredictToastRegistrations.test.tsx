import { act, renderHook } from '@testing-library/react-hooks';

import Routes from '../../../../constants/navigation/Routes';

import { usePredictToastRegistrations } from './usePredictToastRegistrations';
import { selectSingleTokenByAddressAndChainId } from '../../../../selectors/tokensController';
import { selectTickerByChainId } from '../../../../selectors/networkController';

const mockInvalidateQueries = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

const mockDeposit = jest.fn();
const mockClaim = jest.fn();
const mockWithdraw = jest.fn();
const mockNavigate = jest.fn();

let mockWithdrawTransaction: { amount: number } | undefined = {
  amount: 123.45,
};
const selectedAddress = '0x1234567890123456789012345678901234567890';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../util/theme', () => ({
  useAppThemeFromContext: () => ({
    colors: {
      success: { default: '#00ff00' },
      error: { default: '#ff0000' },
      accent04: { normal: '#ffffff' },
    },
  }),
}));

jest.mock('./usePredictDeposit', () => ({
  usePredictDeposit: () => ({
    deposit: mockDeposit,
  }),
}));

jest.mock('./usePredictClaim', () => ({
  usePredictClaim: () => ({
    claim: mockClaim,
  }),
}));

jest.mock('./usePredictWithdraw', () => ({
  usePredictWithdraw: () => ({
    withdraw: mockWithdraw,
    withdrawTransaction: mockWithdrawTransaction,
  }),
}));

jest.mock('../utils/accounts', () => ({
  getEvmAccountFromSelectedAccountGroup: jest.fn(() => ({
    address: selectedAddress,
  })),
}));

jest.mock('../../../../store', () => ({
  store: {
    getState: jest.fn(() => ({})),
  },
}));

jest.mock('../../../../selectors/tokensController', () => ({
  selectSingleTokenByAddressAndChainId: jest.fn(() => undefined),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectTickerByChainId: jest.fn(() => undefined),
}));

describe('usePredictToastRegistrations', () => {
  const showToast = jest.fn();

  const getHandler = () => {
    const { result } = renderHook(() => usePredictToastRegistrations());

    return result.current[0].handler;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockWithdrawTransaction = { amount: 123.45 };

    mockDeposit.mockResolvedValue(undefined);
    mockClaim.mockResolvedValue(undefined);
    mockWithdraw.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns registrations array with predict transaction status event name', () => {
    const { result } = renderHook(() => usePredictToastRegistrations());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].eventName).toBe(
      'PredictController:transactionStatusChanged',
    );
  });

  describe('deposit transactions', () => {
    it('shows pending toast on approved status', () => {
      const handler = getHandler();

      handler(
        {
          type: 'deposit',
          status: 'approved',
          transactionId: 'tx-1',
          senderAddress: selectedAddress,
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          iconName: 'Loading',
          closeButtonOptions: expect.objectContaining({
            onPress: expect.any(Function),
          }),
          startAccessory: expect.any(Object),
        }),
      );

      const onTrack = showToast.mock.calls[0][0].closeButtonOptions.onPress;
      onTrack();
      jest.advanceTimersByTime(100);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTION_DETAILS, {
        transactionId: 'tx-1',
      });
    });

    it('shows success toast on confirmed status', () => {
      const handler = getHandler();

      handler(
        {
          type: 'deposit',
          status: 'confirmed',
          amount: 102,
          senderAddress: selectedAddress,
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          iconName: 'Confirmation',
        }),
      );
      expect(mockInvalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['predict', 'balance'],
        }),
      );
    });

    it('uses account ready fallback when deposit confirmed amount is missing', () => {
      const handler = getHandler();

      handler(
        {
          type: 'deposit',
          status: 'confirmed',
          senderAddress: selectedAddress,
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringContaining(
                'predict.deposit.account_ready_description:{"amount":"predict.deposit.account_ready"}',
              ),
            }),
          ]),
        }),
      );
    });

    it('shows error toast with retry on failed status', async () => {
      const handler = getHandler();

      handler(
        {
          type: 'deposit',
          status: 'failed',
          senderAddress: selectedAddress,
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          iconName: 'Error',
          linkButtonOptions: expect.objectContaining({
            onPress: expect.any(Function),
          }),
        }),
      );

      const onRetry = showToast.mock.calls[0][0].linkButtonOptions.onPress;
      await act(async () => {
        await onRetry();
      });

      expect(mockDeposit).toHaveBeenCalledTimes(1);
    });

    it('shows deposit error toast without retry when sender differs from selected account', () => {
      const handler = getHandler();

      handler(
        {
          type: 'deposit',
          status: 'failed',
          senderAddress: '0xabc0000000000000000000000000000000000000',
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.not.objectContaining({
          linkButtonOptions: expect.anything(),
        }),
      );
    });

    it('does not show toast on rejected status', () => {
      const handler = getHandler();

      handler(
        {
          type: 'deposit',
          status: 'rejected',
        },
        showToast,
      );

      expect(showToast).not.toHaveBeenCalled();
      expect(mockInvalidateQueries).not.toHaveBeenCalled();
    });
  });

  describe('claim transactions', () => {
    it('shows pending toast on approved status', () => {
      const handler = getHandler();

      handler(
        {
          type: 'claim',
          status: 'approved',
          amount: 55.12,
          senderAddress: selectedAddress,
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringContaining('$55.12'),
            }),
          ]),
          iconName: 'Loading',
          startAccessory: expect.any(Object),
        }),
      );
    });

    it('shows success toast on confirmed status', () => {
      const handler = getHandler();

      handler(
        {
          type: 'claim',
          status: 'confirmed',
          amount: 45.5,
          senderAddress: selectedAddress,
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringContaining('$45.50'),
            }),
          ]),
          iconName: 'Confirmation',
        }),
      );
      expect(mockInvalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['predict', 'balance'],
        }),
      );
    });

    it('shows error toast with retry on failed status', async () => {
      const handler = getHandler();

      handler(
        {
          type: 'claim',
          status: 'failed',
          senderAddress: selectedAddress,
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          iconName: 'Error',
          linkButtonOptions: expect.objectContaining({
            onPress: expect.any(Function),
          }),
        }),
      );

      const onRetry = showToast.mock.calls[0][0].linkButtonOptions.onPress;
      await act(async () => {
        await onRetry();
      });

      expect(mockClaim).toHaveBeenCalledTimes(1);
    });

    it('shows claim error toast without retry when sender differs from selected account', () => {
      const handler = getHandler();

      handler(
        {
          type: 'claim',
          status: 'failed',
          senderAddress: '0xabc0000000000000000000000000000000000000',
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.not.objectContaining({
          linkButtonOptions: expect.anything(),
        }),
      );
    });
  });

  describe('withdraw transactions', () => {
    it('shows pending toast on approved status', () => {
      const handler = getHandler();

      handler(
        {
          type: 'withdraw',
          status: 'approved',
          senderAddress: selectedAddress,
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          iconName: 'Loading',
          startAccessory: expect.any(Object),
        }),
      );
    });

    it('shows success toast on confirmed status', () => {
      const handler = getHandler();

      handler(
        {
          type: 'withdraw',
          status: 'confirmed',
          senderAddress: selectedAddress,
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          iconName: 'Confirmation',
        }),
      );
      expect(mockInvalidateQueries).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['predict', 'balance'],
        }),
      );
    });

    it('uses payload amount for withdraw success toast when state amount is unavailable', () => {
      mockWithdrawTransaction = undefined;
      const handler = getHandler();

      handler(
        {
          type: 'withdraw',
          status: 'confirmed',
          senderAddress: selectedAddress,
          amount: 55.12,
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringContaining('$55.12'),
            }),
          ]),
        }),
      );
    });

    it('resolves destination token symbol for post-quote withdraw toast', () => {
      (selectSingleTokenByAddressAndChainId as jest.Mock).mockReturnValue({
        symbol: 'USDT',
      });

      const handler = getHandler();

      handler(
        {
          type: 'withdraw',
          status: 'confirmed',
          senderAddress: selectedAddress,
          amount: 0.5,
          targetFiat: 0.42,
          destinationChainId: '0x38',
          destinationTokenAddress: '0x55d398326f99059ff775485246999027b3197955',
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringContaining('$0.42'),
            }),
            expect.objectContaining({
              label: expect.stringContaining('USDT'),
            }),
          ]),
        }),
      );
    });

    it('falls back to native ticker when destination token not found', () => {
      (selectSingleTokenByAddressAndChainId as jest.Mock).mockReturnValue(
        undefined,
      );
      (selectTickerByChainId as jest.Mock).mockReturnValue('BNB');

      const handler = getHandler();

      handler(
        {
          type: 'withdraw',
          status: 'confirmed',
          senderAddress: selectedAddress,
          amount: 0.5,
          targetFiat: 0.43,
          destinationChainId: '0x38',
          destinationTokenAddress: '0x0000000000000000000000000000000000000000',
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          labelOptions: expect.arrayContaining([
            expect.objectContaining({
              label: expect.stringContaining('$0.43'),
            }),
            expect.objectContaining({
              label: expect.stringContaining('BNB'),
            }),
          ]),
        }),
      );
    });

    it('shows error toast with retry on failed status', async () => {
      const handler = getHandler();

      handler(
        {
          type: 'withdraw',
          status: 'failed',
          senderAddress: selectedAddress,
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          iconName: 'Error',
          linkButtonOptions: expect.objectContaining({
            onPress: expect.any(Function),
          }),
        }),
      );

      const onRetry = showToast.mock.calls[0][0].linkButtonOptions.onPress;
      await act(async () => {
        await onRetry();
      });

      expect(mockWithdraw).toHaveBeenCalledTimes(1);
    });

    it('shows withdraw error toast without retry when sender differs from selected account', () => {
      const handler = getHandler();

      handler(
        {
          type: 'withdraw',
          status: 'failed',
          senderAddress: '0xabc0000000000000000000000000000000000000',
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.not.objectContaining({
          linkButtonOptions: expect.anything(),
        }),
      );
    });

    it('does not show toast on rejected status', () => {
      const handler = getHandler();

      handler(
        {
          type: 'withdraw',
          status: 'rejected',
        },
        showToast,
      );

      expect(showToast).not.toHaveBeenCalled();
    });
  });
});
