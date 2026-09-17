import { renderHook, act } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { TransactionType } from '@metamask/transaction-controller';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { useSelector } from 'react-redux';
import Routes from '../../../../../../constants/navigation/Routes';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { selectPerpsAccountState } from '../../../../../UI/Perps/selectors/perpsController';
import { useIsPerpsBalanceSelected } from '../../../../../UI/Perps/hooks/useIsPerpsBalanceSelected';
import { usePerpsPaymentToken } from '../../../../../UI/Perps/hooks/usePerpsPaymentToken';
import { usePerpsTrading } from '../../../../../UI/Perps/hooks/usePerpsTrading';
import useApprovalRequest from '../../useApprovalRequest';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import { usePayWithPerpsSection } from './usePayWithPerpsSection';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  // Not a jest.fn: `resetAllMocks` would strip the implementation and silently
  // turn this into a no-op.
  useFocusEffect: (callback: () => void) => callback(),
}));
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: { balance?: string }) => {
    const translations: Record<string, string> = {
      'confirm.pay_with_bottom_sheet.perps': 'Perps',
      'confirm.pay_with_bottom_sheet.perps_balance': 'Perps balance',
      'confirm.pay_with_bottom_sheet.add': 'Add',
      'confirm.pay_with_bottom_sheet.available_balance': `${
        params?.balance ?? ''
      } available`,
    };
    return translations[key] ?? key;
  },
}));
jest.mock('../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter');
jest.mock('../../../../../UI/Perps/hooks/useIsPerpsBalanceSelected');
jest.mock('../../../../../UI/Perps/hooks/usePerpsPaymentToken');
jest.mock('../../../../../UI/Perps/hooks/usePerpsTrading');
jest.mock('../../useApprovalRequest');
jest.mock('../../transactions/useTransactionMetadataRequest');

describe('usePayWithPerpsSection', () => {
  const useSelectorMock = jest.mocked(useSelector);
  const useNavigationMock = jest.mocked(useNavigation);
  const useFiatFormatterMock = jest.mocked(useFiatFormatter);
  const useIsPerpsBalanceSelectedMock = jest.mocked(useIsPerpsBalanceSelected);
  const usePerpsPaymentTokenMock = jest.mocked(usePerpsPaymentToken);
  const usePerpsTradingMock = jest.mocked(usePerpsTrading);
  const useApprovalRequestMock = jest.mocked(useApprovalRequest);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  const navigateMock = jest.fn();
  const goBackMock = jest.fn();
  const depositWithOrderMock = jest.fn();
  const onPaymentTokenChangeMock = jest.fn();
  const depositWithConfirmationMock = jest.fn();
  const onRejectMock = jest.fn();
  const formatFiatMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    formatFiatMock.mockImplementation(
      (value: { toString: () => string }) =>
        `$${Number(value.toString()).toFixed(2)}`,
    );

    useNavigationMock.mockReturnValue({
      navigate: navigateMock,
      goBack: goBackMock,
    } as never);

    useFiatFormatterMock.mockReturnValue(formatFiatMock as never);

    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx-1',
      type: TransactionType.perpsDepositAndOrder,
      txParams: {},
    } as never);

    useSelectorMock.mockImplementation((selector) => {
      if (selector === selectPerpsAccountState) {
        return { spendableBalance: '500' };
      }
      return undefined;
    });

    useIsPerpsBalanceSelectedMock.mockReturnValue(true);

    usePerpsPaymentTokenMock.mockReturnValue({
      onPaymentTokenChange: onPaymentTokenChangeMock,
    } as never);

    usePerpsTradingMock.mockReturnValue({
      depositWithConfirmation: depositWithConfirmationMock.mockResolvedValue({
        result: Promise.resolve('ok'),
      }),
      depositWithOrder: depositWithOrderMock.mockResolvedValue({
        result: Promise.resolve('ok'),
      }),
    } as never);

    useApprovalRequestMock.mockReturnValue({
      onReject: onRejectMock,
    } as never);
  });

  it('returns null when the transaction type is not perpsDepositAndOrder', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx-1',
      type: TransactionType.perpsDeposit,
      txParams: {},
    } as never);

    const { result } = renderHook(() => usePayWithPerpsSection());

    expect(result.current).toBeNull();
  });

  it('returns null when there is no transaction metadata', () => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined);

    const { result } = renderHook(() => usePayWithPerpsSection());

    expect(result.current).toBeNull();
  });

  it('returns the perps section config with a single perps account row when the transaction type is perpsDepositAndOrder', () => {
    const { result } = renderHook(() => usePayWithPerpsSection());

    expect(result.current).toEqual(
      expect.objectContaining({
        id: 'perps',
        title: 'Perps',
        testID: 'pay-with-section-perps',
      }),
    );
    expect(result.current?.rows).toHaveLength(1);
    expect(result.current?.rows[0]).toEqual(
      expect.objectContaining({
        id: 'perps-balance',
        title: 'Perps balance',
        subtitle: '$500.00 available',
        isSelected: true,
        testID: 'pay-with-perps-section-balance-row',
      }),
    );
  });

  it('marks the row as selected when perps balance is the active payment method', () => {
    useIsPerpsBalanceSelectedMock.mockReturnValue(true);

    const { result } = renderHook(() => usePayWithPerpsSection());

    expect(result.current?.rows[0]).toEqual(
      expect.objectContaining({
        isSelected: true,
        trailingElement: expect.any(Object),
      }),
    );
  });

  it('marks the row as not selected when a crypto token is chosen instead', () => {
    useIsPerpsBalanceSelectedMock.mockReturnValue(false);

    const { result } = renderHook(() => usePayWithPerpsSection());

    expect(result.current?.rows[0]).toEqual(
      expect.objectContaining({
        isSelected: false,
        trailingElement: expect.any(Object),
      }),
    );
  });

  it('marks the row as not selected when Money Account is selected', () => {
    useSelectorMock.mockImplementation((selector) => {
      if (selector === selectPerpsAccountState) {
        return { spendableBalance: '500' };
      }
      return PaymentOverride.MoneyAccount;
    });

    const { result } = renderHook(() => usePayWithPerpsSection());

    expect(result.current?.rows[0].isSelected).toBe(false);
  });

  it('treats a missing spendable balance as zero', () => {
    useSelectorMock.mockImplementation((selector) => {
      if (selector === selectPerpsAccountState) {
        return null;
      }
      return undefined;
    });

    const { result } = renderHook(() => usePayWithPerpsSection());

    expect(result.current?.rows[0].subtitle).toBe('$0.00 available');
  });

  it('selects perps balance as payment token and dismisses the sheet when the row is pressed', () => {
    const { result } = renderHook(() => usePayWithPerpsSection());

    act(() => {
      result.current?.rows[0].onPress?.();
    });

    expect(onPaymentTokenChangeMock).toHaveBeenCalledWith(null);
    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  const pressAdd = async (result: {
    current: ReturnType<typeof usePayWithPerpsSection>;
  }) => {
    const trailing = result.current?.rows[0].trailingElement as
      | { props: { onPress: () => Promise<void> } }
      | undefined;

    await act(async () => {
      await trailing?.props.onPress();
    });
  };

  it('rejects approval, triggers deposit confirmation, and navigates with perps header when Add is pressed', async () => {
    const { result } = renderHook(() => usePayWithPerpsSection());

    await pressAdd(result);

    expect(onRejectMock).toHaveBeenCalledTimes(1);
    expect(depositWithConfirmationMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(
      Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      { showPerpsHeader: true },
    );
  });

  it('recreates the rejected order when the sheet regains focus after Add', async () => {
    const { result, rerender } = renderHook(() => usePayWithPerpsSection());

    await pressAdd(result);

    useTransactionMetadataRequestMock.mockReturnValue(undefined as never);

    await act(async () => {
      rerender();
    });

    expect(depositWithOrderMock).toHaveBeenCalledTimes(1);
  });

  it('does not recreate the order when the sheet is opened without pressing Add', async () => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined as never);

    const { rerender } = renderHook(() => usePayWithPerpsSection());

    await act(async () => {
      rerender();
    });

    expect(depositWithOrderMock).not.toHaveBeenCalled();
  });

  it('does not recreate the order while a transaction is still pending', async () => {
    const { result, rerender } = renderHook(() => usePayWithPerpsSection());

    await pressAdd(result);

    await act(async () => {
      rerender();
    });

    expect(depositWithOrderMock).not.toHaveBeenCalled();
  });

  it('recreates the order only once across repeated focus events', async () => {
    const { result, rerender } = renderHook(() => usePayWithPerpsSection());

    await pressAdd(result);

    useTransactionMetadataRequestMock.mockReturnValue(undefined as never);

    await act(async () => {
      rerender();
    });
    await act(async () => {
      rerender();
    });

    expect(depositWithOrderMock).toHaveBeenCalledTimes(1);
  });

  it('swallows a failure to recreate the order', async () => {
    depositWithOrderMock.mockRejectedValueOnce(new Error('no-connection'));

    const { result, rerender } = renderHook(() => usePayWithPerpsSection());

    await pressAdd(result);

    useTransactionMetadataRequestMock.mockReturnValue(undefined as never);

    await act(async () => {
      rerender();
    });

    expect(depositWithOrderMock).toHaveBeenCalledTimes(1);
  });

  it('retries on the next focus when recreating the order failed', async () => {
    depositWithOrderMock.mockRejectedValueOnce(new Error('no-connection'));

    const { result, rerender } = renderHook(() => usePayWithPerpsSection());

    await pressAdd(result);

    useTransactionMetadataRequestMock.mockReturnValue(undefined as never);

    await act(async () => {
      rerender();
    });
    await act(async () => {
      rerender();
    });

    expect(depositWithOrderMock).toHaveBeenCalledTimes(2);
  });

  it('does not recreate the order while the deposit is still in flight', async () => {
    let resolveDeposit: (value: unknown) => void = () => undefined;
    depositWithConfirmationMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDeposit = resolve;
      }),
    );

    const { result, rerender } = renderHook(() => usePayWithPerpsSection());

    const trailing = result.current?.rows[0].trailingElement as
      | { props: { onPress: () => Promise<void> } }
      | undefined;

    act(() => {
      trailing?.props.onPress();
    });

    useTransactionMetadataRequestMock.mockReturnValue(undefined as never);

    await act(async () => {
      rerender();
    });

    expect(depositWithOrderMock).not.toHaveBeenCalled();

    await act(async () => {
      resolveDeposit({ result: Promise.resolve('ok') });
    });
  });

  it('recreates the order immediately when the deposit fails', async () => {
    depositWithConfirmationMock.mockRejectedValueOnce(new Error('user-cancel'));

    const { result } = renderHook(() => usePayWithPerpsSection());

    await pressAdd(result);

    expect(depositWithOrderMock).toHaveBeenCalledTimes(1);
  });

  it('does not navigate when deposit confirmation rejects', async () => {
    depositWithConfirmationMock.mockRejectedValueOnce(new Error('user-cancel'));

    const { result } = renderHook(() => usePayWithPerpsSection());

    const trailing = result.current?.rows[0].trailingElement as
      | { props: { onPress: () => Promise<void> } }
      | undefined;

    await act(async () => {
      await trailing?.props.onPress();
    });

    expect(onRejectMock).toHaveBeenCalledTimes(1);
    expect(depositWithConfirmationMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('keeps the result reference stable across renders when nothing changes', () => {
    const { result, rerender } = renderHook(() => usePayWithPerpsSection());
    const firstResult = result.current;

    rerender();

    expect(result.current).toBe(firstResult);
  });
});
