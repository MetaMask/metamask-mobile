import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import ReactQueryService from '../../../../core/ReactQueryService';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { MoneyAccountBalanceServiceQueryKeys } from '../queryKeys';
import { useRefreshMoneyBalanceOnTxConfirm } from './useRefreshMoneyBalanceOnTxConfirm';

jest.mock('../../../../core/Engine');
jest.mock('../../../../store', () => ({
  store: { getState: jest.fn(() => ({})) },
}));
jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock('../../../../core/ReactQueryService', () => ({
  __esModule: true,
  default: {
    queryClient: {
      getQueryData: jest.fn(),
      invalidateQueries: jest.fn(),
    },
  },
}));

const mockQueryClient = ReactQueryService.queryClient as unknown as {
  invalidateQueries: jest.Mock;
  getQueryData: jest.Mock;
};
const mockInvalidateQueries = mockQueryClient.invalidateQueries;
const mockGetQueryData = mockQueryClient.getQueryData;

const mockSelectPrimaryMoneyAccount =
  selectPrimaryMoneyAccount as jest.MockedFunction<
    typeof selectPrimaryMoneyAccount
  >;

type TransactionConfirmedHandler = (transactionMeta: TransactionMeta) => void;

const mockSubscribe = jest.fn<void, [string, TransactionConfirmedHandler]>();
const mockUnsubscribe = jest.fn<void, [string, TransactionConfirmedHandler]>();

Object.defineProperty(Engine, 'controllerMessenger', {
  value: { subscribe: mockSubscribe, unsubscribe: mockUnsubscribe },
  writable: true,
  configurable: true,
});

const MOCK_ADDRESS = '0xMoneyAccount';

const baseTx = {
  id: 'tx-1',
  time: 0,
  txParams: {},
} as unknown as TransactionMeta;

const makeTx = (
  type: TransactionType,
  status: TransactionStatus = TransactionStatus.confirmed,
  nested?: { type: TransactionType }[],
): TransactionMeta =>
  ({
    ...baseTx,
    type,
    status,
    nestedTransactions: nested,
  }) as unknown as TransactionMeta;

const getConfirmedHandler = (): TransactionConfirmedHandler => {
  const call = mockSubscribe.mock.calls.find(
    ([event]) => event === 'TransactionController:transactionConfirmed',
  );
  if (!call) throw new Error('transactionConfirmed handler not subscribed');
  return call[1];
};

beforeEach(() => {
  jest.clearAllMocks();
  let readCount = 0;
  mockGetQueryData.mockImplementation(() => {
    const phase = readCount < 1 ? 'baseline' : 'next';
    readCount += 1;

    return {
      musdBalance: phase === 'baseline' ? '1000000' : '1100000',
      vmusdValueInMusd: phase === 'baseline' ? '2000000' : '2100000',
      totalBalance: phase === 'baseline' ? '3000000' : '3200000',
    };
  });

  mockSelectPrimaryMoneyAccount.mockReturnValue({
    address: MOCK_ADDRESS,
  } as ReturnType<typeof selectPrimaryMoneyAccount>);
});

describe('useRefreshMoneyBalanceOnTxConfirm', () => {
  it('subscribes to TransactionController:transactionConfirmed on mount', () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    expect(mockSubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionConfirmed',
      expect.any(Function),
    );
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionConfirmed',
      expect.any(Function),
    );
  });

  it('invalidates the balance query on confirmed deposit tx', async () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler(makeTx(TransactionType.moneyAccountDeposit));
    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: [
        MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK,
        MOCK_ADDRESS,
      ],
      refetchType: 'all',
    });
  });

  it('invalidates the balance query on confirmed withdraw tx', async () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler(makeTx(TransactionType.moneyAccountWithdraw));
    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    });

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('invalidates on confirmed tx with nested deposit', async () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler(
      makeTx(TransactionType.contractInteraction, TransactionStatus.confirmed, [
        { type: TransactionType.moneyAccountDeposit },
      ]),
    );
    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    });

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('invalidates on confirmed tx with nested withdraw', async () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler(
      makeTx(TransactionType.contractInteraction, TransactionStatus.confirmed, [
        { type: TransactionType.moneyAccountWithdraw },
      ]),
    );
    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    });

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
  });

  const MUSD_ON_MONAD = {
    tokenAddress: MUSD_TOKEN_ADDRESS,
    chainId: CHAIN_IDS.MONAD,
  };

  it('invalidates on a confirmed Perps deposit funded from the Money account', async () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler({
      ...makeTx(TransactionType.perpsDeposit),
      metamaskPay: MUSD_ON_MONAD,
    } as unknown as TransactionMeta);
    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    });

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('invalidates on a confirmed Predict withdraw landing in the Money account', async () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler({
      ...makeTx(TransactionType.batch, TransactionStatus.confirmed, [
        { type: TransactionType.predictWithdraw },
      ]),
      metamaskPay: MUSD_ON_MONAD,
    } as unknown as TransactionMeta);
    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    });

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
  });

  it('does not invalidate for a Perps deposit NOT funded from the Money account', () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler({
      ...makeTx(TransactionType.perpsDeposit),
      metamaskPay: {
        tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        chainId: CHAIN_IDS.ARBITRUM,
      },
    } as unknown as TransactionMeta);

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('does not invalidate for non-confirmed status', () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler(
      makeTx(TransactionType.moneyAccountDeposit, TransactionStatus.failed),
    );

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('does not invalidate for unrelated tx type', () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler(makeTx(TransactionType.contractInteraction));

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('does not invalidate when no primary money account address', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue(undefined);
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler(makeTx(TransactionType.moneyAccountDeposit));

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('reads store state at call time (not stale closure)', async () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue(undefined);
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    // Address becomes available after mount
    mockSelectPrimaryMoneyAccount.mockReturnValue({
      address: MOCK_ADDRESS,
    } as ReturnType<typeof selectPrimaryMoneyAccount>);

    handler(makeTx(TransactionType.moneyAccountDeposit));
    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    });

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
  });
});
