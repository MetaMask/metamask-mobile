import { renderHook } from '@testing-library/react-native';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { useMoneyConfirmNavigation } from './useMoneyConfirmNavigation';
import { store } from '../../../../store';
import { selectMoneyFirstTimeDepositAnimationEnabledFlag } from '../selectors/featureFlags';
import { hasPriorMoneyDeposit } from '../utils/firstTimeDeposit';
import Routes from '../../../../constants/navigation/Routes';

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

const mockedFlagSelector =
  selectMoneyFirstTimeDepositAnimationEnabledFlag as unknown as jest.Mock;
const mockedHasPrior = hasPriorMoneyDeposit as jest.Mock;
const mockedGetState = store.getState as jest.Mock;

const makeTx = (id: string, type: TransactionType): TransactionMeta =>
  ({
    id,
    type,
    status: TransactionStatus.confirmed,
    time: 0,
    txParams: {},
  }) as unknown as TransactionMeta;

describe('useMoneyConfirmNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetState.mockReturnValue({});
    mockedFlagSelector.mockReturnValue(true);
    mockedHasPrior.mockReturnValue(false);
  });

  it('navigates to home when tx is undefined', () => {
    const { result } = renderHook(() => useMoneyConfirmNavigation());

    result.current.handleDepositConfirm(undefined);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.HOME);
  });

  it('navigates to home when kill-switch flag is disabled', () => {
    mockedFlagSelector.mockReturnValue(false);
    const tx = makeTx('tx-1', TransactionType.moneyAccountDeposit);

    const { result } = renderHook(() => useMoneyConfirmNavigation());

    result.current.handleDepositConfirm(tx);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.HOME);
  });

  it('navigates to home when tx is not a money deposit', () => {
    const tx = makeTx('tx-1', TransactionType.contractInteraction);

    const { result } = renderHook(() => useMoneyConfirmNavigation());

    result.current.handleDepositConfirm(tx);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.HOME);
  });

  it('navigates to home when prior deposits exist', () => {
    mockedHasPrior.mockReturnValue(true);
    const tx = makeTx('tx-1', TransactionType.moneyAccountDeposit);

    const { result } = renderHook(() => useMoneyConfirmNavigation());

    result.current.handleDepositConfirm(tx);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.HOME);
  });

  it('navigates to first-time deposit when no prior deposits exist', () => {
    const tx = makeTx('tx-1', TransactionType.moneyAccountDeposit);

    const { result } = renderHook(() => useMoneyConfirmNavigation());

    result.current.handleDepositConfirm(tx);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.FIRST_TIME_DEPOSIT);
  });

  it('passes current tx id to hasPriorMoneyDeposit', () => {
    const tx = makeTx('tx-42', TransactionType.moneyAccountDeposit);

    const { result } = renderHook(() => useMoneyConfirmNavigation());

    result.current.handleDepositConfirm(tx);

    expect(mockedHasPrior).toHaveBeenCalledWith(expect.anything(), 'tx-42');
  });

  it('reads state imperatively via store.getState', () => {
    const tx = makeTx('tx-1', TransactionType.moneyAccountDeposit);

    const { result } = renderHook(() => useMoneyConfirmNavigation());

    result.current.handleDepositConfirm(tx);

    expect(mockedGetState).toHaveBeenCalledTimes(1);
  });

  it('navigates to first-time deposit for nested batch deposit', () => {
    const tx = {
      ...makeTx('batch-1', TransactionType.batch),
      nestedTransactions: [{ type: TransactionType.moneyAccountDeposit }],
    } as unknown as TransactionMeta;

    const { result } = renderHook(() => useMoneyConfirmNavigation());

    result.current.handleDepositConfirm(tx);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.FIRST_TIME_DEPOSIT);
  });
});
