import { renderHook } from '@testing-library/react-hooks';
import { type PaymentMethod } from '@metamask/ramps-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { useFiatPaymentHighlightedActions } from './useFiatPaymentHighlightedActions';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import Engine from '../../../../../core/Engine';

jest.mock('./useMMPayFiatConfig');
jest.mock('./useTransactionPayData');
jest.mock('../../../../UI/Ramp/hooks/useRampsPaymentMethods');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      updateFiatPayment: jest.fn(),
    },
  },
}));

const PAYMENT_METHOD_MOCK: PaymentMethod = {
  id: 'pm-card',
  paymentType: 'debit-credit-card',
  name: 'Credit Card',
  score: 1,
  icon: 'card-icon',
  delay: [5, 10],
} as PaymentMethod;

const TRANSACTION_ID_MOCK = 'tx-123';
const TRANSACTION_TYPE_MOCK = TransactionType.simpleSend;

describe('useFiatPaymentHighlightedActions', () => {
  const useMMPayFiatConfigMock = jest.mocked(useMMPayFiatConfig);
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );
  const useRampsPaymentMethodsMock = jest.mocked(useRampsPaymentMethods);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const updateFiatPaymentMock = jest.mocked(
    Engine.context.TransactionPayController.updateFiatPayment,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useMMPayFiatConfigMock.mockReturnValue({
      enabledTransactionTypes: [TRANSACTION_TYPE_MOCK],
      maxDelayMinutesForPaymentMethods: 10,
    });
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);
    useRampsPaymentMethodsMock.mockReturnValue({
      paymentMethods: [PAYMENT_METHOD_MOCK],
    } as ReturnType<typeof useRampsPaymentMethods>);
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      type: TRANSACTION_TYPE_MOCK,
    } as ReturnType<typeof useTransactionMetadataRequest>);
  });

  it('returns empty array when transaction type is not in enabledTransactionTypes', () => {
    useMMPayFiatConfigMock.mockReturnValue({
      enabledTransactionTypes: [TransactionType.swap],
      maxDelayMinutesForPaymentMethods: 10,
    });

    const { result } = renderHook(() => useFiatPaymentHighlightedActions());

    expect(result.current).toEqual([]);
  });

  it('returns empty array when enabledTransactionTypes is empty', () => {
    useMMPayFiatConfigMock.mockReturnValue({
      enabledTransactionTypes: [],
      maxDelayMinutesForPaymentMethods: 10,
    });

    const { result } = renderHook(() => useFiatPaymentHighlightedActions());

    expect(result.current).toEqual([]);
  });

  it('filters out payment methods whose upper delay exceeds maxDelayMinutesForPaymentMethods', () => {
    useMMPayFiatConfigMock.mockReturnValue({
      enabledTransactionTypes: [TRANSACTION_TYPE_MOCK],
      maxDelayMinutesForPaymentMethods: 5,
    });

    const { result } = renderHook(() => useFiatPaymentHighlightedActions());

    expect(result.current).toEqual([]);
  });

  it('returns empty array when no payment methods available', () => {
    useRampsPaymentMethodsMock.mockReturnValue({
      paymentMethods: [],
    } as unknown as ReturnType<typeof useRampsPaymentMethods>);

    const { result } = renderHook(() => useFiatPaymentHighlightedActions());

    expect(result.current).toEqual([]);
  });

  it('maps payment methods to highlighted items', () => {
    const { result } = renderHook(() => useFiatPaymentHighlightedActions());

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      position: 'outside_of_asset_list',
      icon: 'card-icon',
      paymentType: 'debit-credit-card',
      name: 'Credit Card',
      isSelected: false,
    });
  });

  it('marks item as selected when payment method ID matches', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-card',
    });

    const { result } = renderHook(() => useFiatPaymentHighlightedActions());

    expect(result.current[0].isSelected).toBe(true);
  });

  it('calls updateFiatPayment to select when action is fired on unselected item', () => {
    const { result } = renderHook(() => useFiatPaymentHighlightedActions());

    result.current[0].action();

    expect(updateFiatPaymentMock).toHaveBeenCalledWith({
      transactionId: TRANSACTION_ID_MOCK,
      callback: expect.any(Function),
    });

    const fiatPayment = { selectedPaymentMethodId: undefined };
    updateFiatPaymentMock.mock.calls[0][0].callback(fiatPayment);
    expect(fiatPayment.selectedPaymentMethodId).toBe('pm-card');
  });

  it('calls updateFiatPayment to deselect when action is fired on selected item', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-card',
    });

    const { result } = renderHook(() => useFiatPaymentHighlightedActions());

    result.current[0].action();

    const fiatPayment = { selectedPaymentMethodId: 'pm-card' };
    updateFiatPaymentMock.mock.calls[0][0].callback(fiatPayment);
    expect(fiatPayment.selectedPaymentMethodId).toBeUndefined();
  });
});
