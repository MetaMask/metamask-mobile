import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import { usePredictWithdrawGasFeeToken } from './usePredictWithdrawGasFeeToken';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useHasInsufficientBalance } from '../useHasInsufficientBalance';
import { generateTransferData } from '../../../../../util/transactions';
import { selectUseTransactionSimulations } from '../../../../../selectors/preferencesController';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      isWithdrawGasFeeTokenAvailable: jest.fn(),
    },
  },
}));
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../useHasInsufficientBalance');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation((selector) => selector()),
}));
jest.mock('../../../../../selectors/preferencesController');

const FROM_MOCK = '0x5648abf0e1f50740fabb5a672d0e57640c99572c';
const PUSD_MOCK = '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB' as Hex;
const AMOUNT_RAW_MOCK = '50000';

function createTransaction(
  overrides: Partial<TransactionMeta> = {},
  amountRaw = AMOUNT_RAW_MOCK,
): TransactionMeta {
  return {
    id: 'tx-1',
    chainId: '0x89',
    type: TransactionType.batch,
    selectedGasFeeToken: PUSD_MOCK,
    isGasFeeTokenIgnoredIfBalance: true,
    txParams: { from: FROM_MOCK },
    nestedTransactions: [
      {
        type: TransactionType.predictWithdraw,
        to: PUSD_MOCK,
        data: generateTransferData('transfer', {
          toAddress: FROM_MOCK,
          amount: BigInt(amountRaw).toString(16),
        }) as Hex,
      },
    ],
    ...overrides,
  } as TransactionMeta;
}

function renderUsePredictWithdrawGasFeeToken(
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
) {
  return renderHook(() => usePredictWithdrawGasFeeToken(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
}

describe('usePredictWithdrawGasFeeToken', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const useHasInsufficientBalanceMock = jest.mocked(useHasInsufficientBalance);
  const isWithdrawGasFeeTokenAvailableMock = jest.mocked(
    Engine.context.PredictController.isWithdrawGasFeeTokenAvailable,
  );
  const selectUseTransactionSimulationsMock = jest.mocked(
    selectUseTransactionSimulations,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionMetadataRequestMock.mockReturnValue(createTransaction());
    useHasInsufficientBalanceMock.mockReturnValue({
      hasInsufficientBalance: true,
      nativeCurrency: 'POL',
    });
    selectUseTransactionSimulationsMock.mockReturnValue(true);
  });

  it('checks the Safe withdraw for the current account and amount', async () => {
    isWithdrawGasFeeTokenAvailableMock.mockResolvedValue(true);

    const { result } = renderUsePredictWithdrawGasFeeToken();

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(isWithdrawGasFeeTokenAvailableMock).toHaveBeenCalledWith({
      address: FROM_MOCK,
      amountRaw: AMOUNT_RAW_MOCK,
    });
    expect(result.current.isUnavailable).toBe(false);
  });

  it('returns pending until the check settles', async () => {
    isWithdrawGasFeeTokenAvailableMock.mockResolvedValue(true);

    const { result } = renderUsePredictWithdrawGasFeeToken();

    expect(result.current).toStrictEqual({
      isPending: true,
      isUnavailable: false,
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });

  it('returns unavailable when pUSD cannot pay the Safe withdraw gas', async () => {
    isWithdrawGasFeeTokenAvailableMock.mockResolvedValue(false);

    const { result } = renderUsePredictWithdrawGasFeeToken();

    await waitFor(() => expect(result.current.isUnavailable).toBe(true));
    expect(result.current.isPending).toBe(false);
  });

  it('returns pending instead of a cached unavailable result while checking it again', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    isWithdrawGasFeeTokenAvailableMock.mockResolvedValueOnce(false);
    const first = renderUsePredictWithdrawGasFeeToken(queryClient);
    await waitFor(() => expect(first.result.current.isUnavailable).toBe(true));
    first.unmount();

    let resolveRecheck: (isAvailable: boolean) => void = () => undefined;
    isWithdrawGasFeeTokenAvailableMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRecheck = resolve;
      }),
    );
    const { result } = renderUsePredictWithdrawGasFeeToken(queryClient);

    await waitFor(() =>
      expect(isWithdrawGasFeeTokenAvailableMock).toHaveBeenCalledTimes(2),
    );
    expect(result.current).toStrictEqual({
      isPending: true,
      isUnavailable: false,
    });

    resolveRecheck(true);

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.isUnavailable).toBe(false);
  });

  it('allows the withdraw when the check fails', async () => {
    isWithdrawGasFeeTokenAvailableMock.mockRejectedValue(
      new Error('RPC unavailable'),
    );

    const { result } = renderUsePredictWithdrawGasFeeToken();

    await waitFor(() => expect(result.current.isPending).toBe(false), {
      timeout: 3000,
    });

    expect(result.current).toStrictEqual({
      isPending: false,
      isUnavailable: false,
    });
  });

  it.each([
    [
      'transaction simulations are disabled',
      () => selectUseTransactionSimulationsMock.mockReturnValue(false),
    ],
    [
      'the native balance covers gas',
      () =>
        useHasInsufficientBalanceMock.mockReturnValue({
          hasInsufficientBalance: false,
          nativeCurrency: 'POL',
        }),
    ],
    [
      'no gas fee token is selected (deposit wallet)',
      () =>
        useTransactionMetadataRequestMock.mockReturnValue(
          createTransaction({ selectedGasFeeToken: undefined }),
        ),
    ],
    [
      'the gas fee token is not forced',
      () =>
        useTransactionMetadataRequestMock.mockReturnValue(
          createTransaction({ isGasFeeTokenIgnoredIfBalance: false }),
        ),
    ],
    [
      'the amount is zero',
      () =>
        useTransactionMetadataRequestMock.mockReturnValue(
          createTransaction({}, '0'),
        ),
    ],
    [
      'the transaction is not a Predict withdraw',
      () =>
        useTransactionMetadataRequestMock.mockReturnValue(
          createTransaction({
            nestedTransactions: createTransaction().nestedTransactions?.map(
              (call) => ({ ...call, type: TransactionType.perpsWithdraw }),
            ),
          }),
        ),
    ],
  ])('skips the check when %s', (_name, arrange) => {
    arrange();

    const { result } = renderUsePredictWithdrawGasFeeToken();

    expect(result.current).toStrictEqual({
      isPending: false,
      isUnavailable: false,
    });
    expect(isWithdrawGasFeeTokenAvailableMock).not.toHaveBeenCalled();
  });
});
