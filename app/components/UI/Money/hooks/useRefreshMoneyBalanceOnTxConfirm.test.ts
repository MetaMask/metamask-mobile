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
import { refreshMoneyAccountBalanceFresh } from '../utils/invalidateMoneyAccountBalanceCaches';
import { store } from '../../../../store';
import { setLastLocalMoneyFlow } from '../../../../core/redux/slices/moneyBalance';
import Logger from '../../../../util/Logger';
import { useRefreshMoneyBalanceOnTxConfirm } from './useRefreshMoneyBalanceOnTxConfirm';

jest.mock('../../../../core/Engine');
jest.mock('../../../../store', () => ({
  store: { getState: jest.fn(() => ({})), dispatch: jest.fn() },
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

jest.mock('../utils/invalidateMoneyAccountBalanceCaches', () => ({
  refreshMoneyAccountBalanceFresh: jest.fn(),
}));

const mockQueryClient = ReactQueryService.queryClient as unknown as {
  invalidateQueries: jest.Mock;
  getQueryData: jest.Mock;
};
const mockGetQueryData = mockQueryClient.getQueryData;

const mockRefreshMoneyAccountBalanceFresh = jest.mocked(
  refreshMoneyAccountBalanceFresh,
);

const CHANGED_BALANCE = {
  musdBalance: '1100000',
  vmusdValueInMusd: '2100000',
  totalBalance: '3200000',
  source: 'api' as const,
  usedFallback: false,
};

const BASELINE_BALANCE = {
  musdBalance: '1000000',
  vmusdValueInMusd: '2000000',
  totalBalance: '3000000',
  source: 'api' as const,
  usedFallback: false,
};

const mockSelectPrimaryMoneyAccount =
  selectPrimaryMoneyAccount as jest.MockedFunction<
    typeof selectPrimaryMoneyAccount
  >;

const mockDispatch = store.dispatch as unknown as jest.Mock;

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
  mockGetQueryData.mockReturnValue(BASELINE_BALANCE);
  mockRefreshMoneyAccountBalanceFresh.mockResolvedValue(CHANGED_BALANCE);

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
      expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(1);
    });

    expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledWith(
      MOCK_ADDRESS,
      { minBlock: undefined },
    );
  });

  it('invalidates the balance query on confirmed withdraw tx', async () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler(makeTx(TransactionType.moneyAccountWithdraw));
    await waitFor(() => {
      expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(1);
    });

    expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(1);
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
      expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(1);
    });

    expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(1);
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
      expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(1);
    });

    expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(1);
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
      expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(1);
    });

    expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(1);
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
      expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(1);
    });

    expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(1);
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

    expect(mockRefreshMoneyAccountBalanceFresh).not.toHaveBeenCalled();
  });

  it('does not invalidate for non-confirmed status', () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler(
      makeTx(TransactionType.moneyAccountDeposit, TransactionStatus.failed),
    );

    expect(mockRefreshMoneyAccountBalanceFresh).not.toHaveBeenCalled();
  });

  it('does not invalidate for unrelated tx type', () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler(makeTx(TransactionType.contractInteraction));

    expect(mockRefreshMoneyAccountBalanceFresh).not.toHaveBeenCalled();
  });

  it('does not invalidate when no primary money account address', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue(undefined);
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler(makeTx(TransactionType.moneyAccountDeposit));

    expect(mockRefreshMoneyAccountBalanceFresh).not.toHaveBeenCalled();
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
      expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(1);
    });

    expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(1);
  });

  it('passes minBlock parsed from the confirmed hex block number', async () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());

    getConfirmedHandler()({
      ...makeTx(TransactionType.moneyAccountDeposit),
      blockNumber: '0x10',
    });

    await waitFor(() => {
      expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledWith(
        MOCK_ADDRESS,
        { minBlock: 16 },
      );
    });
  });

  it('omits minBlock when the confirmed block number is not 0x-prefixed hex', async () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());

    getConfirmedHandler()({
      ...makeTx(TransactionType.moneyAccountDeposit),
      blockNumber: '16',
    });

    await waitFor(() => {
      expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledWith(
        MOCK_ADDRESS,
        { minBlock: undefined },
      );
    });
  });

  it('omits minBlock when the confirmed tx has no block number', async () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());

    getConfirmedHandler()(makeTx(TransactionType.moneyAccountDeposit));

    await waitFor(() => {
      expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledWith(
        MOCK_ADDRESS,
        { minBlock: undefined },
      );
    });
  });

  it('retries after a failed fresh read', async () => {
    jest.useFakeTimers();
    mockRefreshMoneyAccountBalanceFresh
      .mockRejectedValueOnce(new Error('api still stale'))
      .mockResolvedValueOnce(CHANGED_BALANCE);
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());

    getConfirmedHandler()(makeTx(TransactionType.moneyAccountDeposit));
    await jest.advanceTimersByTimeAsync(500);

    expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('stops retrying once the refreshed balance differs from the baseline', async () => {
    jest.useFakeTimers();
    mockRefreshMoneyAccountBalanceFresh
      .mockResolvedValueOnce(BASELINE_BALANCE)
      .mockResolvedValueOnce(CHANGED_BALANCE);
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());

    getConfirmedHandler()(makeTx(TransactionType.moneyAccountDeposit));
    await jest.advanceTimersByTimeAsync(500);

    expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(4000);
    expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('logs the last fetch error when every fresh read throws', async () => {
    jest.useFakeTimers();
    const errorSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);
    const failure = new Error('api still stale');
    mockRefreshMoneyAccountBalanceFresh.mockRejectedValue(failure);
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());

    getConfirmedHandler()(makeTx(TransactionType.moneyAccountDeposit));
    await jest.advanceTimersByTimeAsync(4000);

    expect(mockRefreshMoneyAccountBalanceFresh).toHaveBeenCalledTimes(4);
    expect(errorSpy).toHaveBeenCalledWith(
      failure,
      expect.stringContaining('Balance refresh failed after 4 attempts'),
    );
    errorSpy.mockRestore();
    jest.useRealTimers();
  });

  describe('local flow marker', () => {
    // `clearAllMocks` would leave a stubbed `Date.now` returning undefined for
    // every later test in the file.
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it.each([
      ['a deposit', TransactionType.moneyAccountDeposit],
      ['a withdrawal', TransactionType.moneyAccountWithdraw],
    ])('records the confirmation time for %s', (_case, type) => {
      jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
      renderHook(() => useRefreshMoneyBalanceOnTxConfirm());

      getConfirmedHandler()(makeTx(type));

      expect(mockDispatch).toHaveBeenCalledWith(
        setLastLocalMoneyFlow({
          address: MOCK_ADDRESS,
          confirmedAt: 1_700_000_000_000,
        }),
      );
    });

    it('does not record a marker for a tx that leaves the Money balance alone', () => {
      renderHook(() => useRefreshMoneyBalanceOnTxConfirm());

      getConfirmedHandler()(makeTx(TransactionType.contractInteraction));

      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});
