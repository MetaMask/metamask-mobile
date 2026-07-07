import { renderHook, act } from '@testing-library/react-native';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useMoneyFirstTimeDepositTracker } from './useMoneyFirstTimeDepositTracker';
import { store } from '../../../../store';
import { selectMoneyFirstTimeDepositAnimationEnabledFlag } from '../selectors/featureFlags';
import { hasPriorMoneyDeposit } from '../utils/firstTimeDeposit';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../store', () => ({
  store: { getState: jest.fn() },
}));

jest.mock('../selectors/featureFlags', () => ({
  selectMoneyFirstTimeDepositAnimationEnabledFlag: jest.fn(),
}));

jest.mock('../utils/firstTimeDeposit', () => ({
  hasPriorMoneyDeposit: jest.fn(),
}));

jest.mock('../utils/moneyTransactionGuards', () => ({
  isMoneyDepositTx: jest.fn(
    (tx: { type: string; nestedTransactions?: { type: string }[] }) =>
      tx.type === 'moneyAccountDeposit' ||
      tx.nestedTransactions?.some((n) => n.type === 'moneyAccountDeposit'),
  ),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

const mockedFlagSelector =
  selectMoneyFirstTimeDepositAnimationEnabledFlag as unknown as jest.Mock;
const mockedHasPrior = hasPriorMoneyDeposit as jest.Mock;
const mockedGetState = store.getState as jest.Mock;
const mockedSubscribe = Engine.controllerMessenger.subscribe as jest.Mock;
const mockedUnsubscribe = Engine.controllerMessenger.unsubscribe as jest.Mock;

const makeTx = (
  id: string,
  type: TransactionType,
  status: TransactionStatus = TransactionStatus.confirmed,
): TransactionMeta =>
  ({
    id,
    type,
    status,
    time: 0,
    txParams: {},
  }) as unknown as TransactionMeta;

const captureSubscribedCallback = () =>
  mockedSubscribe.mock.calls[0][1] as (tx: TransactionMeta) => void;

describe('useMoneyFirstTimeDepositTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetState.mockReturnValue({});
    mockedFlagSelector.mockReturnValue(true);
    mockedHasPrior.mockReturnValue(false);
  });

  it('subscribes to TransactionController:transactionConfirmed on mount', () => {
    renderHook(() => useMoneyFirstTimeDepositTracker());

    expect(mockedSubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionConfirmed',
      expect.any(Function),
    );
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useMoneyFirstTimeDepositTracker());
    const subscribedCallback = captureSubscribedCallback();

    unmount();

    expect(mockedUnsubscribe).toHaveBeenCalledWith(
      'TransactionController:transactionConfirmed',
      subscribedCallback,
    );
  });

  it('does not navigate when tx status is not confirmed', () => {
    renderHook(() => useMoneyFirstTimeDepositTracker());
    const callback = captureSubscribedCallback();

    act(() => {
      callback(
        makeTx(
          'tx-1',
          TransactionType.moneyAccountDeposit,
          TransactionStatus.submitted,
        ),
      );
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when tx is not a money deposit', () => {
    renderHook(() => useMoneyFirstTimeDepositTracker());
    const callback = captureSubscribedCallback();

    act(() => {
      callback(makeTx('tx-1', TransactionType.contractInteraction));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when feature flag is disabled', () => {
    mockedFlagSelector.mockReturnValue(false);
    renderHook(() => useMoneyFirstTimeDepositTracker());
    const callback = captureSubscribedCallback();

    act(() => {
      callback(makeTx('tx-1', TransactionType.moneyAccountDeposit));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when prior money deposit exists', () => {
    mockedHasPrior.mockReturnValue(true);
    renderHook(() => useMoneyFirstTimeDepositTracker());
    const callback = captureSubscribedCallback();

    act(() => {
      callback(makeTx('tx-1', TransactionType.moneyAccountDeposit));
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates directly to first-time deposit for eligible deposit', () => {
    renderHook(() => useMoneyFirstTimeDepositTracker());
    const callback = captureSubscribedCallback();

    act(() => {
      callback(makeTx('tx-1', TransactionType.moneyAccountDeposit));
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.FIRST_TIME_DEPOSIT);
  });

  it('navigates directly to first-time deposit for eligible nested batch deposit', () => {
    renderHook(() => useMoneyFirstTimeDepositTracker());
    const callback = captureSubscribedCallback();

    const batchTx = {
      ...makeTx('batch-1', TransactionType.batch),
      nestedTransactions: [{ type: TransactionType.moneyAccountDeposit }],
    } as unknown as TransactionMeta;

    act(() => {
      callback(batchTx);
    });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.FIRST_TIME_DEPOSIT);
  });

  it('passes current tx id to hasPriorMoneyDeposit', () => {
    renderHook(() => useMoneyFirstTimeDepositTracker());
    const callback = captureSubscribedCallback();

    act(() => {
      callback(makeTx('tx-42', TransactionType.moneyAccountDeposit));
    });

    expect(mockedHasPrior).toHaveBeenCalledWith(expect.anything(), 'tx-42');
  });

  it('reads state imperatively via store.getState', () => {
    renderHook(() => useMoneyFirstTimeDepositTracker());
    const callback = captureSubscribedCallback();

    act(() => {
      callback(makeTx('tx-1', TransactionType.moneyAccountDeposit));
    });

    expect(mockedGetState).toHaveBeenCalledTimes(1);
  });
});
