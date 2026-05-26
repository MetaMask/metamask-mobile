import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { renderHook } from '@testing-library/react-hooks';
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

const mockInvalidateQueries = ReactQueryService.queryClient
  .invalidateQueries as jest.Mock;

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

  it('invalidates both balance queries on confirmed deposit tx', () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler(makeTx(TransactionType.moneyAccountDeposit));

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: [
        MoneyAccountBalanceServiceQueryKeys.GET_MUSD_BALANCE,
        MOCK_ADDRESS,
      ],
      refetchType: 'all',
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: [
        MoneyAccountBalanceServiceQueryKeys.GET_MUSD_EQUIVALENT_VALUE,
        MOCK_ADDRESS,
      ],
      refetchType: 'all',
    });
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
  });

  it('invalidates both balance queries on confirmed withdraw tx', () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler(makeTx(TransactionType.moneyAccountWithdraw));

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
  });

  it('invalidates on confirmed tx with nested deposit', () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler(
      makeTx(TransactionType.contractInteraction, TransactionStatus.confirmed, [
        { type: TransactionType.moneyAccountDeposit },
      ]),
    );

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
  });

  it('invalidates on confirmed tx with nested withdraw', () => {
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    handler(
      makeTx(TransactionType.contractInteraction, TransactionStatus.confirmed, [
        { type: TransactionType.moneyAccountWithdraw },
      ]),
    );

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
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

  it('reads store state at call time (not stale closure)', () => {
    mockSelectPrimaryMoneyAccount.mockReturnValue(undefined);
    renderHook(() => useRefreshMoneyBalanceOnTxConfirm());
    const handler = getConfirmedHandler();

    // Address becomes available after mount
    mockSelectPrimaryMoneyAccount.mockReturnValue({
      address: MOCK_ADDRESS,
    } as ReturnType<typeof selectPrimaryMoneyAccount>);

    handler(makeTx(TransactionType.moneyAccountDeposit));

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
  });
});
