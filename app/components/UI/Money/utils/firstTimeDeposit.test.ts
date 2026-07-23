import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  hasExistingMoneyBalance,
  hasPriorMoneyDeposit,
  shouldShowMoneyFirstTimeDepositAnimation,
} from './firstTimeDeposit';
import { selectNonReplacedTransactions } from '../../../../selectors/transactionController';
import { selectMoneyFirstTimeDepositAnimationEnabledFlag } from '../selectors/featureFlags';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import ReactQueryService from '../../../../core/ReactQueryService';
import { MoneyAccountBalanceServiceQueryKeys } from '../queryKeys';

jest.mock('../../../../selectors/transactionController', () => ({
  selectNonReplacedTransactions: jest.fn(),
}));

jest.mock('../selectors/featureFlags', () => ({
  selectMoneyFirstTimeDepositAnimationEnabledFlag: jest.fn(),
}));

jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock('../../../../core/ReactQueryService', () => ({
  __esModule: true,
  default: {
    queryClient: {
      getQueryData: jest.fn(),
    },
  },
}));

const mockedSelectNonReplacedTransactions =
  selectNonReplacedTransactions as unknown as jest.MockedFunction<
    (state: unknown) => TransactionMeta[]
  >;

const mockedFlagSelector =
  selectMoneyFirstTimeDepositAnimationEnabledFlag as unknown as jest.MockedFunction<
    (state: unknown) => boolean
  >;

const mockedSelectPrimaryMoneyAccount =
  selectPrimaryMoneyAccount as unknown as jest.MockedFunction<
    (state: unknown) => { address: string } | undefined
  >;

const mockedGetQueryData = ReactQueryService.queryClient
  .getQueryData as jest.Mock;

const MOCK_MONEY_ACCOUNT_ADDRESS = '0xMoneyAccount';
const mockPrimaryMoneyAccount = { address: MOCK_MONEY_ACCOUNT_ADDRESS };

const baseTx = {
  status: TransactionStatus.confirmed,
  time: 0,
  txParams: {},
} as unknown as TransactionMeta;

const makeTx = (
  id: string,
  type: TransactionType,
  nested?: { type: TransactionType }[],
): TransactionMeta =>
  ({
    ...baseTx,
    id,
    type,
    nestedTransactions: nested,
  }) as unknown as TransactionMeta;

const mockState = {} as never;

describe('hasPriorMoneyDeposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when transaction list is empty', () => {
    mockedSelectNonReplacedTransactions.mockReturnValue([]);

    const result = hasPriorMoneyDeposit(mockState, 'current-tx');

    expect(result).toBe(false);
  });

  it('returns false when only transaction is the current one', () => {
    mockedSelectNonReplacedTransactions.mockReturnValue([
      makeTx('current-tx', TransactionType.moneyAccountDeposit),
    ]);

    const result = hasPriorMoneyDeposit(mockState, 'current-tx');

    expect(result).toBe(false);
  });

  it('returns true when a prior top-level deposit exists', () => {
    mockedSelectNonReplacedTransactions.mockReturnValue([
      makeTx('current-tx', TransactionType.moneyAccountDeposit),
      makeTx('prior-tx', TransactionType.moneyAccountDeposit),
    ]);

    const result = hasPriorMoneyDeposit(mockState, 'current-tx');

    expect(result).toBe(true);
  });

  it('returns true when a prior nested batch deposit exists', () => {
    mockedSelectNonReplacedTransactions.mockReturnValue([
      makeTx('current-tx', TransactionType.moneyAccountDeposit),
      makeTx('prior-batch', TransactionType.batch, [
        { type: TransactionType.moneyAccountDeposit },
      ]),
    ]);

    const result = hasPriorMoneyDeposit(mockState, 'current-tx');

    expect(result).toBe(true);
  });

  it('returns false when prior transactions are non-deposit types', () => {
    mockedSelectNonReplacedTransactions.mockReturnValue([
      makeTx('current-tx', TransactionType.moneyAccountDeposit),
      makeTx('other-1', TransactionType.moneyAccountWithdraw),
      makeTx('other-2', TransactionType.contractInteraction),
      makeTx('other-3', TransactionType.incoming),
    ]);

    const result = hasPriorMoneyDeposit(mockState, 'current-tx');

    expect(result).toBe(false);
  });
});

describe('hasExistingMoneyBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSelectPrimaryMoneyAccount.mockReturnValue(mockPrimaryMoneyAccount);
    mockedGetQueryData.mockReturnValue(undefined);
  });

  it('returns false when there is no primary money account', () => {
    mockedSelectPrimaryMoneyAccount.mockReturnValue(undefined);

    const result = hasExistingMoneyBalance(mockState);

    expect(result).toBe(false);
    expect(mockedGetQueryData).not.toHaveBeenCalled();
  });

  it('returns false when there is no cached balance entry', () => {
    mockedGetQueryData.mockReturnValue(undefined);

    const result = hasExistingMoneyBalance(mockState);

    expect(result).toBe(false);
  });

  it('returns false when the cached total balance is zero', () => {
    mockedGetQueryData.mockReturnValue({ totalBalance: '0' });

    const result = hasExistingMoneyBalance(mockState);

    expect(result).toBe(false);
  });

  it('returns false when the cached total balance is invalid', () => {
    mockedGetQueryData.mockReturnValue({ totalBalance: 'not-a-number' });

    const result = hasExistingMoneyBalance(mockState);

    expect(result).toBe(false);
  });

  it('returns true when the cached total balance is positive', () => {
    mockedGetQueryData.mockReturnValue({ totalBalance: '5000000' });

    const result = hasExistingMoneyBalance(mockState);

    expect(result).toBe(true);
    expect(mockedGetQueryData).toHaveBeenCalledWith([
      MoneyAccountBalanceServiceQueryKeys.GET_MONEY_ACCOUNT_BALANCE,
      MOCK_MONEY_ACCOUNT_ADDRESS,
    ]);
  });
});

describe('shouldShowMoneyFirstTimeDepositAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFlagSelector.mockReturnValue(true);
    mockedSelectNonReplacedTransactions.mockReturnValue([]);
    mockedSelectPrimaryMoneyAccount.mockReturnValue(mockPrimaryMoneyAccount);
    mockedGetQueryData.mockReturnValue(undefined);
  });

  it('returns true for a first money deposit with the feature enabled', () => {
    const tx = makeTx('current-tx', TransactionType.moneyAccountDeposit);
    mockedSelectNonReplacedTransactions.mockReturnValue([tx]);

    const result = shouldShowMoneyFirstTimeDepositAnimation(mockState, tx);

    expect(result).toBe(true);
  });

  it('returns true for a first nested batch money deposit', () => {
    const tx = makeTx('current-tx', TransactionType.batch, [
      { type: TransactionType.moneyAccountDeposit },
    ]);
    mockedSelectNonReplacedTransactions.mockReturnValue([tx]);

    const result = shouldShowMoneyFirstTimeDepositAnimation(mockState, tx);

    expect(result).toBe(true);
  });

  it('returns false when the transaction is not a money deposit', () => {
    const tx = makeTx('current-tx', TransactionType.contractInteraction);

    const result = shouldShowMoneyFirstTimeDepositAnimation(mockState, tx);

    expect(result).toBe(false);
  });

  it('returns false when the feature flag is disabled', () => {
    mockedFlagSelector.mockReturnValue(false);
    const tx = makeTx('current-tx', TransactionType.moneyAccountDeposit);

    const result = shouldShowMoneyFirstTimeDepositAnimation(mockState, tx);

    expect(result).toBe(false);
  });

  it('returns false when a prior money deposit exists', () => {
    const tx = makeTx('current-tx', TransactionType.moneyAccountDeposit);
    mockedSelectNonReplacedTransactions.mockReturnValue([
      tx,
      makeTx('prior-tx', TransactionType.moneyAccountDeposit),
    ]);

    const result = shouldShowMoneyFirstTimeDepositAnimation(mockState, tx);

    expect(result).toBe(false);
  });

  it('returns false when the money account already has a balance despite no prior local deposits', () => {
    const tx = makeTx('current-tx', TransactionType.moneyAccountDeposit);
    mockedSelectNonReplacedTransactions.mockReturnValue([tx]);
    mockedGetQueryData.mockReturnValue({ totalBalance: '5000000' });

    const result = shouldShowMoneyFirstTimeDepositAnimation(mockState, tx);

    expect(result).toBe(false);
  });

  it('returns true when the cached money account balance is zero', () => {
    const tx = makeTx('current-tx', TransactionType.moneyAccountDeposit);
    mockedSelectNonReplacedTransactions.mockReturnValue([tx]);
    mockedGetQueryData.mockReturnValue({ totalBalance: '0' });

    const result = shouldShowMoneyFirstTimeDepositAnimation(mockState, tx);

    expect(result).toBe(true);
  });
});
