import { renderHook, act } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { TransactionType } from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';
import Routes from '../../../../../../constants/navigation/Routes';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import { usePredictBalance } from '../../../../../UI/Predict/hooks/usePredictBalance';
import { usePredictPaymentToken } from '../../../../../UI/Predict/hooks/usePredictPaymentToken';
import { dismissActivePreviewSheet } from '../../../../../UI/Predict/contexts';
import useApprovalRequest from '../../useApprovalRequest';
import { useTransactionMetadataRequest } from '../../transactions/useTransactionMetadataRequest';
import { usePayWithPredictSection } from './usePayWithPredictSection';

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
      'confirm.pay_with_bottom_sheet.predict': 'Predict',
      'confirm.pay_with_bottom_sheet.predict_account': 'Predict account',
      'confirm.pay_with_bottom_sheet.add': 'Add',
      'confirm.pay_with_bottom_sheet.available_balance': `${
        params?.balance ?? ''
      } available`,
    };
    return translations[key] ?? key;
  },
}));
jest.mock('../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter');
jest.mock('../../../../../UI/Predict/hooks/usePredictBalance');
jest.mock('../../../../../UI/Predict/hooks/usePredictPaymentToken');
jest.mock('../../../../../UI/Predict/contexts', () => ({
  dismissActivePreviewSheet: jest.fn(),
}));
jest.mock('../../useApprovalRequest');
jest.mock('../../transactions/useTransactionMetadataRequest');

describe('usePayWithPredictSection', () => {
  const useSelectorMock = jest.mocked(useSelector);
  const useNavigationMock = jest.mocked(useNavigation);
  const useFiatFormatterMock = jest.mocked(useFiatFormatter);
  const usePredictBalanceMock = jest.mocked(usePredictBalance);
  const usePredictPaymentTokenMock = jest.mocked(usePredictPaymentToken);
  const useApprovalRequestMock = jest.mocked(useApprovalRequest);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const dismissActivePreviewSheetMock = jest.mocked(dismissActivePreviewSheet);

  const navigateMock = jest.fn();
  const goBackMock = jest.fn();
  const onRejectMock = jest.fn();
  const resetSelectedPaymentTokenMock = jest.fn();
  const onPaymentTokenChangeMock = jest.fn();
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
      type: TransactionType.predictDepositAndOrder,
      txParams: {},
    } as never);

    usePredictBalanceMock.mockReturnValue({ data: 250 } as never);

    usePredictPaymentTokenMock.mockReturnValue({
      onPaymentTokenChange: onPaymentTokenChangeMock,
      resetSelectedPaymentToken: resetSelectedPaymentTokenMock,
      isPredictBalanceSelected: true,
      selectedPaymentToken: null,
    } as never);

    useApprovalRequestMock.mockReturnValue({
      onReject: onRejectMock,
    } as never);

    useSelectorMock.mockReturnValue({ image: 'https://example.com/pusd.png' });
  });

  it('returns null when the transaction type is not predictDepositAndOrder', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx-1',
      type: TransactionType.predictDeposit,
      txParams: {},
    } as never);

    const { result } = renderHook(() => usePayWithPredictSection());

    expect(result.current).toBeNull();
  });

  it('returns null when there is no transaction metadata', () => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined);

    const { result } = renderHook(() => usePayWithPredictSection());

    expect(result.current).toBeNull();
  });

  it('returns the predict section config with a single predict balance row when the transaction type is predictDepositAndOrder', () => {
    const { result } = renderHook(() => usePayWithPredictSection());

    expect(result.current).toEqual(
      expect.objectContaining({
        id: 'predict',
        title: 'Predict',
        testID: 'pay-with-section-predict',
      }),
    );
    expect(result.current?.rows).toHaveLength(1);
    expect(result.current?.rows[0]).toEqual(
      expect.objectContaining({
        id: 'predict-balance',
        title: 'Predict account',
        subtitle: '$250.00 available',
        isSelected: false,
        testID: 'pay-with-predict-section-balance-row',
      }),
    );
  });

  it('renders the row without a visual selected state (the Add button is the only call to action, no checkmark needed)', () => {
    const { result } = renderHook(() => usePayWithPredictSection());

    expect(result.current?.rows[0]).toEqual(
      expect.objectContaining({
        isSelected: false,
        trailingElement: expect.any(Object),
      }),
    );
  });

  it('treats a missing balance as zero', () => {
    usePredictBalanceMock.mockReturnValue({ data: undefined } as never);

    const { result } = renderHook(() => usePayWithPredictSection());

    expect(result.current?.rows[0].subtitle).toBe('$0.00 available');
  });

  it('selects predict balance as payment token and dismisses the sheet when the row is pressed', () => {
    const { result } = renderHook(() => usePayWithPredictSection());

    act(() => {
      result.current?.rows[0].onPress?.();
    });

    expect(resetSelectedPaymentTokenMock).toHaveBeenCalledTimes(1);
    expect(goBackMock).toHaveBeenCalledTimes(1);
  });

  it('navigates to the Predict add-funds sheet with autoDeposit when Add is pressed', () => {
    const { result } = renderHook(() => usePayWithPredictSection());

    const trailing = result.current?.rows[0].trailingElement as
      | { props: { onPress: () => void } }
      | undefined;

    act(() => {
      trailing?.props.onPress();
    });

    expect(onRejectMock).toHaveBeenCalledTimes(1);
    expect(dismissActivePreviewSheetMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
      params: { autoDeposit: true },
    });
  });

  it('keeps the result reference stable across renders when nothing changes', () => {
    const { result, rerender } = renderHook(() => usePayWithPredictSection());
    const firstResult = result.current;

    rerender();

    expect(result.current).toBe(firstResult);
  });
});
