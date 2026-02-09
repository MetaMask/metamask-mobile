import { act, renderHook } from '@testing-library/react-hooks';

import Routes from '../../../../constants/navigation/Routes';

import { usePredictToastRegistrations } from './usePredictToastRegistrations';

const mockDeposit = jest.fn();
const mockClaim = jest.fn();
const mockWithdraw = jest.fn();
const mockNavigate = jest.fn();
const mockUseSelector = jest.fn();

let mockWonPositions = [{ currentValue: 100 }, { currentValue: 50 }];

let mockWithdrawTransaction = { amount: 123.45 };

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

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (...args: unknown[]) => mockUseSelector(...args),
}));

jest.mock('../selectors/predictController', () => ({
  selectPredictWonPositions: jest.fn(() => jest.fn(() => mockWonPositions)),
}));

jest.mock('../utils/accounts', () => ({
  getEvmAccountFromSelectedAccountGroup: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
  })),
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

    mockWonPositions = [{ currentValue: 100 }, { currentValue: 50 }];
    mockWithdrawTransaction = { amount: 123.45 };
    mockUseSelector.mockImplementation(
      (selector: (state: unknown) => unknown) => selector({}),
    );

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
          transactionMeta: { id: 'tx-1' },
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
          transactionMeta: {
            metamaskPay: {
              totalFiat: '$110',
              bridgeFeeFiat: '$5',
              networkFeeFiat: '$3',
            },
          },
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          iconName: 'Confirmation',
        }),
      );
    });

    it('shows error toast with retry on failed status', async () => {
      const handler = getHandler();

      handler(
        {
          type: 'deposit',
          status: 'failed',
          transactionMeta: {},
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

    it('does not show toast on rejected status', () => {
      const handler = getHandler();

      handler(
        {
          type: 'deposit',
          status: 'rejected',
          transactionMeta: {},
        },
        showToast,
      );

      expect(showToast).not.toHaveBeenCalled();
    });
  });

  describe('claim transactions', () => {
    it('shows pending toast on approved status', () => {
      const handler = getHandler();

      handler(
        {
          type: 'claim',
          status: 'approved',
          transactionMeta: {},
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
          type: 'claim',
          status: 'confirmed',
          transactionMeta: {},
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          iconName: 'Confirmation',
        }),
      );
    });

    it('shows error toast with retry on failed status', async () => {
      const handler = getHandler();

      handler(
        {
          type: 'claim',
          status: 'failed',
          transactionMeta: {},
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
  });

  describe('withdraw transactions', () => {
    it('shows pending toast on approved status', () => {
      const handler = getHandler();

      handler(
        {
          type: 'withdraw',
          status: 'approved',
          transactionMeta: {},
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
          transactionMeta: {},
        },
        showToast,
      );

      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          iconName: 'Confirmation',
        }),
      );
    });

    it('shows error toast with retry on failed status', async () => {
      const handler = getHandler();

      handler(
        {
          type: 'withdraw',
          status: 'failed',
          transactionMeta: {},
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

    it('does not show toast on rejected status', () => {
      const handler = getHandler();

      handler(
        {
          type: 'withdraw',
          status: 'rejected',
          transactionMeta: {},
        },
        showToast,
      );

      expect(showToast).not.toHaveBeenCalled();
    });
  });
});
