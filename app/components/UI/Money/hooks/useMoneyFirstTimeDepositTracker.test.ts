import { renderHook, act } from '@testing-library/react-native';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useMoneyFirstTimeDepositTracker } from './useMoneyFirstTimeDepositTracker';
import { store } from '../../../../store';
import { shouldShowMoneyFirstTimeDepositAnimation } from '../utils/firstTimeDeposit';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../store', () => ({
  store: { getState: jest.fn() },
}));

jest.mock('../utils/firstTimeDeposit', () => ({
  shouldShowMoneyFirstTimeDepositAnimation: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

const mockedShouldShow = shouldShowMoneyFirstTimeDepositAnimation as jest.Mock;
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
    mockedShouldShow.mockReturnValue(true);
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

    expect(mockedShouldShow).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when the animation predicate rejects the tx', () => {
    mockedShouldShow.mockReturnValue(false);
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

  it('passes current state and tx to the animation predicate', () => {
    const state = { marker: true };
    mockedGetState.mockReturnValue(state);
    renderHook(() => useMoneyFirstTimeDepositTracker());
    const callback = captureSubscribedCallback();
    const tx = makeTx('tx-42', TransactionType.moneyAccountDeposit);

    act(() => {
      callback(tx);
    });

    expect(mockedShouldShow).toHaveBeenCalledWith(state, tx);
  });
});
