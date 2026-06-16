import { renderHook, act } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { AlertKeys } from '../../../constants/alerts';
import { useMoneyDepositFunnelMetrics } from './useMoneyDepositFunnelMetrics';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useTransactionPayFiatPayment } from '../../../hooks/pay/useTransactionPayData';
import { useAlerts } from '../../../context/alert-system-context';
import { useRampsUserRegion } from '../../../../../UI/Ramp/hooks/useRampsUserRegion';

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../context/alert-system-context');
jest.mock('../../../../../UI/Ramp/hooks/useRampsUserRegion');

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn(() => 'built-event');
const mockAddProperties = jest.fn((_properties: Record<string, unknown>) => ({
  build: mockBuild,
}));
const mockCreateEventBuilder = jest.fn((_event: unknown) => ({
  addProperties: mockAddProperties,
}));
jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const useTransactionMetadataRequestMock = jest.mocked(
  useTransactionMetadataRequest,
);
const useTransactionPayFiatPaymentMock = jest.mocked(
  useTransactionPayFiatPayment,
);
const useAlertsMock = jest.mocked(useAlerts);
const useRampsUserRegionMock = jest.mocked(useRampsUserRegion);

const REGION = 'us-ca';

const FIAT_PAYMENT_MOCK = {
  selectedPaymentMethodId: '/payments/debit-credit-card',
  amountFiat: '100',
  caipAssetId: 'eip155:1/slip44:60',
};

const RAMPS_QUOTE_MOCK = {
  provider: '/providers/transak',
  quote: {
    amountIn: 100,
    amountOut: 0.05,
    paymentMethod: '/payments/debit-credit-card',
    totalFees: 5,
    networkFee: 2,
    providerFee: 3,
  },
};

/**
 * Returns the addProperties payload for the first emit of `event`, or
 * undefined if it was never emitted.
 */
function payloadFor(event: unknown): Record<string, unknown> | undefined {
  const callIndex = mockCreateEventBuilder.mock.calls.findIndex(
    ([arg]) => arg === event,
  );
  if (callIndex === -1) {
    return undefined;
  }
  return mockAddProperties.mock.calls[callIndex]?.[0] as Record<
    string,
    unknown
  >;
}

function setMocks({
  type = TransactionType.moneyAccountDeposit,
  fiatPayment = FIAT_PAYMENT_MOCK,
  alerts = [],
}: {
  type?: TransactionType;
  fiatPayment?: Record<string, unknown> | undefined;
  alerts?: { key: string; message?: string }[];
} = {}) {
  useTransactionMetadataRequestMock.mockReturnValue({
    id: 'tx-1',
    type,
    txParams: { from: '0x123' },
  } as never);
  useTransactionPayFiatPaymentMock.mockReturnValue(fiatPayment as never);
  useAlertsMock.mockReturnValue({ alerts } as never);
  useRampsUserRegionMock.mockReturnValue({
    userRegion: { regionCode: REGION },
    setUserRegion: jest.fn(),
  } as never);
}

const NON_MONEY_TYPES = [
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
  TransactionType.moneyAccountWithdraw,
  TransactionType.musdConversion,
];

describe('useMoneyDepositFunnelMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMocks();
  });

  describe('moneyAccountDeposit (HEADLESS / money_account)', () => {
    it('emits RAMPS_ORDER_SELECTED reactively when a usable quote is present', () => {
      setMocks({
        fiatPayment: { ...FIAT_PAYMENT_MOCK, rampsQuote: RAMPS_QUOTE_MOCK },
      });

      renderHook(() => useMoneyDepositFunnelMetrics());

      expect(payloadFor(MetaMetricsEvents.RAMPS_ORDER_SELECTED)).toEqual({
        ramp_type: 'HEADLESS',
        ramp_surface: 'money_account',
        region: REGION,
        amount_source: 100,
        amount_destination: 0.05,
        total_fee: 5,
        gas_fee: 2,
        processing_fee: 3,
        payment_method_id: '/payments/debit-credit-card',
        currency_destination: 'eip155:1/slip44:60',
        currency_source: 'USD',
      });
    });

    it('emits RAMPS_PAYMENT_METHOD_SELECTED reactively when a method is selected', () => {
      renderHook(() => useMoneyDepositFunnelMetrics());

      expect(
        payloadFor(MetaMetricsEvents.RAMPS_PAYMENT_METHOD_SELECTED),
      ).toEqual({
        ramp_type: 'HEADLESS',
        ramp_surface: 'money_account',
        region: REGION,
        payment_method_id: '/payments/debit-credit-card',
      });
    });

    it('emits RAMPS_QUOTE_ERROR reactively on the no-quotes alert', () => {
      setMocks({
        alerts: [
          { key: AlertKeys.NoPayTokenQuotes, message: 'No quotes available' },
        ],
      });

      renderHook(() => useMoneyDepositFunnelMetrics());

      expect(payloadFor(MetaMetricsEvents.RAMPS_QUOTE_ERROR)).toEqual({
        ramp_type: 'HEADLESS',
        ramp_surface: 'money_account',
        region: REGION,
        error_message: 'No quotes available',
        amount: 100,
        currency_source: 'USD',
        currency_destination: 'eip155:1/slip44:60',
        payment_method_id: '/payments/debit-credit-card',
      });
    });

    it('emits RAMPS_QUOTE_ERROR reactively on the fiat buy-limit alert', () => {
      setMocks({
        alerts: [
          { key: AlertKeys.FiatBuyAmountLimit, message: 'Over the limit' },
        ],
      });

      renderHook(() => useMoneyDepositFunnelMetrics());

      expect(payloadFor(MetaMetricsEvents.RAMPS_QUOTE_ERROR)).toEqual(
        expect.objectContaining({
          ramp_type: 'HEADLESS',
          ramp_surface: 'money_account',
          region: REGION,
          error_message: 'Over the limit',
        }),
      );
    });

    it('emits RAMPS_ORDER_PROPOSED when trackAmountCommitted is called with a valid amount', () => {
      const { result } = renderHook(() => useMoneyDepositFunnelMetrics());

      act(() => {
        result.current.trackAmountCommitted();
      });

      expect(payloadFor(MetaMetricsEvents.RAMPS_ORDER_PROPOSED)).toEqual({
        ramp_type: 'HEADLESS',
        ramp_surface: 'money_account',
        region: REGION,
        amount_source: 100,
        payment_method_id: '/payments/debit-credit-card',
        currency_destination: 'eip155:1/slip44:60',
        currency_source: 'USD',
      });
    });

    it('does not emit RAMPS_ORDER_PROPOSED when the committed amount is zero', () => {
      setMocks({ fiatPayment: { ...FIAT_PAYMENT_MOCK, amountFiat: '0' } });

      const { result } = renderHook(() => useMoneyDepositFunnelMetrics());

      act(() => {
        result.current.trackAmountCommitted();
      });

      expect(
        payloadFor(MetaMetricsEvents.RAMPS_ORDER_PROPOSED),
      ).toBeUndefined();
    });

    it('emits RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED when trackPaymentSelectorOpened is called', () => {
      const { result } = renderHook(() => useMoneyDepositFunnelMetrics());

      act(() => {
        result.current.trackPaymentSelectorOpened();
      });

      expect(
        payloadFor(MetaMetricsEvents.RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED),
      ).toEqual({
        ramp_type: 'HEADLESS',
        ramp_surface: 'money_account',
        region: REGION,
        location: 'Amount Input',
        current_payment_method: '/payments/debit-credit-card',
      });
    });

    it('emits RAMPS_CONTINUE_BUTTON_CLICKED when trackContinue is called', () => {
      const { result } = renderHook(() => useMoneyDepositFunnelMetrics());

      act(() => {
        result.current.trackContinue();
      });

      expect(
        payloadFor(MetaMetricsEvents.RAMPS_CONTINUE_BUTTON_CLICKED),
      ).toEqual({
        ramp_type: 'HEADLESS',
        ramp_surface: 'money_account',
        region: REGION,
        amount_source: 100,
        payment_method_id: '/payments/debit-credit-card',
        currency_destination: 'eip155:1/slip44:60',
        currency_source: 'USD',
      });
    });

    it('routes every emit through trackEvent', () => {
      setMocks({
        fiatPayment: { ...FIAT_PAYMENT_MOCK, rampsQuote: RAMPS_QUOTE_MOCK },
      });

      renderHook(() => useMoneyDepositFunnelMetrics());

      expect(mockTrackEvent).toHaveBeenCalledWith('built-event');
    });
  });

  describe('dedupe (fire once per occurrence)', () => {
    it('does not re-emit RAMPS_ORDER_SELECTED for the same quote across re-renders', () => {
      setMocks({
        fiatPayment: { ...FIAT_PAYMENT_MOCK, rampsQuote: RAMPS_QUOTE_MOCK },
      });

      const { rerender } = renderHook(() => useMoneyDepositFunnelMetrics());
      rerender({});

      const selectedCalls = mockCreateEventBuilder.mock.calls.filter(
        ([event]) => event === MetaMetricsEvents.RAMPS_ORDER_SELECTED,
      );
      expect(selectedCalls).toHaveLength(1);
    });

    it('does not re-emit RAMPS_PAYMENT_METHOD_SELECTED for the same method across re-renders', () => {
      const { rerender } = renderHook(() => useMoneyDepositFunnelMetrics());
      rerender({});

      const selectedCalls = mockCreateEventBuilder.mock.calls.filter(
        ([event]) => event === MetaMetricsEvents.RAMPS_PAYMENT_METHOD_SELECTED,
      );
      expect(selectedCalls).toHaveLength(1);
    });
  });

  // Cross-flow isolation: the shared screen serves perps / predict / withdraw /
  // mUSD too. None of the money RAMPS funnel events may fire for those.
  describe.each(NON_MONEY_TYPES)('cross-flow isolation: %s', (type) => {
    it('emits no money RAMPS funnel events (reactive or imperative)', () => {
      setMocks({
        type,
        fiatPayment: {
          ...FIAT_PAYMENT_MOCK,
          rampsQuote: RAMPS_QUOTE_MOCK,
        },
        alerts: [
          { key: AlertKeys.NoPayTokenQuotes, message: 'No quotes available' },
        ],
      });

      const { result } = renderHook(() => useMoneyDepositFunnelMetrics());

      act(() => {
        result.current.trackAmountCommitted();
        result.current.trackPaymentSelectorOpened();
        result.current.trackContinue();
      });

      expect(mockCreateEventBuilder).not.toHaveBeenCalled();
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });
});
