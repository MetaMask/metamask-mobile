import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';
import { useDismissOnPaymentChange } from './useDismissOnPaymentChange';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useTransactionPayToken } from './useTransactionPayToken';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('./useTransactionPayData');
jest.mock('./useTransactionPayToken');

const TOKEN_A: TransactionPaymentToken = {
  address: '0x1234567890abcdef1234567890abcdef12345678' as Hex,
  balanceFiat: '$12.34',
  balanceHuman: '12.34',
  balanceRaw: '12340000',
  balanceUsd: '12.34',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDC',
};

const TOKEN_B: TransactionPaymentToken = {
  address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex,
  balanceFiat: '$20.00',
  balanceHuman: '20',
  balanceRaw: '20000000',
  balanceUsd: '20',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'POL',
};

describe('useDismissOnPaymentChange', () => {
  const useNavigationMock = jest.mocked(useNavigation);
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );
  const goBackMock = jest.fn();
  const isFocusedMock = jest.fn().mockReturnValue(true);
  const setPayTokenMock: jest.MockedFn<
    ReturnType<typeof useTransactionPayToken>['setPayToken']
  > = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    isFocusedMock.mockReturnValue(true);

    useNavigationMock.mockReturnValue({
      goBack: goBackMock,
      isFocused: isFocusedMock,
    } as never);

    useTransactionPayTokenMock.mockReturnValue({
      payToken: TOKEN_A,
      setPayToken: setPayTokenMock,
    });

    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);
  });

  describe('initial render', () => {
    it('does not dismiss on initial render', () => {
      renderHook(() => useDismissOnPaymentChange());

      expect(goBackMock).not.toHaveBeenCalled();
    });

    it('does not dismiss when re-rendered with the same values', () => {
      const { rerender } = renderHook(() => useDismissOnPaymentChange());

      rerender();

      expect(goBackMock).not.toHaveBeenCalled();
    });

    it('does not dismiss when the controller re-emits a structurally-equal pay token with a new identity', () => {
      const { rerender } = renderHook(() => useDismissOnPaymentChange());

      useTransactionPayTokenMock.mockReturnValue({
        payToken: { ...TOKEN_A },
        setPayToken: setPayTokenMock,
      });

      rerender();

      expect(goBackMock).not.toHaveBeenCalled();
    });
  });

  describe('pay token changes', () => {
    it('dismisses when the pay token changes to a different token', () => {
      const { rerender } = renderHook(() => useDismissOnPaymentChange());

      useTransactionPayTokenMock.mockReturnValue({
        payToken: TOKEN_B,
        setPayToken: setPayTokenMock,
      });

      rerender();

      expect(goBackMock).toHaveBeenCalledTimes(1);
    });

    it('dismisses when the pay token transitions from defined to undefined', () => {
      const { rerender } = renderHook(() => useDismissOnPaymentChange());

      useTransactionPayTokenMock.mockReturnValue({
        payToken: undefined,
        setPayToken: setPayTokenMock,
      });

      rerender();

      expect(goBackMock).toHaveBeenCalledTimes(1);
    });

    it('dismisses when the pay token transitions from undefined to defined', () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: undefined,
        setPayToken: setPayTokenMock,
      });

      const { rerender } = renderHook(() => useDismissOnPaymentChange());

      useTransactionPayTokenMock.mockReturnValue({
        payToken: TOKEN_A,
        setPayToken: setPayTokenMock,
      });

      rerender();

      expect(goBackMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('fiat selection changes', () => {
    it('dismisses when the fiat selection changes to a different id', () => {
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: 'pm-card',
      });

      const { rerender } = renderHook(() => useDismissOnPaymentChange());

      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: 'pm-apple-pay',
      });

      rerender();

      expect(goBackMock).toHaveBeenCalledTimes(1);
    });

    it('dismisses when the fiat selection transitions from undefined to defined', () => {
      const { rerender } = renderHook(() => useDismissOnPaymentChange());

      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: 'pm-card',
      });

      rerender();

      expect(goBackMock).toHaveBeenCalledTimes(1);
    });

    it('dismisses when the fiat selection transitions from defined to undefined', () => {
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: 'pm-card',
      });

      const { rerender } = renderHook(() => useDismissOnPaymentChange());

      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: undefined,
      });

      rerender();

      expect(goBackMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('atomic multi-field changes (regression for 3-pop cascade)', () => {
    it('fires goBack only once when both payToken and selectedPaymentMethodId change in the same render', () => {
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: 'pm-google-pay',
      });

      const { rerender } = renderHook(() => useDismissOnPaymentChange());

      // Simulates TransactionPayController.updatePaymentToken atomic write:
      //   data.paymentToken = TOKEN_B
      //   data.fiatPayment = {}
      useTransactionPayTokenMock.mockReturnValue({
        payToken: TOKEN_B,
        setPayToken: setPayTokenMock,
      });
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: undefined,
      });

      rerender();

      expect(goBackMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('latch', () => {
    it('does not dismiss again on subsequent pay token changes after the first dismissal', () => {
      const { rerender } = renderHook(() => useDismissOnPaymentChange());

      useTransactionPayTokenMock.mockReturnValue({
        payToken: TOKEN_B,
        setPayToken: setPayTokenMock,
      });

      rerender();

      useTransactionPayTokenMock.mockReturnValue({
        payToken: undefined,
        setPayToken: setPayTokenMock,
      });

      rerender();

      expect(goBackMock).toHaveBeenCalledTimes(1);
    });

    it('does not dismiss again on subsequent fiat selection changes after the first dismissal', () => {
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: 'pm-card',
      });

      const { rerender } = renderHook(() => useDismissOnPaymentChange());

      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: 'pm-apple-pay',
      });

      rerender();

      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: undefined,
      });

      rerender();

      expect(goBackMock).toHaveBeenCalledTimes(1);
    });

    it('does not dismiss again when a fiat change follows a pay token dismissal', () => {
      const { rerender } = renderHook(() => useDismissOnPaymentChange());

      useTransactionPayTokenMock.mockReturnValue({
        payToken: TOKEN_B,
        setPayToken: setPayTokenMock,
      });

      rerender();

      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: 'pm-card',
      });

      rerender();

      expect(goBackMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('focus guard (defers dismissal when an overlapping route is on top)', () => {
    it('does not call goBack when the screen is not focused even if the pay token changes', () => {
      isFocusedMock.mockReturnValue(false);

      const { rerender } = renderHook(() => useDismissOnPaymentChange());

      useTransactionPayTokenMock.mockReturnValue({
        payToken: TOKEN_B,
        setPayToken: setPayTokenMock,
      });

      rerender();

      expect(goBackMock).not.toHaveBeenCalled();
    });

    it('latches when defeating an unfocused change, so it does not re-fire after re-focus', () => {
      isFocusedMock.mockReturnValue(false);

      const { rerender } = renderHook(() => useDismissOnPaymentChange());

      useTransactionPayTokenMock.mockReturnValue({
        payToken: TOKEN_B,
        setPayToken: setPayTokenMock,
      });

      rerender();

      isFocusedMock.mockReturnValue(true);

      rerender();

      expect(goBackMock).not.toHaveBeenCalled();
    });
  });
});
