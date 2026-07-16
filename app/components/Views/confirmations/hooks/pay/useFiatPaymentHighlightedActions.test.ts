import { renderHook } from '@testing-library/react-hooks';
import { type PaymentMethod } from '@metamask/ramps-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { useFiatPaymentHighlightedActions } from './useFiatPaymentHighlightedActions';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useRampsPaymentMethods } from '../../../../UI/Ramp/hooks/useRampsPaymentMethods';
import { useRampsUserRegion } from '../../../../UI/Ramp/hooks/useRampsUserRegion';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import Engine from '../../../../../core/Engine';

jest.mock('./useMMPayFiatConfig');
jest.mock('./useTransactionPayData');
jest.mock('../../../../UI/Ramp/hooks/useRampsPaymentMethods');
jest.mock('../../../../UI/Ramp/hooks/useRampsUserRegion');

// Capture selector-opened emits at the ramps analytics boundary.
const mockRampsTrackEvent = jest.fn();
jest.mock('../../../../UI/Ramp/hooks/useAnalytics', () => ({
  __esModule: true,
  default: () => mockRampsTrackEvent,
}));
jest.mock('../../../../UI/Ramp/hooks/useHasFiatProvider', () => ({
  useHasFiatProvider: () => true,
}));
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
  const useRampsUserRegionMock = jest.mocked(useRampsUserRegion);
  const updateFiatPaymentMock = jest.mocked(
    Engine.context.TransactionPayController.updateFiatPayment,
  );

  /** How many times the ramps analytics boundary received `event`. */
  function emitCount(event: string): number {
    return mockRampsTrackEvent.mock.calls.filter(([type]) => type === event)
      .length;
  }

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
    useRampsUserRegionMock.mockReturnValue({
      userRegion: { regionCode: 'us-ca' },
      setUserRegion: jest.fn(),
    } as never);
  });

  // TRAM-3623: fiat options call the ramps-owned selector tracker. It emits
  // only this event, once, money-only (no funnel re-mount).
  describe('selector-opened telemetry', () => {
    function setMoneyDeposit(selectedPaymentMethodId = 'pm-card') {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: TRANSACTION_ID_MOCK,
        type: TransactionType.moneyAccountDeposit,
      } as ReturnType<typeof useTransactionMetadataRequest>);
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId,
      } as never);
    }

    it('emits the money_account selector payload exactly once and no other event', () => {
      setMoneyDeposit();

      const { rerender } = renderHook(() => useFiatPaymentHighlightedActions());
      setMoneyDeposit('pm-apple-pay'); // method change must not re-emit
      rerender();

      expect(mockRampsTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockRampsTrackEvent).toHaveBeenCalledWith(
        'RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED',
        {
          ramp_type: 'HEADLESS',
          ramp_surface: 'money_account',
          region: 'us-ca',
          location: 'Amount Input',
          current_payment_method: 'pm-card',
        },
      );
      expect(emitCount('RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED')).toBe(1);
    });

    it('falls back to an empty region when unavailable', () => {
      setMoneyDeposit();
      useRampsUserRegionMock.mockReturnValue({
        userRegion: null,
        setUserRegion: jest.fn(),
      } as never);

      renderHook(() => useFiatPaymentHighlightedActions());

      expect(mockRampsTrackEvent).toHaveBeenCalledWith(
        'RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED',
        expect.objectContaining({ region: '' }),
      );
    });

    it.each([
      TransactionType.perpsDeposit,
      TransactionType.predictDeposit,
      TransactionType.simpleSend,
    ])('emits nothing for the non-money flow %s', (type) => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: TRANSACTION_ID_MOCK,
        type,
      } as ReturnType<typeof useTransactionMetadataRequest>);

      renderHook(() => useFiatPaymentHighlightedActions());

      expect(mockRampsTrackEvent).not.toHaveBeenCalled();
    });
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
