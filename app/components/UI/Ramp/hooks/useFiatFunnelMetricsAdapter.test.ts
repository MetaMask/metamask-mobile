import { renderHook } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';
import { RAMP_SURFACE } from '../types/depositAnalytics';
import { AlertKeys } from '../../../Views/confirmations/constants/alerts';
import { useFiatFunnelMetricsAdapter } from './useFiatFunnelMetricsAdapter';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useTransactionPayFiatPayment } from '../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { useAlerts } from '../../../Views/confirmations/context/alert-system-context';
import { useRampsUserRegion } from './useRampsUserRegion';

jest.mock(
  '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
);
jest.mock('../../../Views/confirmations/hooks/pay/useTransactionPayData');
jest.mock('../../../Views/confirmations/context/alert-system-context');
jest.mock('./useRampsUserRegion');

const mockTrackScreenViewed = jest.fn();
const mockUseFiatFunnelMetrics = jest.fn((_input: Record<string, unknown>) => ({
  trackScreenViewed: mockTrackScreenViewed,
  trackAmountCommitted: jest.fn(),
  trackPaymentSelectorOpened: jest.fn(),
  trackContinue: jest.fn(),
}));

jest.mock('./useFiatFunnelMetrics', () => ({
  ...jest.requireActual('./useFiatFunnelMetrics'),
  useFiatFunnelMetrics: (input: Record<string, unknown>) =>
    mockUseFiatFunnelMetrics(input),
}));

const txMetaMock = jest.mocked(useTransactionMetadataRequest);
const fiatPaymentMock = jest.mocked(useTransactionPayFiatPayment);
const alertsMock = jest.mocked(useAlerts);
const userRegionMock = jest.mocked(useRampsUserRegion);

const FIAT_PAYMENT_MOCK = {
  selectedPaymentMethodId: '/payments/debit-credit-card',
  amountFiat: '100',
  caipAssetId: 'eip155:1/slip44:60',
};

function setMocks({
  type = TransactionType.moneyAccountDeposit,
  alerts = [],
  userRegion = { regionCode: 'us-ca' },
}: {
  type?: TransactionType;
  alerts?: { key: string; message?: unknown }[];
  userRegion?: { regionCode: string } | null;
} = {}) {
  txMetaMock.mockReturnValue({ type } as never);
  fiatPaymentMock.mockReturnValue(FIAT_PAYMENT_MOCK as never);
  alertsMock.mockReturnValue({ alerts } as never);
  userRegionMock.mockReturnValue({
    userRegion,
    setUserRegion: jest.fn(),
  } as never);
}

/** Renders the adapter and returns the input it forwarded to the generic hook. */
function forwardedInput(): Record<string, unknown> {
  renderHook(() => useFiatFunnelMetricsAdapter());
  return mockUseFiatFunnelMetrics.mock.calls.at(-1)?.[0] as Record<
    string,
    unknown
  >;
}

describe('useFiatFunnelMetricsAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMocks();
  });

  it.each([
    [TransactionType.moneyAccountDeposit, RAMP_SURFACE.MONEY_ACCOUNT],
    [TransactionType.perpsDeposit, undefined],
    [TransactionType.predictDeposit, undefined],
    [TransactionType.moneyAccountWithdraw, undefined],
    [TransactionType.musdConversion, undefined],
  ])('derives the ramp surface for %s', (type, expected) => {
    setMocks({ type });
    expect(forwardedInput().rampSurface).toBe(expected);
  });

  it('derives an undefined surface when there is no transaction', () => {
    txMetaMock.mockReturnValue(undefined as never);
    expect(forwardedInput().rampSurface).toBeUndefined();
  });

  it('tracks the amount screen view from inside the adapter', () => {
    forwardedInput();

    expect(mockTrackScreenViewed).toHaveBeenCalledTimes(1);
  });

  it('forwards the fiat payment fields and region', () => {
    expect(forwardedInput()).toEqual(
      expect.objectContaining({
        region: 'us-ca',
        selectedPaymentMethodId: '/payments/debit-credit-card',
        amountFiat: '100',
        assetId: 'eip155:1/slip44:60',
      }),
    );
  });

  it('forwards an empty region when the user region is unavailable', () => {
    setMocks({ userRegion: null });
    expect(forwardedInput().region).toBe('');
  });

  it.each([AlertKeys.NoPayTokenQuotes, AlertKeys.FiatBuyAmountLimit])(
    'forwards the %s alert as a quote error',
    (key) => {
      setMocks({ alerts: [{ key, message: 'oops' }] });
      expect(forwardedInput().quoteError).toEqual({ key, message: 'oops' });
    },
  );

  it('forwards no quote error when no matching alert is active', () => {
    setMocks({ alerts: [{ key: 'someOtherAlert' }] });
    expect(forwardedInput().quoteError).toBeUndefined();
  });

  it('forwards an undefined message for a non-string (ReactElement) message', () => {
    setMocks({
      alerts: [{ key: AlertKeys.NoPayTokenQuotes, message: { type: 'div' } }],
    });
    expect(forwardedInput().quoteError).toEqual({
      key: AlertKeys.NoPayTokenQuotes,
      message: undefined,
    });
  });
});
