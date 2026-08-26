import { renderHook, act } from '@testing-library/react-hooks';
import { type PaymentMethod } from '@metamask/ramps-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { useFiatDepositPaymentMethods } from './useFiatDepositPaymentMethods';
import { useMMPayFiatConfig } from '../../../Views/confirmations/hooks/pay/useMMPayFiatConfig';
import { useTransactionPayFiatPayment } from '../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import Engine from '../../../../core/Engine';

const mockUseQuery = jest.fn();
const mockUseSelector = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  queryOptions: (options: unknown) => options,
}));
jest.mock('react-redux', () => ({
  useSelector: (...args: unknown[]) => mockUseSelector(...args),
}));
jest.mock('../../../Views/confirmations/hooks/pay/useMMPayFiatConfig');
jest.mock('../../../Views/confirmations/hooks/pay/useTransactionPayData');
jest.mock(
  '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
);
jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: { getPaymentMethodsForContext: jest.fn() },
    TransactionPayController: { updateFiatPayment: jest.fn() },
  },
}));

const CARD_METHOD = { id: 'pm-card', name: 'Credit Card' } as PaymentMethod;
const REVOLUT_METHOD = {
  id: 'pm-revolut-pay',
  name: 'Revolut Pay',
} as PaymentMethod;

/** React Query result, defaulting to a settled single-method success. */
const queryState = (overrides: Record<string, unknown> = {}) => ({
  data: { methods: [CARD_METHOD], selected: CARD_METHOD, providerIds: [] },
  isFetching: false,
  isError: false,
  error: null,
  ...overrides,
});

describe('useFiatDepositPaymentMethods', () => {
  const useMMPayFiatConfigMock = jest.mocked(useMMPayFiatConfig);
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );
  const getPaymentMethodsForContextMock = jest.mocked(
    Engine.context.RampsController.getPaymentMethodsForContext,
  );
  const updateFiatPaymentMock = jest.mocked(
    Engine.context.TransactionPayController.updateFiatPayment,
  );

  // React Query is stubbed out, so the options object is the only observable
  // request shape.
  interface Options {
    queryFn: () => Promise<unknown>;
    queryKey: unknown[];
    enabled: boolean;
    staleTime: number;
  }
  const lastOptions = () =>
    (mockUseQuery as { lastOptions?: Options }).lastOptions;

  beforeEach(() => {
    jest.resetAllMocks();

    mockUseSelector.mockReturnValue({ regionCode: 'us' });
    useMMPayFiatConfigMock.mockReturnValue({
      enabledTransactionTypes: [TransactionType.moneyAccountDeposit],
      maxDelayMinutesForPaymentMethods: 10,
    });
    jest.mocked(useTransactionMetadataRequest).mockReturnValue({
      id: 'tx-1',
      type: TransactionType.moneyAccountDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);
    mockUseQuery.mockImplementation((options: unknown) => {
      (mockUseQuery as { lastOptions?: unknown }).lastOptions = options;
      return queryState();
    });
  });

  it('queries getPaymentMethodsForContext with deposit asset and headless flags', async () => {
    renderHook(() => useFiatDepositPaymentMethods());

    const options = lastOptions();
    expect(options?.queryKey).toEqual([
      'ramps',
      'paymentMethods',
      'us',
      'eip155:1/slip44:60',
      'auto',
      true,
    ]);
    expect(options?.enabled).toBe(true);
    expect(options?.staleTime).toBe(5 * 60 * 1000);

    getPaymentMethodsForContextMock.mockResolvedValue({
      methods: [CARD_METHOD],
      selected: CARD_METHOD,
      providerIds: ['native'],
    });

    await act(async () => {
      await options?.queryFn();
    });

    expect(getPaymentMethodsForContextMock).toHaveBeenCalledWith({
      region: 'us',
      assetId: 'eip155:1/slip44:60',
      autoSelectProvider: true,
      restrictToKnownOrNativeProviders: true,
      preferPaymentMethodId: undefined,
      // Request-only: Buy's catalog and selection must not be rewritten.
      updateState: false,
    });
  });

  it('disables the query until a region is known', () => {
    mockUseSelector.mockReturnValue(undefined);

    renderHook(() => useFiatDepositPaymentMethods());

    expect(lastOptions()?.enabled).toBe(false);
  });

  it('returns deposit-context methods without Buy-only Revolut Pay when absent', () => {
    const { result } = renderHook(() => useFiatDepositPaymentMethods());

    expect(result.current.paymentMethods).toEqual([CARD_METHOD]);
    expect(result.current.paymentMethods).not.toContainEqual(REVOLUT_METHOD);
    expect(result.current.suggestedPaymentMethod).toEqual(CARD_METHOD);
    expect(result.current.assetId).toBe('eip155:1/slip44:60');
  });

  it('clears stale selectedPaymentMethodId after a successful fetch', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-revolut-pay',
    } as never);

    renderHook(() => useFiatDepositPaymentMethods());

    expect(updateFiatPaymentMock).toHaveBeenCalledWith({
      transactionId: 'tx-1',
      callback: expect.any(Function),
    });

    const fiatPayment = { selectedPaymentMethodId: 'pm-revolut-pay' };
    updateFiatPaymentMock.mock.calls[0][0].callback(fiatPayment);
    expect(fiatPayment.selectedPaymentMethodId).toBeUndefined();
  });

  it.each([
    ['the selection is still in the returned list', 'pm-card', {}],
    ['methods are still loading', 'pm-revolut-pay', { data: undefined }],
    [
      'a background refetch is in flight',
      'pm-revolut-pay',
      { isFetching: true },
    ],
  ])('does not clear the selection when %s', (_case, selectedId, state) => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: selectedId,
    } as never);
    mockUseQuery.mockReturnValue(queryState(state));

    renderHook(() => useFiatDepositPaymentMethods());

    expect(updateFiatPaymentMock).not.toHaveBeenCalled();
  });
});
