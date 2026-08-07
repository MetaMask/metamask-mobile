import { renderHook, act } from '@testing-library/react-hooks';
import { type PaymentMethod } from '@metamask/ramps-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { useFiatDepositPaymentMethods } from './useFiatDepositPaymentMethods';
import { useMMPayFiatConfig } from './useMMPayFiatConfig';
import { useTransactionPayFiatPayment } from './useTransactionPayData';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import Engine from '../../../../../core/Engine';

const mockUseQuery = jest.fn();
const mockUseSelector = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));
jest.mock('react-redux', () => ({
  useSelector: (...args: unknown[]) => mockUseSelector(...args),
}));
jest.mock('./useMMPayFiatConfig');
jest.mock('./useTransactionPayData');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getPaymentMethodsForContext: jest.fn(),
    },
    TransactionPayController: {
      updateFiatPayment: jest.fn(),
    },
  },
}));

const CARD_METHOD = {
  id: 'pm-card',
  name: 'Credit Card',
} as PaymentMethod;

const REVOLUT_METHOD = {
  id: 'pm-revolut-pay',
  name: 'Revolut Pay',
} as PaymentMethod;

describe('useFiatDepositPaymentMethods', () => {
  const useMMPayFiatConfigMock = jest.mocked(useMMPayFiatConfig);
  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const getPaymentMethodsForContextMock = jest.mocked(
    Engine.context.RampsController.getPaymentMethodsForContext,
  );
  const updateFiatPaymentMock = jest.mocked(
    Engine.context.TransactionPayController.updateFiatPayment,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    mockUseSelector.mockReturnValue({ regionCode: 'us' });
    useMMPayFiatConfigMock.mockReturnValue({
      enabledTransactionTypes: [TransactionType.moneyAccountDeposit],
      maxDelayMinutesForPaymentMethods: 10,
      assetPerTransactionType: {},
    });
    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx-1',
      type: TransactionType.moneyAccountDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);

    mockUseQuery.mockImplementation((options: { queryFn?: () => unknown }) => {
      // Expose queryFn for request-shape assertions without running React Query.
      (mockUseQuery as { lastOptions?: unknown }).lastOptions = options;
      return {
        data: { methods: [CARD_METHOD], selected: CARD_METHOD, providerIds: [] },
        isLoading: false,
        isFetching: false,
        isSuccess: true,
        isError: false,
        error: null,
      };
    });
  });

  it('queries getPaymentMethodsForContext with deposit asset and headless flags', async () => {
    renderHook(() => useFiatDepositPaymentMethods());

    const options = (mockUseQuery as { lastOptions?: { queryFn: () => Promise<unknown>; queryKey: unknown[] } })
      .lastOptions;
    expect(options?.queryKey).toEqual([
      'ramps',
      'paymentMethodsForContext',
      'us',
      'eip155:1/slip44:60',
      true,
      true,
    ]);

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
      updateState: false,
    });
  });

  it('returns deposit-context methods without Buy-only Revolut Pay when absent', () => {
    mockUseQuery.mockReturnValue({
      data: { methods: [CARD_METHOD], selected: CARD_METHOD, providerIds: [] },
      isLoading: false,
      isFetching: false,
      isSuccess: true,
      isError: false,
      error: null,
    });

    const { result } = renderHook(() => useFiatDepositPaymentMethods());

    expect(result.current.paymentMethods).toEqual([CARD_METHOD]);
    expect(result.current.paymentMethods).not.toContainEqual(REVOLUT_METHOD);
  });

  it('clears stale selectedPaymentMethodId after a successful fetch', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-revolut-pay',
    } as never);
    mockUseQuery.mockReturnValue({
      data: { methods: [CARD_METHOD], selected: CARD_METHOD, providerIds: [] },
      isLoading: false,
      isFetching: false,
      isSuccess: true,
      isError: false,
      error: null,
    });

    renderHook(() => useFiatDepositPaymentMethods());

    expect(updateFiatPaymentMock).toHaveBeenCalledWith({
      transactionId: 'tx-1',
      callback: expect.any(Function),
    });

    const fiatPayment = { selectedPaymentMethodId: 'pm-revolut-pay' };
    updateFiatPaymentMock.mock.calls[0][0].callback(fiatPayment);
    expect(fiatPayment.selectedPaymentMethodId).toBeUndefined();
  });

  it('does not clear selection while payment methods are loading', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-revolut-pay',
    } as never);
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
      isSuccess: false,
      isError: false,
      error: null,
    });

    renderHook(() => useFiatDepositPaymentMethods());

    expect(updateFiatPaymentMock).not.toHaveBeenCalled();
  });

  it('does not clear selection for a transient empty non-success state', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'pm-card',
    } as never);
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isSuccess: false,
      isError: false,
      error: null,
    });

    renderHook(() => useFiatDepositPaymentMethods());

    expect(updateFiatPaymentMock).not.toHaveBeenCalled();
  });
});
