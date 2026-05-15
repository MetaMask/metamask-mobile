import { renderHook, act } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { TransactionType } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';
import Routes from '../../../../../../constants/navigation/Routes';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { selectPerpsAccountState } from '../../../../../UI/Perps/selectors/perpsController';
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
}));
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: { balance?: string }) => {
    const translations: Record<string, string> = {
      'confirm.pay_with_bottom_sheet.perps': 'Perps',
      'confirm.pay_with_bottom_sheet.perps_account': 'Perps account',
      'confirm.pay_with_bottom_sheet.add': 'Add',
      'confirm.pay_with_bottom_sheet.available_balance': `${
        params?.balance ?? ''
      } available`,
    };
    return translations[key] ?? key;
  },
}));
jest.mock('../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter');
jest.mock('../../../../../UI/Perps/hooks/usePerpsPaymentToken');
jest.mock('../../../../../UI/Perps/hooks/usePerpsTrading');
jest.mock('../../useApprovalRequest');
jest.mock('../../transactions/useTransactionMetadataRequest');

describe('usePayWithPerpsSection', () => {
  const useSelectorMock = jest.mocked(useSelector);
  const useNavigationMock = jest.mocked(useNavigation);
  const useFiatFormatterMock = jest.mocked(useFiatFormatter);
  const usePerpsPaymentTokenMock = jest.mocked(usePerpsPaymentToken);
  const usePerpsTradingMock = jest.mocked(usePerpsTrading);
  const useApprovalRequestMock = jest.mocked(useApprovalRequest);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  const navigateMock = jest.fn();
  const goBackMock = jest.fn();
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

    usePerpsPaymentTokenMock.mockReturnValue({
      onPaymentTokenChange: onPaymentTokenChangeMock,
    } as never);

    usePerpsTradingMock.mockReturnValue({
      depositWithConfirmation: depositWithConfirmationMock.mockResolvedValue({
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
        title: 'Perps account',
        subtitle: '$500.00 available',
        isSelected: false,
        testID: 'pay-with-perps-section-balance-row',
      }),
    );
  });

  it('renders the row without a visual selected state (the Add button is the only call to action, no checkmark needed)', () => {
    const { result } = renderHook(() => usePayWithPerpsSection());

    expect(result.current?.rows[0]).toEqual(
      expect.objectContaining({
        isSelected: false,
        trailingElement: expect.any(Object),
      }),
    );
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

  it('rejects approval, triggers deposit confirmation, and navigates with perps header when Add is pressed', async () => {
    const { result } = renderHook(() => usePayWithPerpsSection());

    const trailing = result.current?.rows[0].trailingElement as
      | { props: { onPress: () => Promise<void> } }
      | undefined;

    await act(async () => {
      await trailing?.props.onPress();
    });

    expect(onRejectMock).toHaveBeenCalledTimes(1);
    expect(depositWithConfirmationMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(
      Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      { showPerpsHeader: true },
    );
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
