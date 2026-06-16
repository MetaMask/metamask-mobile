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

const FIAT_PAYMENT_WITH_QUOTE = {
  ...FIAT_PAYMENT_MOCK,
  rampsQuote: RAMPS_QUOTE_MOCK,
};

const EXPECTED_BASE = {
  ramp_type: 'HEADLESS',
  ramp_surface: 'money_account',
  region: REGION,
};

const NO_QUOTES_ALERTS = [
  { key: AlertKeys.NoPayTokenQuotes, message: 'No quotes available' },
];
const BUY_LIMIT_ALERTS = [
  { key: AlertKeys.FiatBuyAmountLimit, message: 'Over the limit' },
];

/** addProperties payload for the first emit of `event`, or undefined. */
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

/** How many times `event` was emitted. */
function emitCount(event: unknown): number {
  return mockCreateEventBuilder.mock.calls.filter((c) => c[0] === event).length;
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
      setMocks({ fiatPayment: FIAT_PAYMENT_WITH_QUOTE });

      renderHook(() => useMoneyDepositFunnelMetrics());

      expect(payloadFor(MetaMetricsEvents.RAMPS_ORDER_SELECTED)).toEqual({
        ...EXPECTED_BASE,
        amount_source: 100,
        amount_destination: 0.05,
        exchange_rate: 1900, // (100 - 5) / 0.05
        total_fee: 5,
        gas_fee: 2,
        processing_fee: 3,
        payment_method_id: '/payments/debit-credit-card',
        currency_destination: 'eip155:1/slip44:60',
        currency_source: 'USD',
        chain_id: 'eip155:1',
      });
      expect(mockTrackEvent).toHaveBeenCalledWith('built-event');
    });

    it('emits RAMPS_PAYMENT_METHOD_SELECTED reactively when a method is selected', () => {
      renderHook(() => useMoneyDepositFunnelMetrics());

      expect(
        payloadFor(MetaMetricsEvents.RAMPS_PAYMENT_METHOD_SELECTED),
      ).toEqual({
        ...EXPECTED_BASE,
        payment_method_id: '/payments/debit-credit-card',
        is_authenticated: false,
      });
    });

    it('emits RAMPS_QUOTE_ERROR reactively on the no-quotes alert', () => {
      setMocks({ alerts: NO_QUOTES_ALERTS });

      renderHook(() => useMoneyDepositFunnelMetrics());

      expect(payloadFor(MetaMetricsEvents.RAMPS_QUOTE_ERROR)).toEqual({
        ...EXPECTED_BASE,
        error_message: 'No quotes available',
        amount: 100,
        currency_source: 'USD',
        currency_destination: 'eip155:1/slip44:60',
        payment_method_id: '/payments/debit-credit-card',
      });
    });

    it('emits RAMPS_QUOTE_ERROR reactively on the fiat buy-limit alert', () => {
      setMocks({ alerts: BUY_LIMIT_ALERTS });

      renderHook(() => useMoneyDepositFunnelMetrics());

      expect(payloadFor(MetaMetricsEvents.RAMPS_QUOTE_ERROR)).toEqual(
        expect.objectContaining({
          ...EXPECTED_BASE,
          error_message: 'Over the limit',
        }),
      );
    });

    it('emits RAMPS_ORDER_PROPOSED when trackAmountCommitted is called with a valid amount', () => {
      const { result } = renderHook(() => useMoneyDepositFunnelMetrics());
      act(() => result.current.trackAmountCommitted());

      expect(payloadFor(MetaMetricsEvents.RAMPS_ORDER_PROPOSED)).toEqual({
        ...EXPECTED_BASE,
        amount_source: 100,
        amount_destination: 0, // no quote yet at amount-commit
        payment_method_id: '/payments/debit-credit-card',
        currency_destination: 'eip155:1/slip44:60',
        currency_source: 'USD',
        chain_id: 'eip155:1',
        is_authenticated: false,
      });
    });

    it('does not emit RAMPS_ORDER_PROPOSED when the committed amount is zero', () => {
      setMocks({ fiatPayment: { ...FIAT_PAYMENT_MOCK, amountFiat: '0' } });

      const { result } = renderHook(() => useMoneyDepositFunnelMetrics());
      act(() => result.current.trackAmountCommitted());

      expect(
        payloadFor(MetaMetricsEvents.RAMPS_ORDER_PROPOSED),
      ).toBeUndefined();
    });

    it('emits RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED when trackPaymentSelectorOpened is called', () => {
      const { result } = renderHook(() => useMoneyDepositFunnelMetrics());
      act(() => result.current.trackPaymentSelectorOpened());

      expect(
        payloadFor(MetaMetricsEvents.RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED),
      ).toEqual({
        ...EXPECTED_BASE,
        location: 'Amount Input',
        current_payment_method: '/payments/debit-credit-card',
      });
    });

    it('emits RAMPS_CONTINUE_BUTTON_CLICKED when trackContinue is called', () => {
      const { result } = renderHook(() => useMoneyDepositFunnelMetrics());
      act(() => result.current.trackContinue());

      expect(
        payloadFor(MetaMetricsEvents.RAMPS_CONTINUE_BUTTON_CLICKED),
      ).toEqual({
        ...EXPECTED_BASE,
        amount_source: 100,
        payment_method_id: '/payments/debit-credit-card',
        currency_destination: 'eip155:1/slip44:60',
        currency_source: 'USD',
        chain_id: 'eip155:1',
      });
    });
  });

  describe('derived schema fields', () => {
    // Non-CAIP asset id -> chain_id fallback; attached quote -> populated amount_destination.
    it('falls back to empty chain_id and reads crypto-out from the quote', () => {
      setMocks({
        fiatPayment: { ...FIAT_PAYMENT_WITH_QUOTE, caipAssetId: 'not-a-caip' },
      });

      const { result } = renderHook(() => useMoneyDepositFunnelMetrics());
      act(() => result.current.trackAmountCommitted());

      expect(payloadFor(MetaMetricsEvents.RAMPS_ORDER_PROPOSED)).toEqual(
        expect.objectContaining({ chain_id: '', amount_destination: 0.05 }),
      );
    });

    it('reports a zero exchange_rate when the quote has no crypto out', () => {
      const quote = { ...RAMPS_QUOTE_MOCK.quote, amountOut: 0 };
      setMocks({
        fiatPayment: { ...FIAT_PAYMENT_MOCK, rampsQuote: { quote } },
      });

      renderHook(() => useMoneyDepositFunnelMetrics());

      expect(payloadFor(MetaMetricsEvents.RAMPS_ORDER_SELECTED)).toEqual(
        expect.objectContaining({ exchange_rate: 0 }),
      );
    });
  });

  describe('dedupe (fire once per occurrence)', () => {
    it('does not re-emit RAMPS_ORDER_SELECTED for the same quote across re-renders', () => {
      setMocks({ fiatPayment: FIAT_PAYMENT_WITH_QUOTE });

      const { rerender } = renderHook(() => useMoneyDepositFunnelMetrics());
      rerender({});

      expect(emitCount(MetaMetricsEvents.RAMPS_ORDER_SELECTED)).toBe(1);
    });

    it('does not re-emit RAMPS_PAYMENT_METHOD_SELECTED for the same method across re-renders', () => {
      const { rerender } = renderHook(() => useMoneyDepositFunnelMetrics());
      rerender({});

      expect(emitCount(MetaMetricsEvents.RAMPS_PAYMENT_METHOD_SELECTED)).toBe(
        1,
      );
    });
  });

  // Cross-flow isolation: the shared screen serves perps / predict / withdraw /
  // mUSD too. None of the money RAMPS funnel events may fire for those.
  describe.each(NON_MONEY_TYPES)('cross-flow isolation: %s', (type) => {
    it('emits no money RAMPS funnel events (reactive or imperative)', () => {
      setMocks({
        type,
        fiatPayment: FIAT_PAYMENT_WITH_QUOTE,
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
